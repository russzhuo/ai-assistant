import cn from "classnames";
import MessageContent from "./MessageContent";
import { Button } from "./Button";
import { UIMessage } from "ai";

interface MessageBubbleProps {
  message: UIMessage;
  showContinue?: boolean;
  onContinue?: () => void;
  onDiscard?: () => void;
  continueDisabled?: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  showContinue = false,
  onContinue,
  onDiscard,
  continueDisabled = false,
}) => {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "max-w-[82%] px-4 py-3 rounded-2xl text-[15px] leading-relaxed shadow-sm transition-all",
        isUser
          ? "user-message bg-linear-to-r from-blue-500 to-blue-600 text-white rounded-br-4xl"
          : "assistant-message bg-white text-gray-800 rounded-bl-4xl border border-gray-200/70",
        showContinue && !isUser && "border-amber-300 ring-1 ring-amber-200",
      )}
    >
      <MessageContent message={message} />

      {showContinue && !isUser && onContinue && (
        <div className="mt-3 pt-3 border-t border-amber-200/80 flex flex-col gap-2">
          <p className="text text-amber-700">
            Connection lost — reply truncated. Partial content kept.
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onContinue}
              disabled={continueDisabled}
            >
              Continue the reply
            </Button>
            {onDiscard && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={onDiscard}
                disabled={continueDisabled}
              >
                Discard
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
