// src/components/chat/WebSearchResults.tsx
import Link from "next/link";
import { MemoizedMarkdown } from "./MemorizedMarkdown";
import { ExaSearchResult } from "@exalabs/ai-sdk";

interface WebSearchResultsProps {
  summary: string;
  results: ExaSearchResult[];
  messageId: string;
}

export default function WebSearchResults({
  summary,
  results,
  messageId,
}: WebSearchResultsProps) {
  return (
    <div className="my-6 rounded-xl bg-card/50 border border-gray-200/70 bg-frost-white">
      <div className="border-b border-gray-200/70 px-4 py-3 bg-muted/40">
        <div className="flex items-center gap-2.5">
          <strong>Web Search Results</strong>
        </div>
      </div>

      <div className="p-4">
        <MemoizedMarkdown id={messageId} content={summary} />

        {results.length > 0 ? (
          <div className="mt-5 space-y-3">
            {results.map((item, i) => (
              <Link
                key={i}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:bg-white hover:-translate-y-0.5 hover:shadow-md bg-white/85 group block rounded-lg p-3.5 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {item.favicon && (
                    <img
                      src={item.favicon}
                      alt=""
                      className="mt-1 h-5 w-5 shrink-0 rounded object-contain"
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  )}

                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
                      {item.title}
                    </h4>

                    <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
                      {item.text ||
                        "No preview available"}
                    </p>

                    <div className="mt-1.5 text-xs text-muted-foreground/75 truncate">
                      {item.url}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground italic">
            No search results found
          </div>
        )}
      </div>
    </div>
  );
}
