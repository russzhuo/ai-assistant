import { MessageRow } from "@/types/supabase";
import cn from "classnames";
import MessageContent from "./MessageContent";
import MessageBubble from "./MessageBubble";

type MessageItemProps = {
  message: MessageRow;
};

export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <MessageBubble message={message} />
    </div>
  );
};
