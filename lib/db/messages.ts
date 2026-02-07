import { UIMessage } from "ai";
import { createServerSupabaseClient } from "../supabase/server";

const saveMessageToSupabase = async (
  supabaseClient: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  chatId: string,
  message: UIMessage,
) => {
  const { error } = await supabaseClient.from("messages").insert({
    chat_id: chatId,
    role: message.role,
    parts: message.parts,
  });

  if (error) {
    console.error(`Failed to save ${message.role} message:`, error);
  }
};


export { saveMessageToSupabase };
