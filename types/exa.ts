import { ExaSearchResult } from "@exalabs/ai-sdk";

interface WebSearchOutput {
  requestId: string;
  resolvedSearchType: string;
  results: ExaSearchResult[];
  searchTime: number;
  costDollars: {
    total: number;
    search: { neural?: number };
    contents: { text?: number };
  };
}

export type { WebSearchOutput };
