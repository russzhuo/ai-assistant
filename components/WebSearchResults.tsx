"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Globe } from "lucide-react";
import { ExaSearchResult } from "@exalabs/ai-sdk";

interface WebSearchResultsProps {
  results: ExaSearchResult[];
}

const getDomain = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

export default function WebSearchResults({ results }: WebSearchResultsProps) {
  const [open, setOpen] = useState(false);

  if (results.length === 0) return null;

  return (
    <div className="my-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
      >
        <Globe className="h-4 w-4" />
        Sources ({results.length})
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <ol className="mt-2 space-y-1">
          {results.map((item, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <span className="w-4 shrink-0 text-right text-xs text-gray-400">
                {i + 1}.
              </span>
              {item.favicon ? (
                <img
                  src={item.favicon}
                  alt=""
                  className="h-4 w-4 shrink-0 rounded object-contain"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              ) : (
                <Globe className="h-4 w-4 shrink-0 text-gray-300" />
              )}
              <Link
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                title={item.title}
                className="truncate text-blue-600 hover:underline"
              >
                {getDomain(item.url)}
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
