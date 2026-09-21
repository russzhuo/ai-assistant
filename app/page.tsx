"use client";

import { useRef, useState } from "react";
import { useCreateChat } from "@/lib/queries/chat";
import { useUser } from "@clerk/nextjs";
import {
  CloudSun,
  Code2,
  MessageCircle,
  Search,
  Send,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import cn from "classnames";

type Suggestion = {
  icon: LucideIcon;
  label: string;
  prompt: string;
};

const SUGGESTIONS: Suggestion[] = [
  {
    icon: Search,
    label: "Search the web",
    prompt: "Search the web for the latest AI news and summarize the key points.",
  },
  {
    icon: CloudSun,
    label: "Check the weather",
    prompt: "What's the weather like in Tokyo this week?",
  },
  {
    icon: Code2,
    label: "Explain code",
    prompt: "Explain what this code does, step by step.",
  },
  {
    icon: Sparkles,
    label: "Summarize an article",
    prompt: "Summarize a long article into a few bullet points.",
  },
];

export default function NewChat() {
  const [input, setInput] = useState("");
  const { isSignedIn, isLoaded } = useUser();
  const inputRef = useRef<HTMLInputElement>(null);

  const { mutate, isPending, error } = useCreateChat();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || !isSignedIn) return;
    mutate({ initialMessage: trimmed });
    setInput("");
  };

  const pickSuggestion = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  const canSubmit = Boolean(input.trim() && isSignedIn && !isPending);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-24 -mt-8">
        {/* Logo */}
        <div className="mb-5 w-14 h-14 bg-linear-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
          <MessageCircle className="w-7 h-7 text-white" />
        </div>

        {/* Heading */}
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900 text-center">
          What can I help with?
        </h1>
        <p className="mt-3 text-sm sm:text-base text-gray-500 text-center max-w-md">
          Ask anything — search the web, check the weather, or get help with
          code.
        </p>

        {/* Input */}
        <form onSubmit={handleSubmit} className="mt-8 w-full max-w-2xl">
          <div className="flex items-center gap-2 pl-5 pr-2 py-2 rounded-2xl border border-gray-200 bg-white shadow-lg shadow-gray-200/60 transition-all focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-200/50">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message AI Assistant…"
              disabled={isPending}
              className="flex-1 min-w-0 bg-transparent text-gray-800 placeholder-gray-400 focus:outline-none text-base py-2"
            />
            <button
              type="submit"
              disabled={!canSubmit}
              aria-label="Send message"
              className={cn(
                "h-10 w-10 shrink-0 inline-flex items-center justify-center rounded-xl text-white transition-all duration-200 cursor-pointer",
                "bg-linear-to-r from-blue-500 to-blue-600 shadow-md shadow-blue-500/30",
                "hover:from-blue-600 hover:to-blue-700 active:scale-95",
                "disabled:opacity-50 disabled:pointer-events-none",
              )}
            >
              {isPending ? (
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8z"
                  />
                </svg>
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </form>

        {/* Status hints */}
        {error && (
          <p className="mt-3 text-sm text-red-600">
            Something went wrong. Please try again.
          </p>
        )}
        {isLoaded && !isSignedIn && !error && (
          <p className="mt-3 text-sm text-gray-400">
            Sign in to keep your conversation history.
          </p>
        )}

        {/* Suggestions */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
          {SUGGESTIONS.map(({ icon: Icon, label, prompt }) => (
            <button
              key={label}
              type="button"
              onClick={() => pickSuggestion(prompt)}
              className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left text-sm text-gray-700 hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-200 cursor-pointer"
            >
              <Icon className="w-4 h-4 shrink-0 text-blue-500" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <footer className="pb-5 text-center text-xs text-gray-400">
        AI can make mistakes. Please verify important information.
      </footer>
    </div>
  );
}
