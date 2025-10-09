'use client';

/**
 * WorkflowArtifactDisplay - Collapsed/expandable display for workflow artifacts
 *
 * Task 2.2: Implements user-facing artifact display with shadcn/ui Collapsible
 *
 * Features:
 * - Collapsed by default for cleaner UI
 * - Expandable via button click (keyboard accessible)
 * - Displays formatted artifact text from Task 2.1 formatter
 * - Monospace font for structured text readability
 * - Mobile-friendly (no horizontal scroll)
 *
 * Integration: Renders below assistant messages in MessageDisplay.tsx
 */

import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { formatWorkflowArtifact } from '@/lib/ai/workflow-artifact-formatter';
import type { WorkflowMetadata } from '@/lib/types/academic-message';
import { cn } from '@/lib/utils';

export interface WorkflowArtifactDisplayProps {
  /** Workflow metadata containing phase, progress, artifacts, timestamp */
  metadata: WorkflowMetadata;
  /** Optional className for custom styling */
  className?: string;
}

/**
 * WorkflowArtifactDisplay Component
 *
 * Displays workflow state as collapsed/expandable text summary
 *
 * @param metadata - Workflow metadata from message.metadata
 * @param className - Optional Tailwind classes
 */
export function WorkflowArtifactDisplay({
  metadata,
  className
}: WorkflowArtifactDisplayProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  // Format artifact text using Task 2.1 formatter
  const artifactText = formatWorkflowArtifact(metadata);

  return (
    <div className={cn('mt-3 border-t border-border/40 pt-2', className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground w-full justify-start px-0 h-auto py-1"
            aria-expanded={isOpen}
            aria-label={isOpen ? 'Sembunyikan status workflow' : 'Tampilkan status workflow'}
          >
            {isOpen ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                <span>Sembunyikan status workflow</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                <span>Tampilkan status workflow</span>
              </>
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-2">
          <pre className="p-3 bg-muted/30 rounded-md text-xs font-mono text-foreground/90 whitespace-pre-wrap overflow-x-auto">
            {artifactText}
          </pre>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
