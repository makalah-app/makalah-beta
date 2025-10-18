'use client';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { ArtifactCard } from './ArtifactCard';
import { ExternalLink, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { ArtifactData } from '@ai-sdk-tools/artifacts/client';
import type { AcademicAnalysisPayload } from '@/lib/ai/artifacts/artifact-registry';

interface AcademicAnalysisRendererProps {
  artifact: ArtifactData<AcademicAnalysisPayload>;
}

const DEFAULT_CHUNK_WORDS = 3; // jumlah kata per langkah
const DEFAULT_STEP_MS = 50;    // jeda antar langkah
const SECTION_SKELETON_WIDTHS = ['100%', '92%', '86%', '78%'];
const IS_DEV = process.env.NODE_ENV !== 'production';

function getWordEstimateFromTokens(tokens: string[]): number {
  return tokens.reduce((acc, token) => {
    if (token.trim().length === 0) return acc;
    if (/\s+/.test(token)) return acc;
    return acc + 1;
  }, 0);
}

function debugArtifactRender(message: string, context?: Record<string, unknown>) {
  if (!IS_DEV) return;
  // eslint-disable-next-line no-console
  console.debug('[artifact:render]', message, context ?? {});
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

  const usePrefersReducedMotion = () => {
    const [reduced, setReduced] = React.useState(false);
    React.useEffect(() => {
      if (typeof window === 'undefined') return;
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => setReduced(mq.matches);
      onChange();
      mq.addEventListener?.('change', onChange);
      return () => mq.removeEventListener?.('change', onChange);
    }, []);
    return reduced;
  };

  function SectionLazyMarkdown({
    content,
    status,
    safeSchema,
    chunkWords = DEFAULT_CHUNK_WORDS,
    stepMs = DEFAULT_STEP_MS,
  }: {
    content: string;
    status: string;
    safeSchema: any;
    chunkWords?: number;
    stepMs?: number;
  }) {
    const prefersReducedMotion = usePrefersReducedMotion();
    const shouldAnimate = !prefersReducedMotion && status === 'streaming';

    const buildTokens = React.useCallback((text: string) => {
      return text.split(/(\s+)/g).filter((t) => t.length > 0);
    }, []);

    const tokens = React.useMemo(() => buildTokens(content), [content, buildTokens]);
    const totalWords = React.useMemo(() => getWordEstimateFromTokens(tokens), [tokens]);

    const [visible, setVisible] = React.useState<string>(shouldAnimate ? '' : content);
    const wordsShownRef = React.useRef<number>(shouldAnimate ? 0 : totalWords);
    const timerRef = React.useRef<any>(null);

    const sliceByWords = React.useCallback(
      (count: number) => {
        if (count <= 0) return '';
        let words = 0;
        const out: string[] = [];
        for (const t of tokens) {
          out.push(t);
          if (t.trim().length > 0 && !/\s+/.test(t)) {
            words += 1;
            if (words >= count) break;
          }
        }
        return out.join('');
      },
      [tokens]
    );

    React.useEffect(() => {
    if (!shouldAnimate) {
      setVisible(content);
      wordsShownRef.current = totalWords;
      if (timerRef.current) {
        clearInterval(timerRef.current);
          timerRef.current = null;
        }
        return;
      }

      const current = Math.min(wordsShownRef.current, totalWords);
      setVisible(sliceByWords(current));

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      timerRef.current = setInterval(() => {
        const next = Math.min(totalWords, wordsShownRef.current + chunkWords);
        wordsShownRef.current = next;
        setVisible(sliceByWords(next));
        debugArtifactRender('typing-progress', {
          shownWords: next,
          totalWords,
        });
        if (next >= totalWords) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }, stepMs);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
      };
    }, [shouldAnimate, totalWords, content, sliceByWords, chunkWords, stepMs]);

    React.useEffect(() => {
      if (!shouldAnimate && status === 'complete') {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        setVisible(content);
        wordsShownRef.current = totalWords;
      }
    }, [shouldAnimate, status, content, totalWords]);

    if (shouldAnimate && !visible) {
      debugArtifactRender('skeleton-visible', {
        status,
        totalWords,
      });
      return (
        <div className="space-y-2">
          {SECTION_SKELETON_WIDTHS.map((width, index) => (
            <Skeleton
              key={index}
              className="h-4 bg-primary/10"
              style={{ width }}
            />
          ))}
        </div>
      );
    }

    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, safeSchema]]}
        components={{
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
        }}
      >
        {visible}
      </ReactMarkdown>
    );
  }

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

              // Rehype sanitize schema whitelist (basic inline + headings + lists + code + table + links)
              const safeSchema: any = {
                ...defaultSchema,
                tagNames: [
                  'p', 'ul', 'ol', 'li',
                  'strong', 'em', 'blockquote', 'code', 'pre',
                  'h1', 'h2', 'h3', 'h4',
                  'table', 'thead', 'tbody', 'tr', 'th', 'td',
                  'a'
                ],
                attributes: {
                  ...defaultSchema.attributes,
                  a: [
                    ...(defaultSchema.attributes?.a || []),
                    ['href'], ['title'], ['target'], ['rel']
                  ],
                  code: [...(defaultSchema.attributes?.code || []), ['className']],
                  th: [...(defaultSchema.attributes?.th || []), ['colspan'], ['rowspan']],
                  td: [...(defaultSchema.attributes?.td || []), ['colspan'], ['rowspan']],
                },
                clobberPrefix: 'md-',
                clobber: ['name', 'id'],
                allowComments: false,
              };

              return (
                <div
                  key={index}
                  className={cn(
                    "mb-6 transition-opacity duration-300",
                    artifact.status === 'streaming' ? "animate-in fade-in" : ""
                  )}
                >
                  <HeadingTag className="font-semibold">
                    {section.heading?.trim() || (artifact.status === 'streaming' ? 'Menulis...' : 'Bagian')}
                  </HeadingTag>
                  {section.content ? (
                    <div className="mt-2 leading-relaxed">
                      <SectionLazyMarkdown
                        content={section.content}
                        status={artifact.status}
                        safeSchema={safeSchema}
                      />
                    </div>
                  ) : artifact.status === 'streaming' ? (
                    <div className="mt-3 space-y-2">
                      {IS_DEV &&
                        (() => {
                          debugArtifactRender('section-skeleton', {
                            index,
                            status: artifact.status,
                          });
                          return null;
                        })()}
                      {SECTION_SKELETON_WIDTHS.map((width, skeletonIndex) => (
                        <Skeleton
                          key={skeletonIndex}
                          className="h-4 bg-primary/10"
                          style={{ width }}
                        />
                      ))}
                    </div>
                  ) : null}
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
