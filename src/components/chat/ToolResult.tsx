'use client';

/**
 * ToolResult - Clean component for displaying tool execution results
 *
 * DESIGN COMPLIANCE:
 * - Uses semantic design tokens for status colors
 * - Consistent card styling with proper spacing
 * - Responsive design for mobile viewports
 * - Proper accessibility with status indicators
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ToolResultProps {
  toolName: string;
  result: any;
  status?: 'success' | 'error' | 'pending';
  className?: string;
}

export const ToolResult = ({
  toolName,
  result,
  status = 'success',
  className
}: ToolResultProps) => {
  const statusConfig = {
    success: {
      icon: '✅',
      text: 'Completed',
      variant: 'default' as const,
      className: 'text-green-600 dark:text-green-400'
    },
    error: {
      icon: '❌',
      text: 'Failed',
      variant: 'destructive' as const,
      className: 'text-red-600 dark:text-red-400'
    },
    pending: {
      icon: '⏳',
      text: 'Running',
      variant: 'secondary' as const,
      className: 'text-yellow-600 dark:text-yellow-400'
    }
  };

  const config = statusConfig[status];

  return (
    <Card className={cn('mt-3', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <span className="text-lg">🔧</span>
          <span className="font-medium">{toolName}</span>
          <Badge
            variant={config.variant}
            className={cn('ml-auto text-xs', config.className)}
          >
            <span className="mr-1">{config.icon}</span>
            {config.text}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        <pre className="whitespace-pre-wrap overflow-x-auto">
          {typeof result === 'string'
            ? result
            : JSON.stringify(result, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
};