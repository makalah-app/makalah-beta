"use client";

import React from "react";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface CitationMarkerProps {
  index?: number;
  className?: string;
  href?: string;
}

/**
 * CitationMarker - indikator kecil untuk menandai adanya rujukan
 * Menggunakan ikon external link dari lucide supaya konsisten dengan shadcn/ui.
 */
export const CitationMarker: React.FC<CitationMarkerProps> = ({
  index,
  className,
  href,
}) => {
  const content = (
    <>
      <ExternalLink className="h-3 w-3" aria-hidden="true" />
      <span className="sr-only">
        {typeof index === "number" ? `Rujukan ${index}` : "Rujukan"}
      </span>
    </>
  );

  const baseClass = cn(
    "ml-1 inline-flex shrink-0 items-center align-text-top text-muted-foreground",
    className
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(baseClass, "hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-[3px] p-0.5")}
      >
        {content}
      </a>
    );
  }

  return (
    <span className={baseClass}>
      {content}
    </span>
  );
};
