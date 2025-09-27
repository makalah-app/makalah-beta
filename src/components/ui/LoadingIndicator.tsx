'use client';

/**
 * LoadingIndicator - Reusable loading state component
 *
 * MIGRATED TO AI ELEMENTS:
 * - Uses AI Elements Loader component for consistent spinner animation
 * - Preserves different loading states dan customization options
 * - Integrates dengan shadcn/ui styling patterns
 *
 * DESIGN COMPLIANCE:
 * - AI Elements styling dengan shadcn/ui base components
 * - Multiple loading states dengan consistent animations
 * - Academic platform design patterns preserved
 */

import React from 'react';
import { Loader } from '../ai-elements/loader';
import { cn } from '@/lib/utils';

interface LoadingIndicatorProps {
  message?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  type?: 'spinner' | 'dots' | 'pulse';
  className?: string;
  showMessage?: boolean;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  message = 'Loading...',
  size = 'md',
  type = 'spinner',
  className = '',
  showMessage = true,
}) => {
  const getLoaderSize = () => {
    switch (size) {
      case 'xs':
        return 12;
      case 'sm':
        return 16;
      case 'lg':
        return 32;
      default:
        return 24;
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'xs':
        return 'text-xs';
      case 'sm':
        return 'text-sm';
      case 'lg':
        return 'text-lg';
      default:
        return 'text-base';
    }
  };

  const getDotSize = () => {
    switch (size) {
      case 'xs':
        return 'size-1';
      case 'sm':
        return 'size-1.5';
      case 'lg':
        return 'size-3';
      default:
        return 'size-2';
    }
  };

  const renderDots = () => (
    <div className="dots flex space-x-1">
      <div
        className={cn(
          'rounded-full bg-primary animate-bounce',
          getDotSize()
        )}
        style={{ animationDelay: '0ms' }}
      />
      <div
        className={cn(
          'rounded-full bg-primary animate-bounce',
          getDotSize()
        )}
        style={{ animationDelay: '150ms' }}
      />
      <div
        className={cn(
          'rounded-full bg-primary animate-bounce',
          getDotSize()
        )}
        style={{ animationDelay: '300ms' }}
      />
    </div>
  );

  const getPulseSize = () => {
    switch (size) {
      case 'xs':
        return 'size-3';
      case 'sm':
        return 'size-4';
      case 'lg':
        return 'size-8';
      default:
        return 'size-6';
    }
  };

  const renderPulse = () => (
    <div
      className={cn(
        'rounded-full bg-primary animate-pulse',
        getPulseSize()
      )}
    />
  );

  const renderIndicator = () => {
    switch (type) {
      case 'spinner':
        return <Loader size={getLoaderSize()} />;
      case 'pulse':
        return renderPulse();
      case 'dots':
        return renderDots();
      default:
        return <Loader size={getLoaderSize()} />;
    }
  };

  return (
    <div className={cn(
      'flex items-center gap-3 text-muted-foreground',
      getSizeClasses(),
      className
    )}>
      {renderIndicator()}
      {showMessage && (
        <span>{message}</span>
      )}
    </div>
  );
};

export default LoadingIndicator;