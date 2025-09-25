/**
 * SSE Handler - Simplified Natural LLM Intelligence
 *
 * Simplified SSE handling following the philosophy:
 * "Trust natural LLM intelligence instead of rigid programmatic control"
 *
 * Based on AI SDK v5 Core streamText:
 * - /documentation/docs/03-ai-sdk-core/05-generating-text.mdx
 */

/**
 * Simple SSE event types
 */
export type SimpleSSEEventType =
  | 'text-delta'
  | 'tool-call'
  | 'tool-result'
  | 'error'
  | 'done';

/**
 * Simple SSE event
 */
export interface SimpleSSEEvent {
  type: SimpleSSEEventType;
  data: any;
  timestamp: number;
}

/**
 * Simple SSE Handler - trusts natural LLM intelligence
 */
export class SimpleSSEHandler {
  /**
   * Create basic SSE Response
   */
  static createSSEResponse(): Response {
    const stream = new ReadableStream<string>({
      start(controller) {
        // Store controller for global access if needed
        (globalThis as any).sseController = controller;
      }
    });

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  /**
   * Send simple event
   */
  static sendEvent(controller: ReadableStreamDefaultController<string>, event: SimpleSSEEvent): void {
    const formatted = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
    controller.enqueue(formatted);
  }

  /**
   * Send text delta
   */
  static sendTextDelta(controller: ReadableStreamDefaultController<string>, delta: string): void {
    this.sendEvent(controller, {
      type: 'text-delta',
      data: { delta },
      timestamp: Date.now(),
    });
  }

  /**
   * Send tool call
   */
  static sendToolCall(controller: ReadableStreamDefaultController<string>, toolCall: any): void {
    this.sendEvent(controller, {
      type: 'tool-call',
      data: toolCall,
      timestamp: Date.now(),
    });
  }

  /**
   * Send tool result
   */
  static sendToolResult(controller: ReadableStreamDefaultController<string>, toolResult: any): void {
    this.sendEvent(controller, {
      type: 'tool-result',
      data: toolResult,
      timestamp: Date.now(),
    });
  }

  /**
   * Send error
   */
  static sendError(controller: ReadableStreamDefaultController<string>, error: Error): void {
    this.sendEvent(controller, {
      type: 'error',
      data: { error: error.message },
      timestamp: Date.now(),
    });
  }

  /**
   * Send done and close
   */
  static sendDone(controller: ReadableStreamDefaultController<string>, finalData: any): void {
    this.sendEvent(controller, {
      type: 'done',
      data: finalData,
      timestamp: Date.now(),
    });
    controller.close();
  }
}

/**
 * Factory function for backward compatibility
 */
export function createSSEHandler() {
  return SimpleSSEHandler;
}

// Export for legacy support
export const getSSEHandler = () => SimpleSSEHandler;