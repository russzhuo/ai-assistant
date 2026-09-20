import { badRequest, ok, serverError, unauthorized } from "@/lib/api/responses";
import { deleteChat } from "@/lib/db/chats";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { currentUser } from "@clerk/nextjs/server";

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
      return badRequest("Chat ID is required");
    }

    const supabase = await createServerSupabaseClient();
    const { error } = await deleteChat(supabase, chatId, user.id);

    if (error) {
      return serverError();
    }

    return ok({ deleted: true });
  } catch (error) {
    console.error("Delete chat error:", error);
    return serverError();
  }
}
