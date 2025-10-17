'use client';

import React from 'react';
import { useArtifacts } from '@ai-sdk-tools/artifacts/client';
import { AcademicAnalysisRenderer } from './AcademicAnalysisRenderer';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ArtifactPanelProps {
  className?: string;
  isPanelVisible: boolean;  // ✅ NEW: Controlled visibility state
  onClose: () => void;      // ✅ NEW: Close callback
  onMinimize: () => void;   // ✅ NEW: Minimize callback
}

/**
 * ArtifactPanel - Right-side panel untuk artifact display
 *
 * Features:
 * - Auto-show saat artifact streaming dimulai
 * - Collapse/expand functionality
 * - Responsive layout
 * - Smooth slide-in animation
 */
export function ArtifactPanel({
  className,
  isPanelVisible,  // ✅ NEW: Destructure new prop
  onClose,         // ✅ NEW: Destructure callback
  onMinimize       // ✅ NEW: Destructure callback
}: ArtifactPanelProps) {
  const { current, latest } = useArtifacts();
  const [isExpanded, setIsExpanded] = React.useState(true);
  // ❌ REMOVED: const [isVisible, setIsVisible] = React.useState(false);

  // ✅ UPDATED: Auto-expand when panel becomes visible
  React.useEffect(() => {
    if (isPanelVisible && current) {
      setIsExpanded(true);
    }
  }, [isPanelVisible, current]);

  // ✅ UPDATED: Notify parent via callback
  const handleClose = () => {
    onClose();  // ✅ Call parent callback
    // Reset expanded state after animation
    setTimeout(() => {
      setIsExpanded(true);
    }, 300);
  };

  // ✅ NEW: Minimize handler (notify parent)
  const handleMinimize = () => {
    onMinimize();  // ✅ Call parent callback
    // Reset expanded state after animation
    setTimeout(() => {
      setIsExpanded(true);
    }, 300);
  };

  // ✅ DEFENSIVE: Don't render if artifact exists but has no valid content
  const hasValidContent = current && (
    current.type === 'academic-analysis'
      ? (latest['academic-analysis'] &&
         (latest['academic-analysis'].sections?.length > 0 ||
          latest['academic-analysis'].title ||
          current.status === 'streaming'))  // ✅ Allow streaming artifacts
      : true  // ✅ Default allow untuk artifact types lain
  );

  // ✅ UPDATED: Don't render if no valid content AND panel not visible
  if (!hasValidContent && !isPanelVisible) {
    return null;
  }

  return (
    <>
      {/* Mobile backdrop */}
      {isPanelVisible && (  // ✅ UPDATED: Use prop
        <div
          className="fixed inset-0 bg-black/50 lg:hidden z-30"
          onClick={handleClose}
          aria-label="Close artifact panel"
        />
      )}

      <div
        className={cn(
          "fixed right-0 top-0 h-screen bg-background border-l border-muted",
          "transition-all duration-300 ease-in-out",
          // Desktop: 40% width
          isPanelVisible && isExpanded ? "lg:w-[40%]" : "w-0",  // ✅ UPDATED
          // Mobile: Full width overlay
          isPanelVisible && isExpanded ? "w-full lg:w-[40%]" : "w-0",  // ✅ UPDATED
          "overflow-hidden",
          "z-40",
          // Mobile overlay effect
          "lg:relative absolute",
          // Slide animations
          isPanelVisible ? "animate-slide-in-right" : "animate-slide-out-right",  // ✅ UPDATED
          className
        )}
      >
      {/* Panel Header */}
      <div className="flex items-center justify-between p-4 border-b border-muted">
        <h3 className="font-semibold text-sm">Artifact</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleMinimize}  // ✅ UPDATED: Use new handler
            aria-label="Minimize panel"  // ✅ UPDATED: More accurate label
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleClose}
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Panel Content */}
      <div className="h-[calc(100vh-64px)] overflow-y-auto p-4">
        {current && (
          <>
            {/* Render based on artifact type */}
            {current.type === 'academic-analysis' && latest['academic-analysis'] && (
              <AcademicAnalysisRenderer
                artifact={latest['academic-analysis'] as any}
              />
            )}

            {/* Add other artifact renderers here */}
            {/* Future: SectionDraftRenderer, PaperOutlineRenderer, etc. */}
          </>
        )}
      </div>
    </div>
    </>
  );
}
