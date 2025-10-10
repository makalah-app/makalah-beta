/**
 * Metrics tracking for Contextual Guidance
 *
 * Monitors trigger frequency, token usage, and performance
 *
 * Part of: Phase 4 - Contextual Guidance (RAG Tier 2)
 */

interface GuidanceMetrics {
  totalMessages: number;
  guidanceTriggered: number;
  triggersByType: Record<string, number>;
  avgTokensAdded: number;
  avgRetrievalTime: number;
}

class GuidanceMetricsCollector {
  private metrics: GuidanceMetrics = {
    totalMessages: 0,
    guidanceTriggered: 0,
    triggersByType: {},
    avgTokensAdded: 0,
    avgRetrievalTime: 0
  };

  recordMessage(triggered: boolean, triggerType?: string, tokens?: number, retrievalTime?: number) {
    this.metrics.totalMessages++;

    if (triggered && triggerType && tokens !== undefined && retrievalTime !== undefined) {
      this.metrics.guidanceTriggered++;
      this.metrics.triggersByType[triggerType] = (this.metrics.triggersByType[triggerType] || 0) + 1;

      // Update running averages
      const n = this.metrics.guidanceTriggered;
      this.metrics.avgTokensAdded = ((this.metrics.avgTokensAdded * (n - 1)) + tokens) / n;
      this.metrics.avgRetrievalTime = ((this.metrics.avgRetrievalTime * (n - 1)) + retrievalTime) / n;
    }
  }

  getMetrics(): GuidanceMetrics & { triggerFrequency: number } {
    return {
      ...this.metrics,
      triggerFrequency: this.metrics.totalMessages > 0
        ? this.metrics.guidanceTriggered / this.metrics.totalMessages
        : 0
    };
  }

  reset() {
    this.metrics = {
      totalMessages: 0,
      guidanceTriggered: 0,
      triggersByType: {},
      avgTokensAdded: 0,
      avgRetrievalTime: 0
    };
  }
}

export const guidanceMetrics = new GuidanceMetricsCollector();
