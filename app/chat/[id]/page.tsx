"use client";

import { useChatData } from "@/lib/queries/chat";
import { useUser } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, UIMessage, type FileUIPart } from "ai";
import { MessageInput, type Attachment } from "@/components/MessageInput";
import { ChatMessages } from "@/components/ChatMessages";
import {
  STREAM_CONTINUE_KIND,
  buildContinuePrompt,
  finalizeParts,
  getMessageText,
  hasMessageText,
  isContinuePromptMessage,
  mergeAssistantText,
  replaceTextParts,
} from "@/lib/chat/stream-resume";

/** Shown inside an empty assistant bubble when the stream fails before any content arrives. */
const STREAM_ERROR_TEXT = "⚠️ Couldn’t generate a reply. Please try again.";

const readFileAsDataURL = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export default function ChatRoom() {
  const { id: chatId } = useParams<{ id: string }>();
  const { user } = useUser();
  const userId = user?.id || null;

  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [interruptedMessageId, setInterruptedMessageId] = useState<
    string | null
  >(null);
  const resumePartialTextRef = useRef<string | null>(null);
  const interruptedMessageIdRef = useRef<string | null>(null);
  const suppressAutoKickRef = useRef(false);

  const { data: chatData } = useChatData(chatId, userId);

  const historyMessages = useMemo(() => {
    return chatData?.messages ?? [];
  }, [chatData]);

  const title = chatData?.title ?? "";

  const persistInterruptedAssistant = useCallback(
    async (message: UIMessage) => {
      if (!chatId || !hasMessageText(message)) return;
      try {
        await fetch(`/api/chats/${chatId}/messages/persist`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
        });
      } catch (err) {
        console.error("Failed to persist interrupted assistant message:", err);
      }
    },
    [chatId],
  );

  const { messages, sendMessage, setMessages, status, stop, clearError } =
    useChat({
    id: chatId,
    transport: new DefaultChatTransport({
      api: `/api/chats/${chatId}/messages`,
      prepareSendMessagesRequest: ({
        id,
        messages: nextMessages,
        body,
        trigger,
        messageId,
        headers,
        credentials,
        api,
      }) => {
        const nextBody: Record<string, unknown> = {
          ...(body ?? {}),
          id,
          messages: nextMessages,
          trigger,
          messageId,
        };
        return { body: nextBody, headers, credentials, api };
      },
    }),
    onFinish: ({ message, isAbort, isDisconnect, isError }) => {
      const failed = isAbort || isDisconnect || isError;

      if (failed) {
        if (message.role === "assistant") {
          // The stream ended without the SDK emitting a final "done" state for
          // text/reasoning parts (e.g. interrupted). Finalize them so spinners
          // don't spin forever and the persisted message isn't stuck "streaming".
          const finalized: UIMessage = {
            ...message,
            parts: finalizeParts(message.parts),
          };

          if (hasMessageText(finalized)) {
            interruptedMessageIdRef.current = finalized.id;
            setInterruptedMessageId(finalized.id);
            const partial = getMessageText(finalized);
            resumePartialTextRef.current = partial;
            setMessages((prev) =>
              prev.map((m) => (m.id === finalized.id ? finalized : m)),
            );
            void persistInterruptedAssistant(finalized);
          } else {
            // The stream failed before any content was generated, leaving the
            // assistant bubble blank. Surface an error inside it instead.
            setMessages((prev) =>
              prev.map((m) =>
                m.id === message.id
                  ? {
                      ...m,
                      parts: [
                        ...finalizeParts(m.parts),
                        { type: "text" as const, text: STREAM_ERROR_TEXT },
                      ],
                    }
                  : m,
              ),
            );
          }
        }
        return;
      }

      // Successful stream — if this was a continue, fold continuation into the
      // interrupted assistant bubble and drop the hidden continue prompt.
      const partial = resumePartialTextRef.current;
      const targetId = interruptedMessageIdRef.current;
      if (!partial || message.role !== "assistant") {
        return;
      }

      const mergedText = mergeAssistantText(partial, getMessageText(message));
      // Preserve non-text parts (tool results) on the interrupted message,
      // replacing only its text with the merged continuation.
      const withMergedText = (base: UIMessage): UIMessage => ({
        ...base,
        parts: finalizeParts(replaceTextParts(base.parts, mergedText)),
      });
      setMessages((prev) => {
        const withoutContinue = prev.filter((m) => !isContinuePromptMessage(m));
        const withoutNewAssistant = withoutContinue.filter(
          (m) => m.id !== message.id,
        );
        const idx = targetId
          ? withoutNewAssistant.findIndex((m) => m.id === targetId)
          : -1;

        if (idx === -1) {
          return withoutContinue.map((m) =>
            m.id === message.id ? withMergedText(m) : m,
          );
        }

        const next = [...withoutNewAssistant];
        next[idx] = withMergedText(next[idx]);
        return next;
      });

      resumePartialTextRef.current = null;
      interruptedMessageIdRef.current = null;
      setInterruptedMessageId(null);
    },
  });

  useEffect(() => {
    if (historyMessages.length > 0) {
      // Persisted messages can have parts stuck in "streaming" state (e.g. an
      // interrupted reply was saved mid-stream). Finalize them before render.
      setMessages(
        historyMessages.map((m) => ({ ...m, parts: finalizeParts(m.parts) })),
      );
    }
  }, [historyMessages, setMessages]);

  useEffect(() => {
    if (status !== "ready") return;
    // Don't auto-kick while waiting for the user to continue an interrupted reply.
    if (interruptedMessageId) return;
    // Don't auto-retry after the user abandoned an interrupted reply.
    if (suppressAutoKickRef.current) return;
    const last = messages.at(-1);
    if (last?.role === "user" && !isContinuePromptMessage(last)) {
      const text = last.parts
        .filter((p) => p.type === "text")
        .map((p) => p.text)
        .join(" ");

      sendMessage(
        { text, messageId: last.id },
        { body: { persistUserMessage: false } },
      );
    }
  }, [messages, sendMessage, status, interruptedMessageId]);

  const handleAddFiles = useCallback(async (files: File[]) => {
    const next = await Promise.all(
      files.map(async (file) => ({
        id: crypto.randomUUID(),
        name: file.name,
        mediaType: file.type || "image/*",
        url: await readFileAsDataURL(file),
      })),
    );
    setAttachments((prev) => [...prev, ...next]);
  }, []);

  const handleRemoveAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hasText = Boolean(input.trim());
    if (!hasText && attachments.length === 0) return;

    interruptedMessageIdRef.current = null;
    resumePartialTextRef.current = null;
    suppressAutoKickRef.current = false;
    setInterruptedMessageId(null);

    const files: FileUIPart[] = attachments.map((a) => ({
      type: "file",
      mediaType: a.mediaType,
      filename: a.name,
      url: a.url,
    }));

    if (hasText) {
      sendMessage({ text: input, files });
    } else {
      sendMessage({ files });
    }

    setInput("");
    setAttachments([]);
  };

  const handleContinue = () => {
    const partialMessage =
      messages.find((m) => m.id === interruptedMessageId) ??
      (messages.at(-1)?.role === "assistant" ? messages.at(-1) : undefined);

    if (!partialMessage || !hasMessageText(partialMessage)) return;

    const partialText = getMessageText(partialMessage);
    interruptedMessageIdRef.current = partialMessage.id;
    resumePartialTextRef.current = partialText;
    setInterruptedMessageId(partialMessage.id);
    clearError();

    sendMessage(
      {
        text: buildContinuePrompt(partialText),
        metadata: { kind: STREAM_CONTINUE_KIND },
      },
      { body: { persistUserMessage: false, resumePartialText: partialText } },
    );
  };

  const handleDiscard = () => {
    const targetId = interruptedMessageIdRef.current;

    interruptedMessageIdRef.current = null;
    resumePartialTextRef.current = null;
    suppressAutoKickRef.current = true;
    setInterruptedMessageId(null);

    if (targetId) {
      setMessages((prev) => prev.filter((m) => m.id !== targetId));
    }

    clearError();

    if (chatId) {
      void fetch(`/api/chats/${chatId}/messages/persist`, {
        method: "DELETE",
      }).catch((err) => {
        console.error("Failed to discard interrupted message:", err);
      });
    }
  };

  const isReady = status === "ready";
  const isStreaming = status === "submitted" || status === "streaming";
  const showContinue = Boolean(interruptedMessageId) && !isStreaming;

  const visibleMessages = useMemo(
    () => messages.filter((m) => !isContinuePromptMessage(m)),
    [messages],
  );

  return (
    <div className="h-full flex flex-col bg-gray-50/40">
      <header className="px-5 py-2 border-b border-gray-200/70 bg-white/80 backdrop-blur-sm">
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">
          {title}
        </h1>
      </header>

      <ChatMessages
        messages={visibleMessages}
        isLoading={status === "submitted"}
        interruptedMessageId={showContinue ? interruptedMessageId : null}
        onContinue={handleContinue}
        onDiscard={handleDiscard}
        continueDisabled={isStreaming}
      />

      <MessageInput
        input={input}
        onChange={(e) => setInput(e.target.value)}
        onSubmit={handleSubmit}
        submitAllowed={
          (isReady || status === "error") &&
          (!!input.trim() || attachments.length > 0) &&
          !showContinue
        }
        inputAllowed={isReady || status === "error"}
        isStreaming={isStreaming}
        onStop={stop}
        attachments={attachments}
        onAddFiles={handleAddFiles}
        onRemoveAttachment={handleRemoveAttachment}
      />
    </div>
  );
}
