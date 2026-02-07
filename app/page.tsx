"use client";

import { useEffect, useState } from "react";
import { useCreateChat } from "@/lib/queries/chat";
import { MessageInput } from "@/components/MessageInput";
import { SignIn, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function NewChat() {
  const [input, setInput] = useState("");
  const { isSignedIn } = useUser();

  const { mutate, isPending, error } = useCreateChat();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = input.trim();
    if (!trimmed) return;

    mutate({ initialMessage: trimmed });

    setInput("");
  };

  return (
    <div className="h-full flex flex-row items-center justify-center">
      <MessageInput
        input={input}
        onChange={(e) => setInput(e.target.value)}
        onSubmit={handleSubmit}
        submitAllowed={Boolean(
          !isPending && !error && input.trim() && isSignedIn,
        )}
        inputAllowed={Boolean(!isPending && !error)}
      />
    </div>
  );
}
