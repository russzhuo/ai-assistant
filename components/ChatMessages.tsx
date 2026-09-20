"use client";

import { useEffect, useRef } from "react";
import { MessageItem } from "./MessageItem";
import LoadingIndicator from "./LoadingIndicator";
import { UIMessage } from "ai";

type ChatMessagesProps = {
  messages: UIMessage[];
  isLoading: boolean;
  interruptedMessageId?: string | null;
  onContinue?: () => void;
  onDiscard?: () => void;
  continueDisabled?: boolean;
};

export function ChatMessages({
  messages,
  isLoading,
  interruptedMessageId = null,
  onContinue,
  onDiscard,
  continueDisabled = false,
}: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // useEffect(() => {
  //   messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  // }, [messages, isLoading, interruptedMessageId]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-4 py-6">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        {messages.map((m) => (
          <MessageItem
            key={m.id}
            message={m}
            interrupted={m.id === interruptedMessageId}
            onContinue={m.id === interruptedMessageId ? onContinue : undefined}
            onDiscard={m.id === interruptedMessageId ? onDiscard : undefined}
            continueDisabled={continueDisabled}
          />
        ))}

        {isLoading && <LoadingIndicator />}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
