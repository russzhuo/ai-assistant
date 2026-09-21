import { qwenPlus } from "@/lib/ai/openai";
import { buildSystemPrompt } from "@/lib/ai/prompt";
import { badRequest, serverError, unauthorized } from "@/lib/api/responses";
import { generateChatTitle } from "@/lib/db/chats";
import {
  mergeContinuationIntoLatestAssistant,
  saveMessageToSupabase,
} from "@/lib/db/messages";
import { mergeAssistantText } from "@/lib/chat/stream-resume";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { weatherTool } from "@/lib/tools/weather";
import { currentUser } from "@clerk/nextjs/server";
import { convertToModelMessages, stepCountIs, streamText, UIMessage } from "ai";
import { webSearch } from "@exalabs/ai-sdk";
import { deepseek } from "@ai-sdk/deepseek";
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
      typeof body.resumePartialText === "string" && body.resumePartialText.trim()
        ? body.resumePartialText.trim()
        : null;
    const isResume = Boolean(resumePartialText);

    // console.log(`persistUserMessage: `, persistUserMessage, `isResume: `, isResume);
    const lastMessage = messages[messages.length - 1];
    const hasText = lastMessage?.parts?.some(
      (p) => p.type === "text" && p.text?.trim(),
    );
    const hasFile = lastMessage?.parts?.some((p) => p.type === "file");
    if (
      !lastMessage ||
      lastMessage.role !== "user" ||
      (!hasText && !hasFile)
    ) {
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

    return result.toUIMessageStreamResponse({
      originalMessages: messages,
      onFinish: async ({ messages: finalMessages }) => {
        const finished = finalMessages[finalMessages.length - 1];
        if (finished && finished.role === "assistant") {
          if (isResume && resumePartialText) {
            await mergeContinuationIntoLatestAssistant(
              supabaseClient,
              chatId,
              resumePartialText,
              finished,
              mergeAssistantText,
            );
          } else {
            await saveMessageToSupabase(supabaseClient, chatId, finished);
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
  } catch (error) {
    console.error("Chat API error:", error);
    return serverError();
  }
}
