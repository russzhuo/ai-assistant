import MessageBubble from "./MessageBubble";
import { UIMessage } from "ai";
import cn from "classnames";

type MessageItemProps = {
  message: UIMessage;
  interrupted?: boolean;
  onContinue?: () => void;
  onDiscard?: () => void;
  continueDisabled?: boolean;
};

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  interrupted = false,
  onContinue,
  onDiscard,
  continueDisabled = false,
}) => {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <MessageBubble
        message={message}
        interrupted={interrupted}
        onContinue={onContinue}
        onDiscard={onDiscard}
        continueDisabled={continueDisabled}
      />
    </div>
  );
};
