'use client';

/**
 * SystemMessage - Component untuk rendering system messages dalam chat
 *
 * MIGRATED TO SHADCN/UI:
 * - Uses shadcn/ui Alert components untuk consistent system messaging
 * - Preserves message type detection dan visual hierarchy
 * - Enhanced dengan proper icons dan styling variants
 *
 * DESIGN COMPLIANCE:
 * - shadcn/ui Alert patterns dengan contextual variants
 * - Proper visual hierarchy untuk system notifications
 * - Accessible messaging dengan appropriate semantics
 */

import React from 'react';
import type { UIMessage } from 'ai';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';

interface SystemMessageProps {
  message: UIMessage;
  className?: string;
  debugMode?: boolean;
}

export const SystemMessage: React.FC<SystemMessageProps> = ({
  message,
  className = '',
  debugMode = false,
}) => {
  // Extract text content from message parts
  const textParts = message.parts.filter(part => part.type === 'text');
  const textContent = textParts.map(part => part.text).join(' ');

  // Enhanced message type detection dengan icons
  const getMessageTypeInfo = (content: string) => {
    if (content.toLowerCase().includes('error') || content.toLowerCase().includes('gagal')) {
      return {
        type: 'ERROR',
        variant: 'destructive' as const,
        icon: '❌',
        badgeVariant: 'destructive' as const
      };
    }
    if (content.toLowerCase().includes('berhasil') || content.toLowerCase().includes('sukses')) {
      return {
        type: 'SUCCESS',
        variant: 'default' as const,
        icon: '✅',
        badgeVariant: 'default' as const
      };
    }
    if (content.toLowerCase().includes('warning') || content.toLowerCase().includes('peringatan')) {
      return {
        type: 'WARNING',
        variant: 'default' as const,
        icon: '⚠️',
        badgeVariant: 'secondary' as const
      };
    }
    return {
      type: 'INFO',
      variant: 'default' as const,
      icon: 'ℹ️',
      badgeVariant: 'outline' as const
    };
  };

  const messageInfo = getMessageTypeInfo(textContent);

  return (
    <div className={cn('my-4', className)}>
      <Alert variant={messageInfo.variant} className="border-dashed">
        <AlertDescription>
          <div className="flex items-start gap-3">
            {/* Icon & Type Badge */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-lg">{messageInfo.icon}</span>
              <Badge variant={messageInfo.badgeVariant} className="text-xs">
                {messageInfo.type}
              </Badge>
            </div>

            {/* Message Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-relaxed">
                {textContent}
              </p>

              {/* Timestamp */}
              {(message.metadata as any)?.timestamp && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date((message.metadata as any).timestamp).toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default SystemMessage;
