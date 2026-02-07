import cn from "classnames";

interface ToolPendingProps {
  toolName: string; // e.g. "Web Search", "Weather"
  className?: string;
}

export function ToolPending({ toolName, className }: ToolPendingProps) {
  return (
    <div
      className={cn(
        "my-4 flex items-center gap-3 text-sm text-gray-500 italic",
        className,
      )}
    >
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-500 border-t-transparent" />
      {toolName ? `${toolName} in progress...` : "Processing..."}
    </div>
  );
}
