"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Image from "next/image";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mt-8 mb-4 text-3xl font-bold text-primary">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-7 mb-3 text-2xl font-semibold text-primary">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-6 mb-2 text-xl font-semibold text-primary">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="mt-5 mb-2 text-lg font-medium text-primary">{children}</h4>
          ),
          p: ({ children }) => (
            <p className="mb-4 text-base leading-7 text-foreground">{children}</p>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-secondary underline hover:text-secondary/80"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="mb-4 ml-6 list-disc space-y-1 text-foreground">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-4 ml-6 list-decimal space-y-1 text-foreground">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-base leading-7">{children}</li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mb-4 border-l-4 border-secondary/40 pl-4 italic text-foreground/70">
              {children}
            </blockquote>
          ),
          code: ({ className, children }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="rounded bg-accent/30 px-1.5 py-0.5 text-sm font-mono text-primary">
                  {children}
                </code>
              );
            }
            return (
              <code className="block overflow-x-auto rounded-lg bg-primary/5 p-4 text-sm font-mono">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="mb-4 overflow-x-auto rounded-lg bg-primary/5 p-4 text-sm">
              {children}
            </pre>
          ),
          img: ({ src, alt }) => {
            if (!src || typeof src !== "string") return null;
            return (
              <span className="my-6 block">
                <Image
                  src={src}
                  alt={alt || ""}
                  width={800}
                  height={450}
                  className="rounded-lg"
                  style={{ width: "100%", height: "auto" }}
                  unoptimized
                />
              </span>
            );
          },
          hr: () => <hr className="my-8 border-accent" />,
          table: ({ children }) => (
            <div className="mb-4 overflow-x-auto">
              <table className="min-w-full border-collapse border border-accent/50 text-sm">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-accent/50 bg-accent/20 px-3 py-2 text-left font-semibold text-primary">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-accent/50 px-3 py-2 text-foreground">{children}</td>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-primary">{children}</strong>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
