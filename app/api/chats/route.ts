import { created, serverError, unauthorized } from "@/lib/api/responses";
import { createChat } from "@/lib/db/chats";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { currentUser } from "@clerk/nextjs/server";

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return unauthorized();
    }

    let initialMessage: string | undefined;

    try {
      const body = await request.json();
      initialMessage = body.initialMessage;
    } catch {
      console.warn("No initial message provided in request body");
    }

    const supabase = await createServerSupabaseClient();

    const newChat = await createChat(supabase, user.id);
    if (!newChat?.id) {
      throw new Error("Failed to create chat record");
    }

    // console.log("initialMessage: ", initialMessage);

    const chatId = newChat.id;
    if (initialMessage?.trim()) {
      const { error } = await supabase.from("messages").insert({
        chat_id: chatId,
        parts: [{ type: "text", text: initialMessage.trim() }],
        role: "user",
      });

      if (error) {
        console.error("Failed to insert first message:", error);
      }
    }

    return created({ id: chatId });
  } catch (error) {
    console.error("Chat API error:", error);
    return serverError();
  }
}
