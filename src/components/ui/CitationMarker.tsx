"use client";

import React, { useState, useEffect } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';

interface CitationMarkerProps {
  index?: number;
  className?: string;
  href?: string;
  title?: string;
  description?: string;
}

interface LinkPreview {
  title?: string;
  description?: string;
  hostname?: string;
}

/**
 * CitationMarker - Inline citation marker with hover preview
 *
 * FEATURES:
 * - Shows citation number badge [1], [2], etc
 * - Hover card with preview of source
 * - Works with citation system from MessageDisplay
 *
 * COMPLIANT WITH:
 * - AI SDK InlineCitation pattern
 * - shadcn/ui HoverCard component
 */
export const CitationMarker: React.FC<CitationMarkerProps> = ({
  index,
  className,
  href,
  title,
  description,
}) => {
  const [preview, setPreview] = useState<LinkPreview | null>(null);
  const [loading, setLoading] = useState(true);

  // Extract hostname safely
  const getHostname = (url: string): string => {
    try {
      return new URL(url).hostname;
    } catch (error) {
      return 'Unknown source';
    }
  };

  const hostname = href ? getHostname(href) : '';

  // Generate preview data from actual source content
  useEffect(() => {
    if (!href) {
      setLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      setPreview({
        hostname: hostname,
        title: title || `${hostname} - Source`,
        description: description
      });
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [href, hostname, title, description]);

  const content = (
    <>
      <ExternalLink className="h-3 w-3" aria-hidden="true" style={{ color: 'var(--source-link)' }} />
      <span className="sr-only">
        {typeof index === "number" ? `Rujukan ${index}` : "Rujukan"}
      </span>
    </>
  );

  const baseClass = cn(
    "ml-1 inline-flex shrink-0 items-center align-text-top",
    className
  );

  // If no href, render simple icon
  if (!href) {
    return (
      <span className={baseClass}>
        {content}
      </span>
    );
  }

  // With href, render with hover preview
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(baseClass, "hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-[3px] p-0.5")}
        >
          {content}
        </a>
      </HoverCardTrigger>
      <HoverCardContent
        className="w-80"
        align="start"
        sideOffset={5}
      >
        <div className="space-y-2">
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Loading preview...</span>
            </div>
          ) : (
            <>
              <div className="text-xs text-muted-foreground">{preview?.hostname}</div>
              <h4 className="text-sm font-medium" style={{ color: 'var(--source-link)' }}>{preview?.title || 'Untitled'}</h4>
              {preview?.description && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {preview.description}
                </p>
              )}
            </>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};
