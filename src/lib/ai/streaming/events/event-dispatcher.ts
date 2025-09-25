/**
 * Event Dispatcher - Simplified Natural LLM Intelligence
 *
 * Simplified event dispatching following the philosophy:
 * "Trust natural LLM intelligence instead of rigid programmatic control"
 *
 * Based on AI SDK v5 Core streamText:
 * - /documentation/docs/03-ai-sdk-core/05-generating-text.mdx
 */

/**
 * Simple event types
 */
export type SimpleEventType =
  | 'text-delta'
  | 'tool-call'
  | 'tool-result'
  | 'error'
  | 'done';

/**
 * Simple event
 */
export interface SimpleEvent {
  type: SimpleEventType;
  data: any;
  timestamp: number;
}

/**
 * Simple event handler
 */
export type SimpleEventHandler = (event: SimpleEvent) => void;

/**
 * Simple Event Dispatcher - trusts natural LLM intelligence
 */
export class SimpleEventDispatcher {
  private handlers = new Map<SimpleEventType, Set<SimpleEventHandler>>();

  /**
   * Add event listener
   */
  addListener(eventType: SimpleEventType, handler: SimpleEventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
  }

  /**
   * Remove event listener
   */
  removeListener(eventType: SimpleEventType, handler: SimpleEventHandler): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.handlers.delete(eventType);
      }
    }
  }

  /**
   * Dispatch event
   */
  dispatch(event: SimpleEvent): void {
    const handlers = this.handlers.get(event.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error('Event handler error:', error);
        }
      });
    }
  }

  /**
   * Dispatch simple event
   */
  dispatchEvent(type: SimpleEventType, data: any): void {
    this.dispatch({
      type,
      data,
      timestamp: Date.now(),
    });
  }
}

/**
 * Global event dispatcher instance
 */
let globalDispatcher: SimpleEventDispatcher | null = null;

/**
 * Get global event dispatcher
 */
export function getEventDispatcher(): SimpleEventDispatcher {
  if (!globalDispatcher) {
    globalDispatcher = new SimpleEventDispatcher();
  }
  return globalDispatcher;
}

/**
 * Factory function for backward compatibility
 */
export function createEventDispatcher() {
  return new SimpleEventDispatcher();
}

// Export for legacy support
export const EventDispatcher = SimpleEventDispatcher;

// Backward compatibility aliases
export const { addListener: on, removeListener: off, dispatch: emit } = SimpleEventDispatcher.prototype;