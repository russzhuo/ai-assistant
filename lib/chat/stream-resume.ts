import { UIMessage } from "ai";

/** Hidden continue prompts use this metadata kind (filtered out of the chat UI). */
export const STREAM_CONTINUE_KIND = "stream-continue" as const;

export function getMessageText(message: UIMessage | undefined | null): string {
  if (!message?.parts?.length) return "";
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("")
    .trim();
}

export function hasMessageText(message: UIMessage | undefined | null): boolean {
  return getMessageText(message).length > 0;
}

/**
 * True if a part is text or reasoning still marked as "streaming"
 * (e.g. an interrupted stream that never emitted its final "done" state).
 */
export function isStreamingPart(part: UIMessage["parts"][number]): boolean {
  return (
    (part.type === "text" || part.type === "reasoning") &&
    part.state === "streaming"
  );
}

export function isContinuePromptMessage(message: UIMessage): boolean {
  const meta = message.metadata as { kind?: string } | undefined;
  if (meta?.kind === STREAM_CONTINUE_KIND) return true;
  return getMessageText(message).startsWith("【stream-continue】");
}

export function buildContinuePrompt(partialAssistantText: string): string {
  const clipped = partialAssistantText.trim();
  return [
    "【stream-continue】",
    "The previous assistant reply was partially generated and then interrupted by a network error.",
    "Here is what was generated so far:",
    "",
    '"""',
    clipped,
    '"""',
    "",
    "Please continue generating from where it left off.",
    "Do not repeat content that already appears above; continue seamlessly in the same language and style.",
  ].join("\n");
}

export function mergeContinuationIntoMessages(messages: UIMessage[]) {
  const continuation = messages.at(-1);
  const interrupted = messages.at(-2);

  if (!continuation || !interrupted) return messages;
  if (interrupted.role !== "assistant") return messages;
  if (continuation.role !== "assistant") return messages;

  const partialText = getMessageText(interrupted);
  const continuationText = getMessageText(continuation);
  const mergedText = mergeAssistantText(partialText, continuationText);

  return [
    ...messages.slice(0, -2),
    {
      ...interrupted,
      parts: finalizeTextParts(replaceTextParts(interrupted.parts, mergedText)),
    },
  ];
}

export function mergeAssistantText(
  partialText: string,
  continuationText: string,
): string {
  const a = partialText.trimEnd();
  const b = continuationText.trimStart();
  if (!a) return b;
  if (!b) return a;
  if (b.startsWith(a)) return b;
  const needsSpace = !/\s$/.test(a) && !/^[,\.!?;:\n）】」』]/.test(b);
  return needsSpace ? `${a} ${b}` : `${a}${b}`;
}

/**
 * Replace a message's text parts with a single text part, preserving any
 * non-text parts (e.g. tool results such as weather / web search).
 */
export function replaceTextParts(
  parts: UIMessage["parts"],
  text: string,
): UIMessage["parts"] {
  return [
    ...parts.filter((p) => p.type !== "text"),
    { type: "text" as const, text },
  ];
}

/**
 * Turn any text/reasoning parts still marked as "streaming" into "done".
 * An interrupted/aborted stream can leave parts stuck in "streaming" (e.g. a
 * reasoning spinner that never stops) because the SDK never emits their final
 * state. Apply this whenever finalizing a message.
 */
export function finalizeTextParts(parts: UIMessage["parts"]): UIMessage["parts"] {
  return parts.map((p) => {
    if (
      (p.type === "text") &&
      p.state === "streaming"
    ) {
      return { ...p, state: "done" as const };
    }
    return p;
  });
}
