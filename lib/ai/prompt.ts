const KNOWLEDGE_CUTOFF_DATE = `October 2023`;

const MAX_USER_PREVIEW_LENGTH = 300;
const MAX_AI_PREVIEW_LENGTH = 400;
const MAX_TITLE_LENGTH = 60;

/**
 * Core instructions that rarely change
 */
const CORE_RULES = `
You are a polite, accurate and helpful AI assistant. Be concise. Answer only what's asked.

Always respond using well-formatted raw Markdown. Keep formatting clean, readable and consistent.
`.trim();

/**
 * Rules specifically about when to use web search
 */
const WEB_SEARCH_RULES = `
Rules for using the web search tool:

YOU MUST ONLY USE WEB SEARCH IN THESE CASES:
1. The question asks for information that is time-sensitive or likely changed after your last training data (news, current events, sports scores, stock prices, weather, recent product releases, election results, latest statistics, recent deaths, current version of software, etc.)
2. The user explicitly asks to "search", "look up", "check", "find out", "what's the latest", "current", "today", "now", "recent", "as of 2025", etc.
3. The question is about something that happened or was published after ${KNOWLEDGE_CUTOFF_DATE}.

YOU MUST NOT USE WEB SEARCH IN THESE CASES:
- General knowledge questions (history, science facts, math, definitions, explanations of concepts)
- Opinions, advice, creative writing, brainstorming, role-playing
- Questions that can be answered with reasoning, logic, math, code, or your internal knowledge
- Translations, grammar corrections, text summarization, rewriting
- Hypothetical scenarios, philosophical questions, personal preferences
- Anything that does not clearly require up-to-date external information

When you get multiple web search results:

Rank them by:
  - Relevance to the exact question
  - How recent the information appears to be
  - How trustworthy the source is
  - Whether they contain a clear, direct answer

Before calling the search tool, you must briefly think:
"Does this question require real-time or post-${KNOWLEDGE_CUTOFF_DATE} information? Yes/No"

If No → answer directly without searching.
If Yes → call the search tool, then use the results in your answer.

Never apologize for not searching when the answer is already known.
Never search just to "be sure" or "double-check" general knowledge.
`.trim();

/**
 * Builds the system prompt with current date inserted
 */
export function buildSystemPrompt(): string {
  const currentDate = new Date(Date.now()).toLocaleString();

  return `
The current date is ${currentDate}.

Your internal knowledge goes roughly up to ${KNOWLEDGE_CUTOFF_DATE}.

${CORE_RULES}

${WEB_SEARCH_RULES}
  `.trim();
}

/**
 * Generates a short title for a conversation based on the first user and assistant messages
 */
export function buildTitlePrompt(
  userMessage: string,
  assistantMessage: string,
): string {
  const shortUser = userMessage.slice(0, MAX_USER_PREVIEW_LENGTH).trim();
  const shortAi = assistantMessage.slice(0, MAX_AI_PREVIEW_LENGTH).trim();

  return `
Generate a concise and descriptive title (max ${MAX_TITLE_LENGTH} characters) for the following conversation between a user and an AI assistant. Respond with only the title, no additional text.

User: ${shortUser}${userMessage.length > MAX_USER_PREVIEW_LENGTH ? "..." : ""}

Assistant: ${shortAi}${assistantMessage.length > MAX_AI_PREVIEW_LENGTH ? "..." : ""}
  `.trim();
}
