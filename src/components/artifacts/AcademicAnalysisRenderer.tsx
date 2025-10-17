import React from 'react';
import { ArtifactCard } from './ArtifactCard';
import { ExternalLink, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ArtifactData } from '@ai-sdk-tools/artifacts/client';
import type { AcademicAnalysisPayload } from '@/lib/ai/artifacts/artifact-registry';

interface AcademicAnalysisRendererProps {
  artifact: ArtifactData<AcademicAnalysisPayload>;
}

/**
 * Academic Analysis Artifact Renderer
 *
 * Renders formal academic analysis with:
 * - Structured sections with dynamic heading levels
 * - References list with external links
 * - Word count display
 * - Prose typography for readable content
 */
export function AcademicAnalysisRenderer({ artifact }: AcademicAnalysisRendererProps) {
  const data = artifact.payload;
  const hasPartialData = data && (data.sections?.length > 0 || data.title);

  return (
    <ArtifactCard artifact={artifact}>
      <div className="space-y-6">
        {/* Streaming progress indicator */}
        {artifact.status === 'streaming' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Menghasilkan analisis...</span>
            </div>
            {/* Progress bar based on sections received */}
            {data?.sections && data.sections.length > 0 && (
              <div className="text-xs text-muted-foreground">
                {data.sections.length} bagian sedang diproses
              </div>
            )}
          </div>
        )}

        {/* Sections - Show progressively as they stream */}
        {data?.sections && data.sections.length > 0 && (
          <div className="prose prose-slate dark:prose-invert max-w-none">
            {data.sections.map((section, index) => {
              // ✅ FIX: Validate heading level with strict validation
              // During streaming, partial objects can have incomplete/invalid values
              const validLevels = ['h1', 'h2', 'h3', 'h4'] as const;
              const isValidLevel = (level: any): level is 'h1' | 'h2' | 'h3' | 'h4' => {
                return validLevels.includes(level);
              };
              const HeadingTag = (isValidLevel(section.level) ? section.level : 'h2') as keyof JSX.IntrinsicElements;

              // Skip sections with incomplete data during streaming
              if (!section.heading && !section.content) {
                return null;
              }

              return (
                <div
                  key={index}
                  className={cn(
                    "mb-6 transition-opacity duration-300",
                    artifact.status === 'streaming' ? "animate-in fade-in" : ""
                  )}
                >
                  <HeadingTag className="font-semibold">
                    {section.heading || 'Loading...'}
                  </HeadingTag>
                  {section.content && (
                    <div
                      className="mt-2 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: section.content }}
                    />
                  )}
                  {/* Streaming indicator for last section */}
                  {artifact.status === 'streaming' && index === data.sections.length - 1 && (
                    <span className="inline-flex ml-1 animate-pulse">▊</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* References - Only show when streaming complete */}
        {artifact.status === 'complete' && data?.references && data.references.length > 0 && (
          <div className="border-t border-muted pt-6">
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Referensi
            </h4>
            <ul className="space-y-3">
              {data.references.map((ref, index) => (
                <li key={index} className="text-sm">
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start gap-2 text-primary hover:underline"
                  >
                    <ExternalLink className="mt-0.5 h-4 w-4 flex-shrink-0 opacity-70 group-hover:opacity-100" />
                    <div>
                      <p className="font-medium">{ref.title}</p>
                      {ref.summary && (
                        <p className="mt-1 text-muted-foreground">{ref.summary}</p>
                      )}
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between border-t border-muted pt-4 text-xs text-muted-foreground">
          <span>
            {data.wordCount > 0 && `${data.wordCount.toLocaleString('id-ID')} kata`}
          </span>
          {data.metadata?.language && (
            <span className="uppercase">{data.metadata.language}</span>
          )}
        </div>
      </div>
    </ArtifactCard>
  );
}
