"use client";

import React from 'react';
import { cn } from '@/lib/utils';

type LoaderProps = {
  text?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  compact?: boolean;
};

export function Loader({ text = 'Memuat...', className, size = 'md', compact = false }: LoaderProps) {
  const dim = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-8 w-8' : 'h-5 w-5';
  const border = size === 'lg' ? 'border-2' : 'border';

  if (compact) {
    return (
      <span className={cn('inline-flex items-center gap-2 text-muted-foreground', className)}>
        <span className={cn('rounded-full animate-spin border-border border-t-primary', dim, border)} />
        <span className="text-sm">{text}</span>
      </span>
    );
  }

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div className="flex flex-col items-center gap-3">
        <div className={cn('rounded-full animate-spin border-border border-t-primary', dim, border)} />
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

export default Loader;

