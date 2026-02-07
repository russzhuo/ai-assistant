import cn from "classnames";
import { MessageRow } from "@/types/supabase";
import MessageContent from "./MessageContent";

interface MessageBubbleProps {
  message: MessageRow;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "max-w-[82%] px-4 py-3 rounded-2xl text-[15px] leading-relaxed shadow-sm transition-all",
        isUser
          ? "user-message bg-linear-to-r from-blue-500 to-blue-600 text-white rounded-br-4xl"
          : "assistant-message bg-white text-gray-800 rounded-bl-4xl border border-gray-200/70",
      )}
    >
      <MessageContent message={message} />
    </div>
  );
};

export default MessageBubble;
