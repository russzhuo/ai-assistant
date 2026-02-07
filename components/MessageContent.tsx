import WeatherCard from "./WeatherCard";
import UnsupportedMessagePart from "./UnsupportedMessagePart";
import { CurrentWeatherDisplay, DailyForecast } from "../lib/utils/whether";
import { WebSearchOutput } from "@/types/exa";
import WebSearchResults from "./WebSearchResults";
import { MemoizedMarkdown } from "./MemorizedMarkdown";
import { ToolPending } from "./ToolPending";
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
        } else if (process.env.NODE_ENV === "development") {
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
