import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { ArtifactData } from '@ai-sdk-tools/artifacts/client';

interface ArtifactCardProps {
  artifact: ArtifactData<any>;
  children: React.ReactNode;
}

/**
 * Base Artifact Card Component
 *
 * Wraps artifact content with status indicators, progress bar, and error handling.
 * Used by specific artifact renderers (AcademicAnalysisRenderer, etc.)
 */
export function ArtifactCard({ artifact, children }: ArtifactCardProps) {
  // Status icon mapping
  const getStatusIcon = () => {
    if (artifact.error) {
      return <AlertCircle className="h-5 w-5 text-destructive" />;
    }
    if (artifact.status === 'complete') {
      return <CheckCircle2 className="h-5 w-5 text-success-600" />;
    }
    if (artifact.status === 'loading' || artifact.status === 'streaming') {
      return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
    }
    return null;
  };

  // Status badge variant
  const getStatusBadge = () => {
    if (artifact.error) {
      return <Badge variant="destructive">Error</Badge>;
    }
    if (artifact.status === 'complete') {
      return <Badge className="bg-success-600 hover:bg-success-700">Complete</Badge>;
    }
    if (artifact.status === 'streaming') {
      return <Badge variant="secondary">Streaming...</Badge>;
    }
    if (artifact.status === 'loading') {
      return <Badge variant="secondary">Loading...</Badge>;
    }
    return null;
  };

  return (
    <Card className="w-full border-muted bg-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <CardTitle className="text-lg font-semibold">
              {artifact.payload?.title || 'Artifact'}
            </CardTitle>
          </div>
          {getStatusBadge()}
        </div>

        {/* Progress bar for ALL streaming states */}
        {(artifact.status === 'loading' || artifact.status === 'streaming') && artifact.progress !== undefined && (
          <div className="mt-3 space-y-1">
            <Progress value={artifact.progress * 100} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {Math.round(artifact.progress * 100)}% complete
            </p>
          </div>
        )}

        {/* Stage indicator */}
        {artifact.status === 'streaming' && artifact.payload?.stage && (
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>
              {artifact.payload.stage === 'loading' && 'Memuat...'}
              {artifact.payload.stage === 'processing' && 'Memproses...'}
              {artifact.payload.stage === 'drafting' && 'Menulis konten...'}
            </span>
          </div>
        )}

        {/* Error display */}
        {artifact.error && (
          <div className="mt-3 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <p className="font-medium">Error occurred:</p>
            <p className="mt-1">{artifact.error}</p>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}
