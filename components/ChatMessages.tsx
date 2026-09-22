"use client";

import { useEffect, useRef } from "react";
import { MessageItem } from "./MessageItem";
import LoadingIndicator from "./LoadingIndicator";
import { UIMessage } from "ai";

type ChatMessagesProps = {
  messages: UIMessage[];
  isLoading: boolean;
  continueMessageId?: string | null;
  onContinue?: () => void;
  onDiscard?: () => void;
  continueDisabled?: boolean;
};

export function ChatMessages({
  messages,
  isLoading,
  continueMessageId = null,
  onContinue,
  onDiscard,
  continueDisabled = false,
}: ChatMessagesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Whether the view is pinned to the bottom. Starts true so the latest
  // messages show on first load; turns false when the user scrolls up.
  const stickToBottomRef = useRef(true);
  const prevLengthRef = useRef(0);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 120;
  };

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    const el = containerRef.current;
    if (!el) return;

    // Smooth-scroll for a newly added message; follow instantly while the
    // assistant is streaming tokens in.
    const isNewMessage = messages.length > prevLengthRef.current;
    prevLengthRef.current = messages.length;

    el.scrollTo({
      top: el.scrollHeight,
      behavior: isNewMessage ? "smooth" : "auto",
    });
    // `continueMessageId` changes when the continue UI appears/disappears (e.g.
    // after pressing Stop) — that grows the bubble without changing the message
    // count, so include it to scroll the newly-revealed controls into view.
  }, [messages, isLoading, continueMessageId]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 min-h-0 overflow-y-auto px-4 py-6"
    >
      <div className="mx-auto w-full max-w-4xl space-y-6">
        {messages.map((m) => (
          <MessageItem
            key={m.id}
            message={m}
            showContinue={m.id === continueMessageId}
            onContinue={m.id === continueMessageId ? onContinue : undefined}
            onDiscard={m.id === continueMessageId ? onDiscard : undefined}
            continueDisabled={continueDisabled}
          />
        ))}

        {isLoading && <LoadingIndicator />}
      </div>
    </div>
  );
}
