import { badRequest, ok, serverError, unauthorized } from "@/lib/api/responses";
import {
  deleteLatestAssistantMessage,
  upsertLatestAssistantMessage,
} from "@/lib/db/messages";
import { hasMessageText } from "@/lib/chat/stream-resume";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { currentUser } from "@clerk/nextjs/server";
import { UIMessage } from "ai";

/**
 * Persist a partial assistant message when the client stream is interrupted
 * (network error / abort) before onFinish runs.
 */
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

    const body = (await request.json()) as { message?: UIMessage };
    const message = body.message;

    if (!message || message.role !== "assistant" || !hasMessageText(message)) {
      return badRequest(
        "Expected an assistant message with non-empty text to persist",
      );
    }

    const supabaseClient = await createServerSupabaseClient();
    await upsertLatestAssistantMessage(supabaseClient, chatId, message);

    return ok({ saved: true });
  } catch (error) {
    console.error("Persist interrupted message error:", error);
    return serverError();
  }
}

/**
 * Discard the persisted partial assistant message when the user abandons an
 * interrupted reply instead of continuing it.
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
