"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { LinkWithPreview } from "./LinkWithPreview";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * MarkdownRenderer - Enhanced markdown parser dengan safety dan accessibility
 *
 * FRAMEWORK ANALYSIS:
 * - Uses ReactMarkdown (stable, mature library) instead of AI Elements Response
 * - AI Elements Response uses Streamdown which is newer but less feature-complete
 * - ReactMarkdown + remarkGfm provides superior GFM support (tables, strikethrough, task lists)
 * - Security: no raw HTML execution; links properly configured
 *
 * DESIGN COMPLIANCE:
 * - Uses cn() utility untuk consistent className handling
 * - Proper link safety dengan target="_blank" + rel="noopener noreferrer"
 * - Academic content optimized dengan GFM support
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = ""
}) => {
  return (
    <div className={cn(
      "prose prose-sm prose-gray dark:prose-invert max-w-none w-full",
      "prose-headings:text-foreground prose-headings:font-bold",
      "prose-p:text-foreground prose-p:leading-relaxed",
      "prose-strong:text-foreground prose-strong:font-bold",
      "prose-ul:text-foreground prose-ol:text-foreground",
      "prose-li:text-foreground",
      "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
      className
    )}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Enhanced link component untuk security dan UX
          a: ({ node, href, children, ...props }) => {
            // Extract link text and check if it's a source link
            const linkText = children?.toString() || '';
            const isSourceLink =
              linkText.includes('.com') ||
              linkText.includes('.org') ||
              linkText.includes('.net') ||
              linkText.match(/^\(.*\)$/) || // Text in parentheses
              href?.includes('reuters') ||
              href?.includes('bloomberg') ||
              href?.includes('cnbc');

            // Use LinkWithPreview for source links
            if (isSourceLink && href) {
              // Clean link text (remove parentheses if present)
              const cleanText = linkText.replace(/[()]/g, '');
              return (
                <LinkWithPreview
                  href={href}
                  className={props.className}
                >
                  {cleanText}
                </LinkWithPreview>
              );
            }

            // Default link rendering for non-source links
            return (
              <a
                {...props}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "text-primary hover:text-primary/80 underline transition-colors",
                  props.className
                )}
              >
                {children}
              </a>
            );
          },
          // Enhanced code block styling
          code: ({ node, inline, ...props }) => (
            <code
              {...props}
              className={cn(
                inline
                  ? "px-1 py-0.5 rounded-[3px] text-sm font-mono text-muted-foreground"
                  : "block p-2 rounded-[3px] text-sm overflow-x-auto font-mono text-muted-foreground border border-border",
                props.className
              )}
            />
          ),
          // Enhanced pre wrapper untuk code blocks
          pre: ({ node, ...props }) => (
            <pre
              {...props}
              className={cn("rounded-[3px] p-3 overflow-x-auto border border-border", props.className)}
            />
          ),
          // Headings dengan proper styling
          h1: ({ node, ...props }) => (
            <h1
              {...props}
              className={cn("text-2xl font-bold mb-4 mt-6 text-foreground", props.className)}
            />
          ),
          h2: ({ node, ...props }) => (
            <h2
              {...props}
              className={cn("text-xl font-bold mb-3 mt-5 text-foreground", props.className)}
            />
          ),
          h3: ({ node, ...props }) => (
            <h3
              {...props}
              className={cn("text-lg font-bold mb-2 mt-4 text-foreground", props.className)}
            />
          ),
          // Paragraphs dengan spacing
          p: ({ node, ...props }) => (
            <p
              {...props}
              className={cn(
                "mb-4 last:mb-0 text-foreground leading-relaxed w-full",
                props.className
              )}
            />
          ),
          // Lists dengan proper formatting
          ul: ({ node, ...props }) => (
            <ul
              {...props}
              className={cn(
                "list-disc pl-6 mb-4 last:mb-0 space-y-2 text-foreground",
                props.className
              )}
            />
          ),
          ol: ({ node, ...props }) => (
            <ol
              {...props}
              className={cn(
                "list-decimal pl-6 mb-4 last:mb-0 space-y-2 text-foreground",
                props.className
              )}
            />
          ),
          li: ({ node, ...props }) => (
            <li
              {...props}
              className={cn("text-foreground", props.className)}
            />
          ),
          // Bold text
          strong: ({ node, ...props }) => (
            <strong
              {...props}
              className={cn("font-bold text-foreground", props.className)}
            />
          ),
          // Italic text
          em: ({ node, ...props }) => (
            <em
              {...props}
              className={cn("italic text-foreground", props.className)}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
