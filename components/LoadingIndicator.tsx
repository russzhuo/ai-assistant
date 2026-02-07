import cn from "classnames";

export default function LoadingIndicator() {
  return (
    <div className="flex justify-start">
      <div
        className={cn(
          "px-5 py-3.5 rounded-2xl rounded-bl-none bg-white border border-gray-200/70 shadow-sm",
          "text-gray-500 text-sm font-medium animate-pulse",
        )}
      >
        Thinking...
      </div>
    </div>
  );
}
