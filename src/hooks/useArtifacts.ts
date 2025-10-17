import { useArtifact, useArtifacts } from '@ai-sdk-tools/artifacts/client';
import {
  AcademicAnalysisArtifact,
  SectionDraftArtifact,
  PaperOutlineArtifact,
  type AcademicAnalysisPayload,
  type SectionDraftPayload,
  type PaperOutlinePayload
} from '@/lib/ai/artifacts/artifact-registry';

/**
 * Hook for consuming Academic Analysis artifacts
 *
 * Usage:
 * const { data, status, progress } = useAcademicAnalysis({
 *   onComplete: (data) => console.log('Done!', data)
 * });
 */
export function useAcademicAnalysis(callbacks?: {
  onUpdate?: (data: AcademicAnalysisPayload, prevData: AcademicAnalysisPayload | null) => void;
  onComplete?: (data: AcademicAnalysisPayload) => void;
  onError?: (error: string, data: AcademicAnalysisPayload | null) => void;
  onProgress?: (progress: number, data: AcademicAnalysisPayload) => void;
}) {
  return useArtifact(AcademicAnalysisArtifact, callbacks as any);
}

/**
 * Hook for consuming Section Draft artifacts
 */
export function useSectionDraft(callbacks?: {
  onComplete?: (data: SectionDraftPayload) => void;
}) {
  return useArtifact(SectionDraftArtifact, callbacks as any);
}

/**
 * Hook for consuming Paper Outline artifacts
 */
export function usePaperOutline(callbacks?: {
  onComplete?: (data: PaperOutlinePayload) => void;
}) {
  return useArtifact(PaperOutlineArtifact, callbacks as any);
}

/**
 * Hook for listening to ALL artifacts
 *
 * Usage:
 * const { current, latest, byType } = useAllArtifacts({
 *   onData: (type, artifact) => console.log(type, artifact)
 * });
 */
export function useAllArtifacts(options?: {
  onData?: (artifactType: string, data: any) => void;
}) {
  return useArtifacts(options);
}
