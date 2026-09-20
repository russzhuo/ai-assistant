import {
  ChangeEventHandler,
  FormEventHandler,
  useEffect,
  useRef,
} from "react";
import { ArrowUp, ImagePlus, X } from "lucide-react";
import { Button } from "./Button";

export interface Attachment {
  id: string;
  name: string;
  mediaType: string;
  url: string;
}

interface Props {
  input: string;
  onChange: ChangeEventHandler<HTMLTextAreaElement>;
  inputAllowed: boolean;
  submitAllowed: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
  isStreaming: boolean;
  onStop: () => void;
  attachments?: Attachment[];
  onAddFiles?: (files: File[]) => void;
  onRemoveAttachment?: (id: string) => void;
}

const MessageInput: React.FC<Props> = ({
  onSubmit,
  input,
  onChange,
  inputAllowed,
  submitAllowed,
  isStreaming,
  onStop,
  attachments,
  onAddFiles,
  onRemoveAttachment,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canAttach = Boolean(onAddFiles && !isStreaming);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    autoResize();
  }, [input]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e);
    autoResize();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends, Shift+Enter makes a newline. Guard against IME composition
    // (e.g. confirming a Chinese candidate with Enter) so it doesn't send.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(e.clipboardData.items)
      .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((f): f is File => f !== null);

    if (files.length > 0) {
      e.preventDefault();
      onAddFiles?.(files);
    }
  };

  return (
    <div className="px-4 w-full border-t border-gray-200/70 bg-white/80 backdrop-blur-sm">
      <form onSubmit={onSubmit} className="mx-auto w-full max-w-3xl py-4">
        {attachments && attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {attachments.map((a) => (
              <div key={a.id} className="relative group">
                <img
                  src={a.url}
                  alt={a.name}
                  className="h-16 w-16 object-cover rounded-xl border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => onRemoveAttachment?.(a.id)}
                  aria-label={`Remove ${a.name}`}
                  className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-gray-700 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-3xl border border-gray-300/80 bg-white shadow-sm transition-all focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-200/50">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Ask anything…"
            disabled={!inputAllowed}
            rows={1}
            className="w-full resize-none px-5 pt-4 pb-1 bg-transparent text-gray-800 placeholder-gray-400 focus:outline-none text-base leading-relaxed max-h-48 overflow-y-auto disabled:opacity-60 disabled:cursor-not-allowed"
          />

          <div className="flex items-center justify-between px-3 pb-3">
            <div className="flex items-center">
              {canAttach && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []);
                      if (files.length) onAddFiles?.(files);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Attach image"
                    className="rounded-full"
                  >
                    <ImagePlus className="h-5 w-5" />
                  </Button>
                </>
              )}
            </div>

            {isStreaming ? (
              <Button variant="destructive" type="button" onClick={onStop}>
                Stop
              </Button>
            ) : (
              <button
                type="submit"
                disabled={!submitAllowed}
                aria-label="Send message"
                className="h-10 w-10 inline-flex items-center justify-center rounded-full bg-blue-600 text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                <ArrowUp className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export { MessageInput };
