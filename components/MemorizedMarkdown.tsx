import { marked } from "marked";
import React, { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { CodeBlock } from "react-code-block";
import { themes, Prism } from "prism-react-renderer";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw"; // optional — if you need raw HTML
import { Button } from "@douyinfe/semi-ui-19";
import { Clipboard, ClipboardCheck, Copy, Cross } from "lucide-react";
import { useCopyToClipboard } from "usehooks-ts";

(typeof global !== "undefined" ? global : window).Prism = Prism;

const loadCommonPrismLanguages = async () => {
  await Promise.all([
    import("prismjs/components/prism-markup"),
    import("prismjs/components/prism-css"),
    import("prismjs/components/prism-python"),
    import("prismjs/components/prism-java"),
    import("prismjs/components/prism-csharp"),
    import("prismjs/components/prism-cpp"),
    import("prismjs/components/prism-c"),
    import("prismjs/components/prism-go"),
    import("prismjs/components/prism-rust"),
    import("prismjs/components/prism-shell-session"),
    import("prismjs/components/prism-bash"),
    import("prismjs/components/prism-json"),
    import("prismjs/components/prism-yaml"),
    import("prismjs/components/prism-sql"),
    import("prismjs/components/prism-markdown"),
    import("prismjs/components/prism-http"),
  ]).catch((err) => {
    console.error(err);
  });
};

await loadCommonPrismLanguages();

function parseMarkdownIntoBlocks(markdown: string): string[] {
  const tokens = marked.lexer(markdown);
  return tokens.map((token) => token.raw);
}

const MemoizedMarkdownBlock = memo(
  ({ content }: { content: string }) => {
    const [copiedText, copy] = useCopyToClipboard();

    const handleCopy = (text: string) => {
      copy(text)
        .then(() => {
          console.log("Copied!", { text });
        })
        .catch((error) => {
          console.error("Failed to copy!", error);
        });
    };

    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        // rehypePlugins={[rehypeRaw]}
        components={{
          code: ({ children, className }) => {
            const match = /language-(\w+)/.exec(className || "");
            
            if (match) {
              console.log(String(children))
              const codeString = String(children).replace(/\n$/, "");
              if (codeString) {
                const lang = match[1];
                return (
                  <CodeBlock
                    code={codeString}
                    language={lang}
                    theme={themes.github}
                  >
                    <div className="relative overflow-auto my-1">
                      <CodeBlock.Code className="bg-gray-50 p-3 my-0! shadow rounded-lg">
                        <div className="table-row">
                          <CodeBlock.LineNumber className="table-cell pr-4 text-xs text-gray-400 text-right select-none" />
                          <CodeBlock.LineContent className="table-cell">
                            <CodeBlock.Token />
                          </CodeBlock.LineContent>
                        </div>
                      </CodeBlock.Code>

                      <Button
                        icon={copiedText ? <ClipboardCheck /> : <Clipboard />}
                        onClick={() => {
                          handleCopy(String(children));
                        }}
                        type="tertiary"
                        theme="borderless"
                        className="right-3 top-2 absolute shadow"
                      />
                    </div>
                  </CodeBlock>
                );
              }
            }
          },
        }}
      >
        {content}
      </ReactMarkdown>
    );
  },
  (prevProps, nextProps) => {
    if (prevProps.content !== nextProps.content) return false;
    return true;
  },
);

MemoizedMarkdownBlock.displayName = "MemoizedMarkdownBlock";

export const MemoizedMarkdown = memo(
  ({ content, id }: { content: string; id: string }) => {
    const blocks = useMemo(() => parseMarkdownIntoBlocks(content), [content]);

    return (
      <div className="prose lg:prose-lg">
        {blocks.map((block, index) => (
          <MemoizedMarkdownBlock content={block} key={`${id}-block_${index}`} />
        ))}
      </div>
    );
  },
);

MemoizedMarkdown.displayName = "MemoizedMarkdown";
