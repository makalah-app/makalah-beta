/**
 * Provider Failover and Health Management
 * Manages provider selection, failover logic, and load balancing
 * 
 * Based on Vercel AI SDK v5 Core patterns from:
 * - /documentation/docs/03-ai-sdk-core/50-error-handling.mdx
 * - /documentation/docs/03-ai-sdk-core/45-provider-management.mdx
 */

import { AIProviderConfig } from '../config';
import { ERROR_CONFIG, HEALTH_CHECK_CONFIG } from '../../config/constants';
import { env } from '../../config/env';

/**
 * Provider usage statistics
 */
interface ProviderStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTimeMs: number;
  lastUsed: Date;
  errorRate: number;
}

/**
 * Provider failover state
 */
interface FailoverState {
  isInFailover: boolean;
  failoverStartTime?: Date;
  primaryFailures: number;
  consecutiveFailures: number;
  circuitBreakerOpen: boolean;
  nextRetryTime?: Date;
}

/**
 * Provider manager for handling failover and load balancing
 */
export class ProviderManager {
  private providers: AIProviderConfig;
  private stats: Map<string, ProviderStats> = new Map();
  private failoverState: FailoverState;
  private roundRobinCounter: number = 0;
  private requestQueue: Array<{ id: string; timestamp: Date }> = [];

  constructor(providers: AIProviderConfig) {
    this.providers = providers;
    
    // Initialize stats for each provider
    this.stats.set('openrouter', this.createEmptyStats());
    this.stats.set('openai', this.createEmptyStats());
    
    // Initialize failover state
    this.failoverState = {
      isInFailover: false,
      primaryFailures: 0,
      consecutiveFailures: 0,
      circuitBreakerOpen: false,
    };

    if (env.NODE_ENV === 'development') {
      // Provider Manager initialized - silent handling for production
    }
  }

  /**
   * Create empty provider statistics
   */
  private createEmptyStats(): ProviderStats {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      avgResponseTimeMs: 0,
      lastUsed: new Date(),
      errorRate: 0,
    };
  }

  /**
   * Record a successful request for a provider
   */
  recordSuccess(providerName: string, responseTimeMs: number) {
    const stats = this.stats.get(providerName);
    if (!stats) return;

    stats.totalRequests++;
    stats.successfulRequests++;
    stats.lastUsed = new Date();
    
    // Update average response time
    stats.avgResponseTimeMs = this.calculateNewAverage(
      stats.avgResponseTimeMs,
      responseTimeMs,
      stats.totalRequests
    );
    
    // Update error rate
    stats.errorRate = stats.failedRequests / stats.totalRequests;

    // Reset failover state on successful primary requests
    if (providerName === 'openrouter') {
      this.resetFailoverState();
    }
  }

  /**
   * Record a failed request for a provider
   */
  recordFailure(providerName: string, error: Error) {
    const stats = this.stats.get(providerName);
    if (!stats) return;

    stats.totalRequests++;
    stats.failedRequests++;
    stats.lastUsed = new Date();
    stats.errorRate = stats.failedRequests / stats.totalRequests;

    // Handle primary provider failures
    if (providerName === 'openrouter') {
      this.handlePrimaryFailure(error);
    }

    // Check circuit breaker conditions
    this.checkCircuitBreaker(providerName);
  }

  /**
   * Handle primary provider failure and update failover state
   */
  private handlePrimaryFailure(error: Error) {
    this.failoverState.primaryFailures++;
    this.failoverState.consecutiveFailures++;

    // Trigger failover if threshold exceeded
    if (this.failoverState.consecutiveFailures >= ERROR_CONFIG.circuitBreakerFailureThreshold) {
      this.triggerFailover();
    }

    if (env.NODE_ENV === 'development') {
      // Primary provider failure logged - silent handling for production
    }
  }

  /**
   * Trigger failover to secondary provider
   */
  private triggerFailover() {
    this.failoverState.isInFailover = true;
    this.failoverState.failoverStartTime = new Date();
    this.failoverState.circuitBreakerOpen = true;
    this.failoverState.nextRetryTime = new Date(
      Date.now() + ERROR_CONFIG.circuitBreakerRecoveryTimeout
    );

    if (env.NODE_ENV === 'development') {
      // Failover triggered - silent handling for production
    }
  }

  /**
   * Reset failover state after successful primary requests
   */
  private resetFailoverState() {
    if (this.failoverState.isInFailover) {
      this.failoverState.isInFailover = false;
      this.failoverState.circuitBreakerOpen = false;
      this.failoverState.consecutiveFailures = 0;
      this.failoverState.nextRetryTime = undefined;

      if (env.NODE_ENV === 'development') {
        // Failover reset - primary provider recovered - silent handling for production
      }
    }
  }

  /**
   * Check and update circuit breaker status
   */
  private checkCircuitBreaker(providerName: string) {
    const stats = this.stats.get(providerName);
    if (!stats) return;

    // Open circuit breaker if error rate is too high
    if (stats.totalRequests >= 10 && stats.errorRate >= 0.5) {
      this.failoverState.circuitBreakerOpen = true;
      this.failoverState.nextRetryTime = new Date(
        Date.now() + ERROR_CONFIG.circuitBreakerRecoveryTimeout
      );
    }
  }

  /**
   * Check if primary provider should be attempted
   */
  shouldUsePrimary(): boolean {
    // Don't use primary if in failover
    if (this.failoverState.isInFailover) {
      // Check if recovery timeout has passed
      if (this.failoverState.nextRetryTime && Date.now() > this.failoverState.nextRetryTime.getTime()) {
        // Try primary again
        this.failoverState.circuitBreakerOpen = false;
        return true;
      }
      return false;
    }

    // Don't use primary if circuit breaker is open
    if (this.failoverState.circuitBreakerOpen) {
      if (this.failoverState.nextRetryTime && Date.now() > this.failoverState.nextRetryTime.getTime()) {
        this.failoverState.circuitBreakerOpen = false;
        return true;
      }
      return false;
    }

    return true;
  }

  /**
   * Get next provider in round-robin rotation
   */
  getNextRoundRobin(): boolean {
    this.roundRobinCounter++;
    return this.roundRobinCounter % 2 === 1; // true = primary, false = fallback
  }

  /**
   * Calculate new average with exponential smoothing
   */
  private calculateNewAverage(oldAvg: number, newValue: number, count: number): number {
    if (count === 1) return newValue;
    
    // Use exponential smoothing for better responsiveness to recent changes
    const alpha = 0.2; // Smoothing factor
    return oldAvg * (1 - alpha) + newValue * alpha;
  }

  /**
   * Get provider statistics
   */
  getProviderStats(providerName?: string) {
    if (providerName) {
      return this.stats.get(providerName);
    }
    
    return {
      openrouter: this.stats.get('openrouter'),
      openai: this.stats.get('openai'),
    };
  }

  /**
   * Get failover state
   */
  getFailoverState() {
    return { ...this.failoverState };
  }

  /**
   * Get provider health summary
   */
  getHealthSummary() {
    const openrouterStats = this.stats.get('openrouter')!;
    const openaiStats = this.stats.get('openai')!;

    return {
      primary: {
        name: 'openrouter',
        isHealthy: !this.failoverState.circuitBreakerOpen && openrouterStats.errorRate < 0.1,
        errorRate: openrouterStats.errorRate,
        avgResponseTime: openrouterStats.avgResponseTimeMs,
        totalRequests: openrouterStats.totalRequests,
        lastUsed: openrouterStats.lastUsed,
      },
      fallback: {
        name: 'openai',
        isHealthy: openaiStats.errorRate < 0.2,
        errorRate: openaiStats.errorRate,
        avgResponseTime: openaiStats.avgResponseTimeMs,
        totalRequests: openaiStats.totalRequests,
        lastUsed: openaiStats.lastUsed,
      },
      failover: {
        isActive: this.failoverState.isInFailover,
        circuitBreakerOpen: this.failoverState.circuitBreakerOpen,
        consecutiveFailures: this.failoverState.consecutiveFailures,
        nextRetryTime: this.failoverState.nextRetryTime,
      },
    };
  }

  /**
   * Reset all statistics and failover state
   */
  reset() {
    this.stats.clear();
    this.stats.set('openrouter', this.createEmptyStats());
    this.stats.set('openai', this.createEmptyStats());
    
    this.failoverState = {
      isInFailover: false,
      primaryFailures: 0,
      consecutiveFailures: 0,
      circuitBreakerOpen: false,
    };

    this.roundRobinCounter = 0;
    this.requestQueue = [];
  }
}