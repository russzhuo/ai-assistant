"use client";

import { useOwnedChats } from "@/lib/queries/chat";
import { Menu, MessageCircle, MoreHorizontal, Plus } from "lucide-react";
import Link from "next/link";
import cn from "classnames";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
// import { Button } from "./Button";
import { useState } from "react";
import { useMediaQuery } from "react-responsive";
import { Button, SideSheet, Tooltip } from "@douyinfe/semi-ui-19";

interface Props {
  classname: string | null;
}

const Sidebar: React.FC<Props> = ({ classname }) => {
  const { data: chats = [], isLoading } = useOwnedChats();
  const { id: chatId } = useParams();
  const { isSignedIn, isLoaded } = useUser();
  const pathname = usePathname();
  const isTabletOrMobile = useMediaQuery({
    query: `(max-width: 777px)`,
  });

  const router = useRouter();

  const [open, setOpen] = useState(false);

  // console.log("isTabletOrMobile: ", isTabletOrMobile);

  const content = (
    <>
      {/* Header */}
      <div className="pt-4 mx-4 border-b border-gray-200/50 sticky top-0 bg-frost-white">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-linear-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
            <MessageCircle className="w-4 h-4 text-white" />
          </div>
          <div>
            <strong className="tracking-wide">AI Assistant</strong>
          </div>
        </div>
      </div>

      {/* Chat List Section*/}
      <div className="h-10 px-4 pt-2 flex flex-row items-center justify-between">
        <div>
          <strong className="tracking-wide">History</strong>
        </div>
        {pathname !== "/" && (
          <Button
            theme="borderless"
            icon={<Plus color="black" />}
            onClick={() => {
              router.push("/");
              setOpen(false);
            }}
          />
        )}
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
            <li className="p-8 text-center text-gray-500">
              No chats yet. Create one to get started! 🚀
            </li>
          ) : (
            chats.map((c) => {
              const cid = c.id;
              const isActive = chatId === cid;
              const title = c.title ?? "";

              return (
                <li key={cid}>
                  <Link
                    href={`/chat/${cid}`}
                    className={cn(
                      `group flex items-center space-x-3 p-3 rounded-2xl transition-all duration-200 ease-out`,
                      isActive
                        ? "bg-linear-to-r from-blue-500 to-blue-600 text-white font-semibold shadow-sm"
                        : "text-gray-700 hover:text-gray-900 hover:bg-white/60 hover:shadow-md", // isActive
                    )}
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
