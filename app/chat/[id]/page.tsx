"use client";

import { useChatData } from "@/lib/queries/chat";
import { useUser } from "@clerk/nextjs";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { MessageInput } from "@/components/MessageInput";
import { ChatMessages } from "@/components/ChatMessages";

export default function ChatRoom() {
  const { id: chatId } = useParams<{ id: string }>();
  const { user } = useUser();
  const userId = user?.id || null;

  const [input, setInput] = useState("");

  const { data: chatData } = useChatData(chatId, userId);

  const historyMessages = useMemo(() => {
    return chatData?.messages ?? [];
  }, [chatData]);

  const title = chatData?.title ?? "";

  const { messages, sendMessage, setMessages, status } = useChat({
    id: chatId,
    transport: new DefaultChatTransport({
      api: `/api/chats/${chatId}/messages`,
    }),
  });

  useEffect(() => {
    if (historyMessages.length > 0) {
      setMessages(historyMessages);
    }
  }, [historyMessages, setMessages]);

  useEffect(() => {
    if (status !== "ready") return;
    const last = messages.at(-1);
    if (last?.role === "user") {
      const text = last.parts
        .filter((p) => p.type === "text")
        .map((p) => p.text)
        .join(" ");

      sendMessage(
        { text, messageId: last.id },
        { body: { persistUserMessage: false } },
      );
    }
  }, [messages, sendMessage, status]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput("");
  };

  const isLoading = status === "submitted";
  const isReady = status === "ready";
  // const { isSignedIn, isLoaded } = useUser();
  // const pathname = usePathname();
  // const router = useRouter();

  // useEffect(() => {
  //   if (!isLoaded || isSignedIn || !router) {
  //     return;
  //   }

  //   const indexPage = "/";

  //   if (pathname !== indexPage) {
  //     router.push(indexPage);
  //   }
  // }, [isSignedIn, isLoaded, pathname, router]);

  return (
    <div className="h-full flex flex-col bg-gray-50/40">
      {/* Header */}
      <header className="px-5 py-2 border-b border-gray-200/70 bg-white/80 backdrop-blur-sm">
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">
          {title}
        </h1>
      </header>

      {/* Messages */}
      <ChatMessages messages={messages} isLoading={isLoading} />

      {/* Input */}
      <MessageInput
        input={input}
        onChange={(e) => setInput(e.target.value)}
        onSubmit={handleSubmit}
        submitAllowed={isReady && !!input.trim()}
        inputAllowed={isReady}
      />
    </div>
  );
}
