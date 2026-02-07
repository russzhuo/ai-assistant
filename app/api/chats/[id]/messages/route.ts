import { qwenPlus } from "@/lib/ai/openai";
import { buildSystemPrompt } from "@/lib/ai/prompt";
import { badRequest, serverError, unauthorized } from "@/lib/api/responses";
import { generateChatTitle } from "@/lib/db/chats";
import { saveMessageToSupabase } from "@/lib/db/messages";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { weatherTool } from "@/lib/tools/weather";
import { currentUser } from "@clerk/nextjs/server";
import { convertToModelMessages, stepCountIs, streamText, UIMessage } from "ai";
import { webSearch } from "@exalabs/ai-sdk";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await currentUser();
    if (!user) {
      return unauthorized();
    }

    const { id: chatId, ...others } = await params;

    if (!chatId || typeof chatId !== "string" || chatId.trim() === "") {
      return badRequest(`Chat ID is required and must be a non-empty string`);
    }
    const body = (await request.json()) as {
      messages: UIMessage[];
      persistUserMessage: boolean | null;
    };

    const messages = body.messages;
    const persistUserMessage =
      typeof body.persistUserMessage === "boolean"
        ? body.persistUserMessage
        : true;

    console.log(`persistUserMessage: `, persistUserMessage);
    const lastMessage = messages[messages.length - 1];
    if (
      !lastMessage ||
      lastMessage.role !== "user" ||
      !lastMessage.parts?.some((p) => p.type === "text" && p.text?.trim())
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

    const result = streamText({
      model: qwenPlus,
      messages: modelMessages,
      system: buildSystemPrompt(),
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
        const lastMessage = finalMessages[finalMessages.length - 1];
        if (lastMessage && lastMessage.role === "assistant") {
          await saveMessageToSupabase(supabaseClient, chatId, lastMessage);
        }

        // console.log(`finalMessages.length: `, finalMessages.length);
        // if (finalMessages.length < 3) {
        //   console.log(finalMessages);
        // }
        if (finalMessages.length === 2) {
          const userMsg = finalMessages[0].parts
            .filter((p) => p.type === "text")
            .map((p) => p.text)
            .join("")
            .trim();

          const assistantMsg = lastMessage.parts
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
