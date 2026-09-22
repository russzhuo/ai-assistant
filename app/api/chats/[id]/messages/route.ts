import { qwenPlus } from "@/lib/ai/openai";
import { buildSystemPrompt } from "@/lib/ai/prompt";
import { badRequest, ok, serverError, unauthorized } from "@/lib/api/responses";
import { generateChatTitle } from "@/lib/db/chats";
import {
  deleteLatestAssistantMessage,
  mergeContinuationIntoLatestAssistant,
  persistAssistantStream,
  saveMessageToSupabase,
  upsertLatestAssistantMessage,
} from "@/lib/db/messages";
import {
  buildContinuePrompt,
  hasMessageText,
  mergeAssistantText,
} from "@/lib/chat/stream-resume";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { weatherTool } from "@/lib/tools/weather";
import { currentUser } from "@clerk/nextjs/server";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  UIMessage,
} from "ai";
import { webSearch } from "@exalabs/ai-sdk";
import { deepSeekV4Flash, deepSeekV4FlashVision } from "@/lib/ai/deepseek";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await currentUser();
    if (!user) {
      return unauthorized();
    }

    const { id: chatId } = await params;

    if (!chatId || typeof chatId !== "string" || chatId.trim() === "") {
      return badRequest(`Chat ID is required and must be a non-empty string`);
    }
    const body = (await request.json()) as {
      messages: UIMessage[];
      persistUserMessage: boolean | null;
      /** When continuing after a mid-stream interrupt, the partial text already shown/saved. */
      resumePartialText?: string | null;
    };

    const messages = body.messages;
    const persistUserMessage =
      typeof body.persistUserMessage === "boolean"
        ? body.persistUserMessage
        : true;
    const resumePartialText =
      typeof body.resumePartialText === "string" &&
      body.resumePartialText.trim()
        ? body.resumePartialText.trim()
        : null;
    const isResume = resumePartialText != null;

    // console.log(`persistUserMessage: `, persistUserMessage, `isResume: `, isResume);
    const lastMessage = messages[messages.length - 1];
    const hasText = lastMessage?.parts?.some(
      (p) => p.type === "text" && p.text?.trim(),
    );
    const hasFile = lastMessage?.parts?.some((p) => p.type === "file");
    if (!lastMessage || lastMessage.role !== "user" || (!hasText && !hasFile)) {
      return badRequest(
        `The last message must be from user with non-empty content`,
      );
    }

    const supabaseClient = await createServerSupabaseClient();

    if (persistUserMessage) {
      await saveMessageToSupabase(supabaseClient, chatId, lastMessage);
    }

    const modelMessages = await convertToModelMessages(messages);

    // Use the vision model when any message contains an image, so images are
    // understood even when continuing after a mid-stream interrupt (the full
    // history is re-sent on resume).
    const hasImage = messages.some((m) =>
      m.parts?.some(
        (p) =>
          p.type === "file" &&
          (p.mediaType === "image" || p.mediaType?.startsWith("image/")),
      ),
    );

    const result = streamText({
      model: hasImage ? deepSeekV4FlashVision : deepSeekV4Flash,
      messages: modelMessages,
      system: buildSystemPrompt(),
      // Allow a follow-up step so the model can summarize tool results (e.g.
      // weather) instead of stopping right after the tool call. Without this,
      // the reply only contains the tool card and no text.
      stopWhen: stepCountIs(5),
      abortSignal: request.signal,
      tools: {
        weather: weatherTool,

        webSearch: webSearch({
          apiKey: process.env.NEXT_PUBLIC_EXALABS_API,
          type: "auto",
          numResults: 3,
          // category: "news",
          contents: {
            text: { maxCharacters: 500 }, // get up to 1000 chars per result
            livecrawl: "preferred", // always get fresh content if possible
            summary: true, // return an AI-generated summary for each result
          },
        }),
      },
    });

    console.log(
      isResume
        ? `Continuing stream for chat ${chatId}`
        : `Starting new stream for chat ${chatId}`,
    );

    const uiStream = result.toUIMessageStream({
      originalMessages: messages,
      onFinish: async ({ messages: finalMessages, isAborted }) => {
        const finished = finalMessages[finalMessages.length - 1];

        // Interrupted mid-stream: persist the partial assistant so a later
        // "continue" can merge into it (and it survives a reload).
        if (finished && finished.role === "assistant" && isAborted) {
          if (hasMessageText(finished)) {
            await upsertLatestAssistantMessage(
              supabaseClient,
              chatId,
              finished,
            );
          }
          return;
        }

        if (finished && finished.role === "assistant") {
          if (isResume) {
            console.log(
              `Merging continuation into latest assistant message for chat ${chatId}`,
            );
            await mergeContinuationIntoLatestAssistant(
              supabaseClient,
              chatId,
              finalMessages
            );
          } else {
            // await upsertLatestAssistantMessage(
            //   supabaseClient,
            //   chatId,
            //   finished,
            // );
          }
        }

        if (!isResume && finalMessages.length === 2) {
          const userMsg = finalMessages[0].parts
            .filter((p) => p.type === "text")
            .map((p) => p.text)
            .join("")
            .trim();

          const assistantMsg = finished.parts
            .filter((p) => p.type === "text")
            .map((p) => p.text)
            .join("")
            .trim();

          await generateChatTitle(
            supabaseClient,
            chatId,
            userMsg,
            assistantMsg,
          );
        }
      },
    });

    const [clientStream, persistStream] = uiStream.tee();

    if (!isResume) {
      void persistAssistantStream(supabaseClient, chatId, persistStream);
    }

    return createUIMessageStreamResponse({
      stream: clientStream,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return serverError();
  }
}

/**
 * Discard the latest assistant message for a chat. Used when the user
 * abandons an interrupted reply instead of continuing it.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await currentUser();
    if (!user) {
      return unauthorized();
    }

    const { id: chatId } = await params;
    if (!chatId || typeof chatId !== "string" || chatId.trim() === "") {
      return badRequest(`Chat ID is required and must be a non-empty string`);
    }

    const supabaseClient = await createServerSupabaseClient();
    await deleteLatestAssistantMessage(supabaseClient, chatId);

    return ok({ deleted: true });
  } catch (error) {
    console.error("Discard interrupted message error:", error);
    return serverError();
  }
}
