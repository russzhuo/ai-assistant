"use client";

import { useOwnedChats, useDeleteChat } from "@/lib/queries/chat";
import { Menu, MessageCircle, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import cn from "classnames";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Button as AppButton } from "./Button";
import { useState } from "react";
import { useMediaQuery } from "react-responsive";
import { Button, Popconfirm, SideSheet, Tooltip } from "@douyinfe/semi-ui-19";

interface Props {
  classname: string | null;
}

const Sidebar: React.FC<Props> = ({ classname }) => {
  const { data: chats = [], isLoading } = useOwnedChats();
  const { id: chatId } = useParams();
  const { isSignedIn, isLoaded } = useUser();
  const isTabletOrMobile = useMediaQuery({
    query: `(max-width: 777px)`,
  });

  const router = useRouter();
  const deleteChat = useDeleteChat();

  const [open, setOpen] = useState(false);

  // console.log("isTabletOrMobile: ", isTabletOrMobile);

  const content = (
    <>
      {/* Header: brand + new chat + history label (pinned) */}
      <div className="sticky top-0 z-10 bg-frost-white px-3 pt-4 pb-3 border-b border-gray-200/50">
        <div className="flex items-center space-x-3 px-1 mb-3">
          <div className="w-8 h-8 bg-linear-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
            <MessageCircle className="w-4 h-4 text-white" />
          </div>
          <strong className="tracking-wide">AI Assistant</strong>
        </div>

        <AppButton
          size="sm"
          className="w-full gap-2"
          onClick={() => {
            router.push("/");
            setOpen(false);
          }}
        >
          <Plus className="w-4 h-4" />
          New chat
        </AppButton>

        <div className="px-1 pt-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            History
          </span>
        </div>
      </div>

      <nav className="flex-1 py-2">
        {/* <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400"> */}
        <ul className="space-y-1 px-2 h-auto">
          {isLoading || !isLoaded ? (
            [...Array(5)].map((_, i) => (
              <div
                key={i}
                className="p-5 mb-2 text-center bg-gray-200 rounded-lg animate-pulse"
              />
            ))
          ) : !isSignedIn ? (
            <p className="px-2 text-gray-500 mx-auto leading-relaxed">
              {`You haven't logged in yet. Login or create an account to keep your conversation history
              across devices.`}
            </p>
          ) : chats?.length === 0 ? (
            <li className="mx-1 my-4 px-4 py-10 text-center rounded-2xl border border-dashed border-gray-200">
              <div className="flex flex-col items-center gap-2">
                <MessageCircle className="w-6 h-6 text-gray-300" />
                <p className="text-sm text-gray-500">No conversations yet</p>
                <p className="text-xs text-gray-400">Start a new chat above.</p>
              </div>
            </li>
          ) : (
            chats.map((c) => {
              const cid = c.id;
              const isActive = chatId === cid;
              const title = c.title ?? "";

              return (
                <li key={cid}>
                  <div
                    className={cn(
                      `group flex items-center rounded-2xl transition-all duration-200 ease-out`,
                      isActive
                        ? "bg-linear-to-r from-blue-500 to-blue-600 text-white font-semibold shadow-sm"
                        : "text-gray-700 hover:text-gray-900 hover:bg-white/60 hover:shadow-md",
                    )}
                  >
                    <Link
                      href={`/chat/${cid}`}
                      className="flex-1 min-w-0 flex items-center space-x-3 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p
                          className={`
                            font-medium truncate text-sm leading-tight
                            ${isActive ? "text-white drop-shadow-md" : "group-hover:font-semibold"}
                          `}
                          title={title}
                        >
                          {title}
                        </p>
                      </div>
                    </Link>

                    <Popconfirm
                      title="Delete this chat?"
                      content="This action cannot be undone."
                      position="right"
                      onConfirm={() => {
                        deleteChat.mutate(cid, {
                          onSuccess: () => {
                            if (isActive) router.push("/");
                          },
                        });
                      }}
                    >
                      <button
                        type="button"
                        aria-label="Delete chat"
                        className={cn(
                          "mr-2 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity",
                          isActive
                            ? "text-white/70 hover:text-white hover:bg-white/20"
                            : "text-gray-400 hover:text-red-600 hover:bg-red-50",
                        )}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </Popconfirm>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </nav>
    </>
  );

  if (isTabletOrMobile) {
    return (
      <>
        <Button
          className="fixed top-3 left-4 z-1"
          onClick={() => setOpen(true)}
          icon={<Menu color="black" />}
        />

        <SideSheet
          visible={open}
          onCancel={() => setOpen(false)}
          placement="left"
        >
          {content}
        </SideSheet>
      </>
    );
  }

  return (
    <aside className={cn(classname, `hidden md:block`, `overflow-y-auto`)}>
      {content}
    </aside>
  );
};

export { Sidebar };
