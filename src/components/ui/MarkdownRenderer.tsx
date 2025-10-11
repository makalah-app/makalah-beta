"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { CitationMarker } from "./CitationMarker";

interface MarkdownRendererProps {
  content: string;
  className?: string;
  citationMap?: Record<string, { index: number }>;
  citationTargets?: Record<number, { url?: string; title?: string; snippet?: string }>;
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
  className = "",
  citationMap,
  citationTargets,
}) => {
  const hasCitationMap = citationMap && Object.keys(citationMap).length > 0;
  let paragraphCounter = 0;

  /**
   * Extract text content from React children
   * Handles strings, arrays, and React elements properly
   */
  const extractTextContent = (children: React.ReactNode): string => {
    if (!children) return '';

    // If it's a string, return it
    if (typeof children === 'string') return children;

    // If it's a number, convert to string
    if (typeof children === 'number') return String(children);

    // If it's an array, process each child recursively
    if (Array.isArray(children)) {
      return children.map(extractTextContent).join('');
    }

    // If it's a React element, try to extract from props.children
    if (typeof children === 'object' && children !== null) {
      const element = children as any;
      if (element.props?.children) {
        return extractTextContent(element.props.children);
      }
    }

    // Fallback to empty string for other types
    return '';
  };

  const transformTextWithCitations = (text: string, keySeed: string): React.ReactNode[] => {
    if (!hasCitationMap) return [text];
    if (!text.includes('{{citation:')) return [text];

    const nodes: React.ReactNode[] = [];
    const regex = /\{\{citation:(\d+)\}\}/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const start = match.index;
      const end = regex.lastIndex;

      if (start > lastIndex) {
        nodes.push(text.slice(lastIndex, start));
      }

      const index = Number.parseInt(match[1], 10);
      const citationData = citationTargets?.[index];

      nodes.push(
        <CitationMarker
          key={`citation-${keySeed}-${index}-${start}`}
          index={index}
          href={citationData?.url}
          title={citationData?.title}
          description={citationData?.snippet}
        />
      );

      lastIndex = end;
    }

    if (lastIndex < text.length) {
      nodes.push(text.slice(lastIndex));
    }

    return nodes.length ? nodes : [text];
  };

  const transformParagraphChildren = (children: React.ReactNode[], keySeed: number) => {
    if (!hasCitationMap) {
      return children;
    }

    return React.Children.toArray(children).reduce<React.ReactNode[]>(
      (acc, child, childIndex) => {
        if (typeof child === "string") {
          acc.push(
            ...transformTextWithCitations(child, `${keySeed}-${childIndex}`)
          );
        } else {
          acc.push(child);
        }
        return acc;
      },
      []
    );
  };

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
          // Standard link rendering with security
          a: ({ node, href, children, ...props }) => {
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
          code: ({ node, ...props }: any) => {
            const inline = !('children' in props && Array.isArray(props.children) && props.children.some((child: any) => typeof child === 'string' && child.includes('\n')));
            return (
            <code
              {...props}
              className={cn(
                inline
                  ? "px-1 py-0.5 rounded-[3px] text-sm font-mono text-muted-foreground"
                  : "block p-2 rounded-[3px] text-sm overflow-x-auto font-mono text-muted-foreground border border-border",
                props.className
              )}
            />
            );
          },
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
          p: ({ node, ...props }) => {
            const { className: paragraphClassName, children, ...rest } = props as {
              className?: string;
              children?: React.ReactNode;
            };
            const keySeed = paragraphCounter++;
            const processedChildren = transformParagraphChildren(
              React.Children.toArray(children ?? []),
              keySeed
            );

            return (
              <p
                {...rest}
                className={cn(
                  "mb-4 last:mb-0 text-foreground leading-relaxed w-full",
                  paragraphClassName
                )}
              >
                {processedChildren}
              </p>
            );
          },
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
          li: ({ node, ...props }) => {
            const { className: liClassName, children, ...rest } = props as {
              className?: string;
              children?: React.ReactNode;
            };
            const keySeed = paragraphCounter++;
            const processedChildren = transformParagraphChildren(
              React.Children.toArray(children ?? []),
              keySeed
            );

            return (
              <li
                {...rest}
                className={cn("text-foreground", liClassName)}
              >
                {processedChildren}
              </li>
            );
          },
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
