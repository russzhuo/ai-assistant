import { UIMessage } from "ai";
import { replaceTextParts } from "../chat/stream-resume";
import { createServerSupabaseClient } from "../supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

const findLatestMessage = (supabaseClient: SupabaseClient, chatId: string) =>
  supabaseClient
    .from("messages")
    .select("id, role, parts")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

const saveMessageToSupabase = async (
  supabaseClient: SupabaseClient,
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

/**
 * Persist (or refresh) the latest assistant row for a chat.
 * Used when a stream is interrupted mid-reply so partial text is not lost.
 */
const upsertLatestAssistantMessage = async (
  supabaseClient: SupabaseClient,
  chatId: string,
  message: UIMessage,
) => {
  const { data: existing, error: findError } = await findLatestMessage(
    supabaseClient,
    chatId,
  );

  if (findError) {
    console.error("Failed to find latest message for upsert:", findError);
    await saveMessageToSupabase(supabaseClient, chatId, message);
    return;
  }

  if (existing && existing.role === "assistant") {
    const { error } = await supabaseClient
      .from("messages")
      .update({ parts: message.parts })
      .eq("id", existing.id);

    if (error) {
      console.error("Failed to update interrupted assistant message:", error);
    }
    return;
  }

  await saveMessageToSupabase(supabaseClient, chatId, message);
};

/**
 * After a successful continue stream, merge continuation into the previous
 * assistant row (the interrupted partial) instead of inserting a second row.
 */
const mergeContinuationIntoLatestAssistant = async (
  supabaseClient: SupabaseClient,
  chatId: string,
  partialText: string,
  continuation: UIMessage,
  mergeText: (partial: string, next: string) => string,
) => {
  const continuationText = continuation.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");

  const mergedText = mergeText(partialText, continuationText);

  const { data: existing, error: findError } = await findLatestMessage(
    supabaseClient,
    chatId,
  );

  if (findError) {
    console.error("Failed to find assistant for merge:", findError);
    await saveMessageToSupabase(supabaseClient, chatId, {
      ...continuation,
      parts: replaceTextParts(continuation.parts, mergedText),
    });
    return;
  }

  if (existing && existing.role === "assistant") {
    const { error } = await supabaseClient
      .from("messages")
      .update({ parts: replaceTextParts(existing.parts, mergedText) })
      .eq("id", existing.id);

    if (error) {
      console.error("Failed to merge continuation into assistant message:", error);
    }
    return;
  }

  await saveMessageToSupabase(supabaseClient, chatId, {
    ...continuation,
    parts: replaceTextParts(continuation.parts, mergedText),
  });
};

/**
 * Remove the latest assistant message for a chat.
 * Used when the user abandons an interrupted reply instead of continuing it.
 */
const deleteLatestAssistantMessage = async (
  supabaseClient: SupabaseClient,
  chatId: string,
) => {
  const { data: existing, error: findError } = await findLatestMessage(
    supabaseClient,
    chatId,
  );

  if (findError) {
    console.error("Failed to find latest message for delete:", findError);
    return;
  }

  if (existing && existing.role === "assistant") {
    const { error } = await supabaseClient
      .from("messages")
      .delete()
      .eq("id", existing.id);

    if (error) {
      console.error("Failed to delete interrupted assistant message:", error);
    }
  }
};

export {
  saveMessageToSupabase,
  upsertLatestAssistantMessage,
  mergeContinuationIntoLatestAssistant,
  deleteLatestAssistantMessage,
};
