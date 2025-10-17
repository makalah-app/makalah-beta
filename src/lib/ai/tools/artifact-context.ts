import { createTypedContext, type BaseContext } from '@ai-sdk-tools/artifacts';

/**
 * Makalah AI Artifact Context
 *
 * Extended context for artifact tools with user information.
 * Provides type-safe access to user data within tool execution.
 */
export interface MakalahArtifactContext extends BaseContext {
  writer: any; // UIMessageStreamWriter from AI SDK
  userId: string;
  sessionId?: string;
  metadata?: {
    requestTime: number;
    userAgent?: string;
  };
}

/**
 * Typed context helpers
 * Use in chat route and tools
 */
export const { setContext, getContext, clearContext, isActive } =
  createTypedContext<MakalahArtifactContext>();
