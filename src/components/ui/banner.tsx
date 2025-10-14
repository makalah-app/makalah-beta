/**
 * Banner - shadcn/ui-style alert component
 * Used for error banners in chat interface
 *
 * Follows shadcn/ui design patterns:
 * - Variant-based styling (error, warning, info)
 * - Consistent spacing and rounded corners
 * - Optional retry and dismiss actions
 */

import * as React from 'react';
import { X, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BannerProps {
  variant?: 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

const variantStyles = {
  error: 'bg-destructive/10 text-destructive border-destructive/20',
  warning: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  info: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
};

export function Banner({
  variant = 'error',
  title,
  message,
  onRetry,
  onDismiss,
  className,
}: BannerProps) {
  return (
    <div
      className={cn(
        'rounded border p-4 flex items-start gap-3',
        variantStyles[variant],
        className
      )}
    >
      <div className="flex-1">
        {title && <div className="font-medium mb-1">{title}</div>}
        <div className="text-sm">{message}</div>
      </div>
      <div className="flex items-center gap-2">
        {onRetry && (
          <button
            onClick={onRetry}
            className="p-1 hover:bg-black/5 rounded transition-colors"
            aria-label="Retry"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 hover:bg-black/5 rounded transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
