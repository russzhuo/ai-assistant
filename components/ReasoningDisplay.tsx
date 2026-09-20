"use client";

import { useState } from "react";
import cn from "classnames";
import { Brain, ChevronDown, Loader2 } from "lucide-react";

interface ReasoningDisplayProps {
  text: string;
  state?: "streaming" | "done";
}

/**
 * Collapsible panel for the model's reasoning / thinking content.
 * While streaming it stays expanded with a spinner; once finished it collapses
 * by default and the user can expand it to read the reasoning.
 */
export default function ReasoningDisplay({
  text,
  state,
}: ReasoningDisplayProps) {
  const isStreaming = state === "streaming";
  const [manuallyOpen, setManuallyOpen] = useState<boolean | null>(null);

  // Streaming forces the panel open so the user watches the reasoning unfold;
  // once done it collapses unless the user has explicitly opened it.
  const open = isStreaming || manuallyOpen === true;

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-gray-200/70 bg-gray-50/70">
      <button
        type="button"
        onClick={() => setManuallyOpen((v) => !v)}
        disabled={isStreaming}
        className={cn(
          "flex w-full items-center gap-2 px-3 py-2 text-left text-xs",
          isStreaming
            ? "cursor-default"
            : "cursor-pointer transition-colors hover:bg-gray-100/60",
        )}
      >
        {isStreaming ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-violet-500" />
        ) : (
          <Brain className="h-3.5 w-3.5 shrink-0 text-violet-500" />
        )}

        <span className="font-medium text-gray-600">
          {isStreaming ? "Thinking…" : "Reasoning"}
        </span>

        {!isStreaming && (
          <ChevronDown
            className={cn(
              "ml-auto h-4 w-4 text-gray-400 transition-transform",
              open && "rotate-180",
            )}
          />
        )}
      </button>

      {open && text.length > 0 && (
        <div className="border-t border-gray-200/70 px-3 py-2.5">
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-gray-500">
            {text}
          </p>
        </div>
      )}
    </div>
  );
}
