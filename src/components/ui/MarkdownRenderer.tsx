"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

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
    <div className={cn("prose prose-gray dark:prose-invert max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Enhanced link component untuk security dan UX
          a: ({ node, ...props }) => (
            <a
              {...props}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "text-primary hover:text-primary/80 underline transition-colors",
                props.className
              )}
            />
          ),
          // Enhanced code block styling
          code: ({ node, inline, ...props }) => (
            <code
              {...props}
              className={cn(
                inline
                  ? "px-1 py-0.5 bg-muted rounded-[3px] text-sm"
                  : "block p-2 bg-muted rounded-[3px] text-sm overflow-x-auto",
                props.className
              )}
            />
          ),
          // Enhanced pre wrapper untuk code blocks
          pre: ({ node, ...props }) => (
            <pre
              {...props}
              className={cn("bg-muted rounded-[3px] p-3 overflow-x-auto", props.className)}
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

