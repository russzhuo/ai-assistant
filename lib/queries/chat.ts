"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useClerkSupabaseClient } from "../supabase/client";
import { useRouter } from "next/navigation";
import { ChatRow, MessageRow } from "@/types/supabase";
import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { emitter } from "../events/EventEmitter";

export const chatKeys = {
  chat: (chatId: string) => ["chat", chatId] as const,
  messages: (chatId: string) => ["messages", chatId] as const,
  ownedChats: (userId: string) => ["chats", userId] as const,
};

interface CreateChatResponse {
  id: string;
}

interface CreateChatInput {
  initialMessage?: string;
}

async function createChatFn(
  data: CreateChatInput,
): Promise<CreateChatResponse> {
  const res = await fetch("/api/chats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initialMessage: data.initialMessage }),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error ?? "Failed to create chat");
  }

  return res.json();
}

export const useCreateChat = () => {
  const router = useRouter();
  // const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createChatFn,

    onSuccess: (newChat) => {
      router.push(`/chat/${newChat.id}`);
      emitter.emit("chat:created");
    },

    onError: (error) => {
      console.error("Chat creation failed:", error);
    },
  });
};

interface ChatData {
  title: string | null;
  messages: MessageRow[];
}

export const useOwnedChats = () => {
  const supabaseClient = useClerkSupabaseClient();
  const { user, isSignedIn } = useUser();
  const userId = user?.id;

  const queryResult = useQuery<Array<ChatRow>, Error>({
    queryKey: chatKeys.ownedChats(userId ?? ""),
    enabled: !!userId && isSignedIn,
    queryFn: async () => {
      const { data: chats, error: chatsError } = await supabaseClient
        .from("chats")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: true });

      if (chatsError) {
        throw chatsError;
      }

      return chats ?? [];
    },
  });

  const { refetch, isLoading } = queryResult;

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const handler = () => {
      refetch();
    };

    emitter.on("chat:created", handler);

    return () => {
      emitter.off("chat:created", handler);
    };
  }, [refetch, isLoading, queryResult]);

  return queryResult;
};

export const useChatData = (chatId: string | null, userId: string | null) => {
  const supabaseClient = useClerkSupabaseClient();
  const queryClient = useQueryClient();

  const queryResult = useQuery<ChatData, Error>({
    queryKey: chatKeys.chat(chatId || ""),
    enabled: !!chatId && !!userId,
    // staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!chatId || !userId) throw new Error("Missing chatId or userId");

      const { data: chatData, error: chatError } = await supabaseClient
        .from("chats")
        .select("title")
        .eq("id", chatId)
        .eq("user_id", userId)
        .single();

      if (chatError) throw chatError;
      if (!chatData) throw new Error("Chat not found");

      // console.log("chatId: ", chatId);
      const { data: messages, error: msgError } = await supabaseClient
        .from("messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

      if (msgError) throw msgError;

      // console.log("messages data: ", messages);
      return {
        title: chatData.title,
        messages: messages || [],
      };
    },
  });

  const { data, refetch } = queryResult;

  useEffect(() => {
    if (!chatId || !userId || !data) {
      return;
    }

    const channel = supabaseClient
      .channel(`chat:${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chats",
          filter: `id=eq.${chatId}`,
        },
        (payload) => {
          // console.log("Realtime title update:" + payload.new.title);

          refetch();

          queryClient.invalidateQueries({
            queryKey: chatKeys.ownedChats(userId),
          });
        },
      )
      .subscribe();

    const unsub = () => {
      supabaseClient.removeChannel(channel);
    };
    return () => {
      unsub();
    };
  }, [chatId, userId, refetch, data, supabaseClient, queryClient]);

  return queryResult;
};
