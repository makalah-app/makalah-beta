'use client';

/**
 * MessageEditor - Clean, reusable component for editing chat messages
 *
 * DESIGN COMPLIANCE:
 * - Uses Textarea component instead of raw textarea
 * - No inline styles - CSS-based auto-resize
 * - Follows AI SDK Elements + ShadCN patterns
 * - Mobile-first responsive design
 * - Proper accessibility with ARIA labels
 */

import React, { forwardRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { X, SendIcon } from 'lucide-react';

interface MessageEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const MessageEditor = forwardRef<HTMLDivElement, MessageEditorProps>(
  ({
    value,
    onChange,
    onSave,
    onCancel,
    placeholder = "Edit your message...",
    disabled = false,
    className
  }, ref) => {

    // Handle Escape key to cancel
    useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onCancel();
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }, [onCancel]);

    // Handle Enter + Cmd/Ctrl to save
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onSave();
      }
    };

    return (
      <div ref={ref} className={className}>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus
          variant="ghost"
          className="w-full resize-none border-0 p-0 shadow-none focus-visible:ring-0 field-sizing-content min-h-[1.5rem]"
        />

        {/* Action Buttons */}
        <div className="mt-2 flex gap-2 justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            disabled={disabled}
            aria-label="Cancel edit"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onSave}
            disabled={disabled || !value.trim()}
            aria-label="Save and regenerate"
            className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <SendIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }
);

MessageEditor.displayName = "MessageEditor";