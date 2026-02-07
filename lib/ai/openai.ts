import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { tool } from "ai";

const baseURL = `https://dashscope.aliyuncs.com/compatible-mode/v1/`;

const openai = createOpenAICompatible({
  name: "qwen-plus",
  apiKey: process.env.OPENAI_API_KEY!,
  baseURL: baseURL,
});

const qwenPlus = openai("qwen-plus");

export { qwenPlus };
