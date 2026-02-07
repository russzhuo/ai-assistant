import { convertToModelMessages, generateText, tool } from "ai";
import { qwenPlus } from "../ai/openai";
import { buildTitlePrompt } from "../ai/prompt";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { weatherTool } from "../tools/weather";
import { webSearch } from "@exalabs/ai-sdk";

const createChat = async (
  supabaseClient: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
) => {
  const { data: newChat, error: chatErr } = await supabaseClient
    .from("chats")
    .insert({
      user_id: userId,
    })
    .select("id, title, user_id, created_at")
    .single();

  if (chatErr || !newChat?.id) {
    console.error("Failed to create chat:", chatErr);
  }

  return newChat;
};

const generateChatTitle = async (
  supabaseClient: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  chatId: string,
  userMessage: string,
  assistantMessage: string,
) => {
  try {
    const result = await generateText({
      model: qwenPlus,
      messages: await convertToModelMessages([
        {
          role: "user",
          parts: [{ type: "text", text: userMessage }],
        },
      ]),
      system: buildTitlePrompt(userMessage, assistantMessage),
    });

    let title = result.text?.trim() || "";
    console.log(
      "systemPrompt: ",
      buildTitlePrompt(userMessage, assistantMessage),
    );

    console.log("title: ", title);

    if (!title || title.length > 100) {
      title = "New Conversation";
    }

    const { data, error } = await supabaseClient
      .from("chats")
      .update({ title })
      .eq("id", chatId);
    console.log(data, error);

    if (error) {
      console.error("Failed to save chat title:", error);
    }
  } catch (error) {
    console.error("Error generating chat title:", error);

    // fallback to default title
    await supabaseClient
      .from("chats")
      .update({ title: "New Conversation" })
      .eq("id", chatId);
  }
};

export { generateChatTitle, createChat };
