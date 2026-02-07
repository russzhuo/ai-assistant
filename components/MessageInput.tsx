import { ChangeEventHandler, FormEventHandler } from "react";
import { Button } from "./Button";
import cn from "classnames";

interface Props {
  input: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  inputAllowed: boolean;
  submitAllowed: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
}

const MessageInput: React.FC<Props> = ({
  onSubmit,
  input,
  onChange,
  inputAllowed,
  submitAllowed,
}) => {
  return (
    <div
      className={cn(
        "px-4 w-full border-t border-gray-200/70 bg-white/80 backdrop-blur-sm",
      )}
    >
      <form
        onSubmit={onSubmit}
        className="mx-auto w-full max-w-4xl py-4 flex gap-3"
      >
        <input
          value={input}
          onChange={onChange}
          placeholder="Ask anything..."
          disabled={!inputAllowed}
          className={cn(
            "flex-1 px-5 py-3.5 bg-white border border-gray-300 rounded-2xl",
            "text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200/50",
            "transition-all duration-200 shadow-sm",
            !inputAllowed && "opacity-60 cursor-not-allowed",
          )}
        />

        <Button variant="primary" type="submit" disabled={!submitAllowed}>
          Send
        </Button>
      </form>
    </div>
  );
};

export { MessageInput };
