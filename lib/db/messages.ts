import { readUIMessageStream, UIMessage, type UIMessageChunk } from "ai";
import {
  finalizeTextParts,
  getMessageText,
  mergeContinuationIntoMessages,
  replaceTextParts,
} from "../chat/stream-resume";
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
  messages: UIMessage[],
) => {
  const { data: existing, error: findError } = await findLatestMessage(
    supabaseClient,
    chatId,
  );

  if (findError) {
    console.error("Failed to find latest message for merge:", findError);
  }

  if (existing && existing.role === "assistant") {
    const mergedMessages = mergeContinuationIntoMessages(messages);
    const latestMessage = mergedMessages.at(-1);

    if (latestMessage != null) {
      const { error } = await supabaseClient
        .from("messages")
        .update({
          parts: latestMessage.parts,
        })
        .eq("id", existing.id);

      if (error) {
        console.error(
          "Failed to merge continuation into assistant message:",
          error,
        );
      }
    }
  } else {
    if (!existing) {
      console.error("No existing assistant message found for merge.");
    } else if (existing.role !== "assistant") {
      console.error(
        `Latest message is not an assistant message (role: ${existing.role}) for merge.`,
      );
    }
  }

  // await saveMessageToSupabase(supabaseClient, chatId, {
  //   ...continuation,
  //   parts: replaceTextParts(continuation.parts, mergedText),
  // });
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

/**
 * Drain a tee'd copy of a UI message stream and keep the latest assistant
 * message persisted in Supabase, throttled so we don't write on every token.
 *
 * Used for fresh (non-resume) streams: instead of only saving once the stream
 * finishes (or is aborted), we save roughly every `throttleMs` so a hard server
 * crash mid-reply still leaves the partial text behind. Resume streams skip
 * this — their partial is already persisted from the interrupted reply, and the
 * continuation is merged by `mergeContinuationIntoLatestAssistant`.
 */
const persistAssistantStream = async (
  supabaseClient: SupabaseClient,
  chatId: string,
  chunkStream: ReadableStream<UIMessageChunk>,
  throttleMs = 250,
): Promise<void> => {
  let latest: UIMessage | null = null;
  let lastWriteAt = 0;
  let lastWrittenText: string | null = null;

  const flush = async () => {
    if (!latest) return;
    const message = latest;
    const text = getMessageText(message);
    if (text === lastWrittenText || text == null) {
      latest = null;
      return;
    }

    const started = Date.now();
    try {
      await upsertLatestAssistantMessage(supabaseClient, chatId, message);
      lastWrittenText = text;
      lastWriteAt = Date.now();
      if (latest === message) latest = null;
      console.log(
        `[persist] flush ${Date.now() - started}ms, chars=${text.length}`,
      );
    } catch (err) {
      console.error(
        `[persist] flush failed after ${Date.now() - started}ms:`,
        err,
      );
    }
  };

  try {
    for await (const message of readUIMessageStream<UIMessage>({
      stream: chunkStream,
    })) {
      if (message.role !== "assistant") continue;
      latest = message;
      if (Date.now() - lastWriteAt >= throttleMs) {
        await flush();
      }
    }
  } catch (err) {
    // Aborted or errored mid-stream: fall through and flush the latest partial.
    console.error("Assistant progress stream ended with an error:", err);
  }

  await flush();
};

export {
  saveMessageToSupabase,
  upsertLatestAssistantMessage,
  mergeContinuationIntoLatestAssistant,
  deleteLatestAssistantMessage,
  persistAssistantStream,
};
