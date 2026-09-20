import WeatherCard from "./WeatherCard";
import UnsupportedMessagePart from "./UnsupportedMessagePart";
import { CurrentWeatherDisplay, DailyForecast } from "../lib/utils/whether";
import { WebSearchOutput } from "@/types/exa";
import WebSearchResults from "./WebSearchResults";
import { MemoizedMarkdown } from "./MemorizedMarkdown";
import { ToolPending } from "./ToolPending";
import ReasoningDisplay from "./ReasoningDisplay";
import { UIMessage } from "ai";

interface MessageContentProps {
  message: UIMessage;
}

export default function MessageContent({ message }: MessageContentProps) {
  return (
    <>
      {message.parts.map((part, index) => {
        const type = part.type;

        if (type === "text") {
          return (
            <MemoizedMarkdown
              key={`${message.id}-text-${index}`}
              id={message.id}
              content={part.text}
            />
          );
        } else if (type === "file") {
          const isImage =
            part.mediaType === "image" ||
            part.mediaType?.startsWith("image/");

          if (isImage) {
            return (
              <img
                key={`${message.id}-file-${index}`}
                src={part.url}
                alt={part.filename ?? "attachment"}
                className="max-w-full sm:max-w-sm max-h-80 w-auto object-contain rounded-xl border border-gray-200 my-2"
              />
            );
          }

          return (
            <a
              key={`${message.id}-file-${index}`}
              href={part.url}
              download={part.filename}
              className="inline-block my-2 px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-700 hover:bg-gray-100"
            >
              {part.filename ?? "Attachment"}
            </a>
          );
        } else if (type === "step-start") {
          if (index > 0) {
            return (
              <div
                key={`${message.id}-step-${index}`}
                className="text-gray-500"
              >
                <hr className="my-2 border-gray-300" />
              </div>
            );
          }
        } else if (type === "tool-weather") {
          const state = part.state;
          if (state === "output-available") {
            const output = part.output as {
              current: CurrentWeatherDisplay;
              forecast: DailyForecast[];
            };

            return (
              <WeatherCard
                key={`${message.id}-weather`}
                current={output.current}
                forecast={output.forecast}
              />
            );
          } else if (state === "input-available") {
            return (
              <ToolPending
                toolName="WeatherSearch"
                key={`${message.id}-weathersearch-pending`}
              />
            );
          }
        } else if (type === "tool-webSearch") {
          const state = part.state;
          if (state === "output-available") {
            const output = part.output as WebSearchOutput;

            return (
              <WebSearchResults
                key={`${message.id}-websearch`}
                summary={output.results?.at(0)?.summary ?? ""}
                results={output.results ?? []}
                messageId={message.id}
              />
            );
          } else if (state === "input-available") {
            return (
              <ToolPending
                toolName="WebSearch"
                key={`${message.id}-websearch-pending`}
              />
            );
          }
        } else if (type === "reasoning") {
          return (
            <ReasoningDisplay
              key={`${message.id}-reasoning-${part.id ?? index}`}
              text={part.text}
              state={part.state}
            />
          );
        } else if (process.env.NODE_ENV === "development") {
          console.log(`Unsupported message part type: ${type}`, part);
        
          return (
            <UnsupportedMessagePart
              key={`${message.id}-unsupported-${index}`}
              part={part}
            />
          );
        }

        return null;
      })}
    </>
  );
}
