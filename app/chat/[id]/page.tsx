"use client";

import {
  useChatData,
  useDeleteLatestAssistantMessage,
} from "@/lib/queries/chat";
import { useUser } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type FileUIPart } from "ai";
import { MessageInput, type Attachment } from "@/components/MessageInput";
import { ChatMessages } from "@/components/ChatMessages";
import {
  STREAM_CONTINUE_KIND,
  buildContinuePrompt,
  getMessageText,
  hasMessageText,
  isContinuePromptMessage,
  isStreamingPart,
  mergeContinuationIntoMessages,
} from "@/lib/chat/stream-resume";

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
  const { data: chatData, isLoading } = useChatData(chatId, userId);

  const { mutate: deleteLatestAssistantMessage } =
    useDeleteLatestAssistantMessage();

  const [isGeneratingContinuation, setIsGeneratingContinuation] =
    useState(false);

  // Tracks an in-flight "continue" so we know which partial message to fold the
  // continuation into once the stream finishes. A ref avoids re-renders.
  // const resumeRef = useRef<{ messageId: string; partialText: string } | null>(
  //   null,
  // );

  const historyMessages = useMemo(() => {
    return chatData?.messages ?? [];
  }, [chatData]);

  const title = chatData?.title ?? "";

  const {
    messages,
    sendMessage,
    setMessages,
    status,
    stop,
    clearError,
    regenerate,
  } = useChat({
    id: chatId,
    transport: new DefaultChatTransport({
      api: `/api/chats/${chatId}/messages`,
    }),
    onFinish: ({ message, isAbort, isDisconnect, isError }) => {
      setIsGeneratingContinuation(false);
      setMessages(mergeContinuationIntoMessages);
    },
  });

  // New chats land with a single persisted user message and no assistant
  useEffect(() => {
    if (status !== "ready" || messages.length !== 1) {
      return;
    }

    const latest = messages.at(-1);
    if (latest?.role === "user") {
      const text = getMessageText(latest);

      sendMessage(
        { text, messageId: latest.id },
        { body: { persistUserMessage: false } },
      );
    }
  }, [sendMessage, status, messages]);

  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current) return;
    if (historyMessages.length === 0 || isLoading) return;

    seeded.current = true;
    setMessages(historyMessages);
  }, [historyMessages, setMessages, isLoading]);

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

    // resumeRef.current = null;

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

  const isReady = status === "ready";
  const isStreaming = status === "streaming";
  const isSubmitted = status === "submitted";

  const showContinue: boolean = useMemo(() => {
    if (isLoading || messages.length === 0 || isGeneratingContinuation)
      return false;

    const latest = messages.at(-1);
    if (latest?.role !== "assistant") return false;
    if (!latest.parts.some(isStreamingPart)) {
      return false;
    }

    if (isSubmitted || isStreaming) {
      return false;
    }

    return true;
  }, [messages, isLoading, isStreaming, isSubmitted, isGeneratingContinuation]);

  const continueMessageId = showContinue ? (messages.at(-1)?.id ?? null) : null;

  useEffect(() => {
    (window as any)._messages = messages;
    (window as any)._regenerate = regenerate;
  }, [messages]);

  const handleContinue = () => {
    const interruptedMessage = messages.at(-1);
    if (!interruptedMessage || interruptedMessage.role !== "assistant") return;

    const hasNonTextPartStreaming = interruptedMessage.parts.some(
      (p) => isStreamingPart(p) && p.type !== "text",
    );

    const doGenerateContinuation = (callback: () => void) => {
      clearError();
      setIsGeneratingContinuation(true);
      callback();
    };

    if (hasNonTextPartStreaming) {
      doGenerateContinuation(() => regenerate());
      return;
    }

    if (!interruptedMessage || !hasMessageText(interruptedMessage)) return;

    doGenerateContinuation(() => {
      const partialText = getMessageText(interruptedMessage);

      sendMessage(
        {
          text: buildContinuePrompt(partialText),
          metadata: { kind: STREAM_CONTINUE_KIND },
        },
        { body: { persistUserMessage: false, resumePartialText: partialText } },
      );
    });
  };

  const handleDiscard = () => {
    const targetId = messages.at(-1)?.id;

    // resumeRef.current = null;
    clearError();

    if (targetId) {
      setMessages((prev) => prev.filter((m) => m.id !== targetId));
    }

    if (chatId) {
      deleteLatestAssistantMessage(chatId);
    }
  };

  const visibleMessages = useMemo(() => {
    const filered = messages.filter((m) => !isContinuePromptMessage(m));

    return mergeContinuationIntoMessages(filered);
  }, [messages]);

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
        continueMessageId={continueMessageId}
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
        status={status}
        onStop={stop}
        attachments={attachments}
        onAddFiles={handleAddFiles}
        onRemoveAttachment={handleRemoveAttachment}
      />
    </div>
  );
}
