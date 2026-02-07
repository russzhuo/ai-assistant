import MessageBubble from "./MessageBubble";
import { UIMessage } from "ai";
import cn from "classnames";

type MessageItemProps = {
  message: UIMessage;
};

export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <MessageBubble message={message} />
    </div>
  );
};
