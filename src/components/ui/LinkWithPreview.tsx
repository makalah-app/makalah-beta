'use client';

/**
 * LinkWithPreview - Enhanced link component dengan hover preview
 *
 * FEATURES:
 * - Hover card dengan preview content
 * - Visual indicator dengan ExternalLink icon
 * - Smart URL validation dan hostname extraction
 * - Consistent styling dengan existing design system
 *
 * DESIGN COMPLIANCE:
 * - Uses shadcn/ui HoverCard component
 * - text-primary color scheme (orange)
 * - No hardcoded styling, utility classes only
 * - TypeScript safe dengan proper error handling
 */

import React, { useState, useEffect } from 'react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { ExternalLink, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LinkWithPreviewProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

interface LinkPreview {
  title?: string;
  description?: string;
  image?: string;
  hostname?: string;
}

export const LinkWithPreview: React.FC<LinkWithPreviewProps> = ({
  href,
  children,
  className
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

  const hostname = getHostname(href);

  // Simulated preview data (in production, this would fetch from API)
  useEffect(() => {
    const timer = setTimeout(() => {
      // Generate preview based on hostname for demo
      const getPreviewData = (hostname: string): LinkPreview => {
        if (hostname.includes('reuters')) {
          return {
            title: 'Reuters - Breaking International News & Views',
            description: 'Reuters provides business, financial, national and international news to professionals via desktop terminals, the world\'s media organizations, industry events and directly to consumers.',
            hostname: hostname
          };
        } else if (hostname.includes('bloomberg')) {
          return {
            title: 'Bloomberg - Business & Financial News',
            description: 'Bloomberg delivers business and markets news, data, analysis, and video to the world, featuring stories from Businessweek and Bloomberg News.',
            hostname: hostname
          };
        } else if (hostname.includes('cnbc')) {
          return {
            title: 'CNBC - Business News & Analysis',
            description: 'Find the latest business news on Wall Street, jobs and the economy, the housing market, personal finance and money investments.',
            hostname: hostname
          };
        } else {
          return {
            title: `${hostname} - News & Information`,
            description: 'Stay informed with the latest news and updates.',
            hostname: hostname
          };
        }
      };

      setPreview(getPreviewData(hostname));
      setLoading(false);
    }, 300); // Small delay to simulate loading

    return () => clearTimeout(timer);
  }, [href, hostname]);

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "text-primary hover:text-primary/80 underline transition-colors inline-flex items-center gap-1",
            className
          )}
        >
          {children}
          <ExternalLink className="h-3 w-3" />
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
              <h4 className="text-sm font-medium">{preview?.title || 'Untitled'}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {preview?.description || 'No description available.'}
              </p>
            </>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};