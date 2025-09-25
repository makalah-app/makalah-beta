/**
 * Provider Health Checking and Monitoring System
 * Continuous health monitoring for AI providers with automatic recovery
 * 
 * Based on Vercel AI SDK v5 Core patterns from:
 * - /documentation/docs/03-ai-sdk-core/50-error-handling.mdx
 * - /documentation/docs/03-ai-sdk-core/45-provider-management.mdx
 */

import { testOpenRouterConnection } from './openrouter';
import { testOpenAIConnection } from './openai';
import { HEALTH_CHECK_CONFIG, LOGGING_CONFIG } from '../../config/constants';
import { env } from '../../config/env';

/**
 * Provider health status
 */
export type ProviderHealthStatus = 'healthy' | 'degraded' | 'unhealthy';

/**
 * Health check result
 */
export interface HealthCheckResult {
  provider: string;
  status: ProviderHealthStatus;
  responseTimeMs: number;
  error?: string;
  timestamp: Date;
  metadata?: {
    availableModels?: string[];
    errorCount?: number;
    lastSuccess?: Date;
  };
}

/**
 * Health monitoring configuration
 */
interface HealthMonitorConfig {
  interval: number;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  degradedThreshold: number;
  unhealthyThreshold: number;
}

/**
 * Provider health manager class
 */
export class ProviderHealthManager {
  private healthStatus: Map<string, HealthCheckResult> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isMonitoring: boolean = false;
  private config: HealthMonitorConfig;
  private consecutiveFailures: Map<string, number> = new Map();

  constructor() {
    this.config = {
      interval: HEALTH_CHECK_CONFIG.interval,
      timeout: HEALTH_CHECK_CONFIG.timeout,
      retryAttempts: HEALTH_CHECK_CONFIG.retryAttempts,
      retryDelay: HEALTH_CHECK_CONFIG.retryDelay,
      degradedThreshold: 2000,  // 2s response time threshold
      unhealthyThreshold: 5000, // 5s response time threshold
    };

    // Initialize health status
    this.healthStatus.set('openrouter', this.createInitialHealthStatus('openrouter'));
    this.healthStatus.set('openai', this.createInitialHealthStatus('openai'));
    
    // Initialize failure counters
    this.consecutiveFailures.set('openrouter', 0);
    this.consecutiveFailures.set('openai', 0);

    if (env.NODE_ENV === 'development') {
      console.log('🏥 Provider Health Manager initialized');
    }
  }

  /**
   * Create initial health status for a provider
   */
  private createInitialHealthStatus(provider: string): HealthCheckResult {
    return {
      provider,
      status: 'healthy',
      responseTimeMs: 0,
      timestamp: new Date(),
      metadata: {
        errorCount: 0,
      },
    };
  }

  /**
   * Start continuous health monitoring
   */
  startHealthChecks() {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;

    // Perform initial health check
    this.performHealthChecks();

    // Schedule periodic health checks
    this.healthCheckInterval = setInterval(
      () => this.performHealthChecks(),
      this.config.interval
    );

    if (env.NODE_ENV === 'development') {
      console.log(`🔄 Health checks started (interval: ${this.config.interval}ms)`);
    }
  }

  /**
   * Stop health monitoring
   */
  stopHealthChecks() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    this.isMonitoring = false;

    if (env.NODE_ENV === 'development') {
      console.log('🛑 Health checks stopped');
    }
  }

  /**
   * Perform health checks for all providers
   */
  private async performHealthChecks() {
    const healthChecks = [
      this.checkProviderHealthInternal('openrouter'),
      this.checkProviderHealthInternal('openai'),
    ];

    try {
      await Promise.allSettled(healthChecks);
    } catch (error) {
      if (LOGGING_CONFIG.logProviderSwitching) {
        console.error('❌ Error during health checks:', error);
      }
    }
  }

  /**
   * Check health of a specific provider
   */
  async checkProviderHealth(providerName: string): Promise<HealthCheckResult> {
    const cachedResult = this.healthStatus.get(providerName);
    
    // Return cached result if recent
    if (cachedResult && Date.now() - cachedResult.timestamp.getTime() < 30000) {
      return cachedResult;
    }

    return await this.checkProviderHealthInternal(providerName);
  }

  /**
   * Internal health check implementation
   */
  private async checkProviderHealthInternal(providerName: string): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      let result;
      
      switch (providerName) {
        case 'openrouter':
          result = await testOpenRouterConnection();
          break;
        case 'openai':
          result = await testOpenAIConnection();
          break;
        default:
          throw new Error(`Unknown provider: ${providerName}`);
      }

      const responseTimeMs = Date.now() - startTime;
      const status = this.determineHealthStatus(result.success, responseTimeMs);
      
      const healthResult: HealthCheckResult = {
        provider: providerName,
        status,
        responseTimeMs,
        error: result.error,
        timestamp: new Date(),
        metadata: {
          availableModels: result.availableModels,
          errorCount: result.success ? 0 : (this.consecutiveFailures.get(providerName) || 0) + 1,
          lastSuccess: result.success ? new Date() : this.getLastSuccessTime(providerName),
        },
      };

      // Update failure counters
      if (result.success) {
        this.consecutiveFailures.set(providerName, 0);
      } else {
        this.consecutiveFailures.set(providerName, (this.consecutiveFailures.get(providerName) || 0) + 1);
      }

      // Store health result
      this.healthStatus.set(providerName, healthResult);

      // Log health status changes
      this.logHealthStatusChange(providerName, healthResult);

      return healthResult;

    } catch (error) {
      const responseTimeMs = Date.now() - startTime;
      const failureCount = (this.consecutiveFailures.get(providerName) || 0) + 1;
      this.consecutiveFailures.set(providerName, failureCount);

      const healthResult: HealthCheckResult = {
        provider: providerName,
        status: 'unhealthy',
        responseTimeMs,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        metadata: {
          errorCount: failureCount,
          lastSuccess: this.getLastSuccessTime(providerName),
        },
      };

      this.healthStatus.set(providerName, healthResult);
      this.logHealthStatusChange(providerName, healthResult);

      return healthResult;
    }
  }

  /**
   * Determine health status based on success and response time
   */
  private determineHealthStatus(success: boolean, responseTimeMs: number): ProviderHealthStatus {
    if (!success) {
      return 'unhealthy';
    }

    if (responseTimeMs > this.config.unhealthyThreshold) {
      return 'unhealthy';
    }

    if (responseTimeMs > this.config.degradedThreshold) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Get last successful health check time
   */
  private getLastSuccessTime(providerName: string): Date | undefined {
    const currentStatus = this.healthStatus.get(providerName);
    if (currentStatus?.metadata?.lastSuccess) {
      return currentStatus.metadata.lastSuccess;
    }
    
    // If no previous success, use initial timestamp
    return currentStatus?.status === 'healthy' ? currentStatus.timestamp : undefined;
  }

  /**
   * Log health status changes
   */
  private logHealthStatusChange(providerName: string, newResult: HealthCheckResult) {
    const previousResult = this.healthStatus.get(providerName);
    
    if (!previousResult || previousResult.status !== newResult.status) {
      const emoji = this.getStatusEmoji(newResult.status);
      const message = `${emoji} Provider ${providerName} is now ${newResult.status}`;
      
      if (LOGGING_CONFIG.logProviderSwitching) {
        if (newResult.status === 'healthy') {
          console.log(message);
        } else {
          console.warn(`${message}${newResult.error ? `: ${newResult.error}` : ''}`);
        }
      }
    }
  }

  /**
   * Get emoji for health status
   */
  private getStatusEmoji(status: ProviderHealthStatus): string {
    switch (status) {
      case 'healthy': return '✅';
      case 'degraded': return '⚠️';
      case 'unhealthy': return '❌';
      default: return '❓';
    }
  }

  /**
   * Get all provider health statuses
   */
  getAllHealthStatuses(): Map<string, HealthCheckResult> {
    return new Map(this.healthStatus);
  }

  /**
   * Get health summary for all providers
   */
  getHealthSummary() {
    const summary = {
      overall: 'healthy' as ProviderHealthStatus,
      providers: {} as Record<string, HealthCheckResult>,
      lastUpdated: new Date(),
    };

    let hasUnhealthy = false;
    let hasDegraded = false;

    for (const [provider, health] of this.healthStatus) {
      summary.providers[provider] = health;
      
      if (health.status === 'unhealthy') {
        hasUnhealthy = true;
      } else if (health.status === 'degraded') {
        hasDegraded = true;
      }
    }

    // Determine overall health
    if (hasUnhealthy) {
      summary.overall = 'unhealthy';
    } else if (hasDegraded) {
      summary.overall = 'degraded';
    }

    return summary;
  }

  /**
   * Force health check for a specific provider
   */
  async forceHealthCheck(providerName: string): Promise<HealthCheckResult> {
    return await this.checkProviderHealthInternal(providerName);
  }

  /**
   * Reset health status for a provider
   */
  resetProviderHealth(providerName: string) {
    this.healthStatus.set(providerName, this.createInitialHealthStatus(providerName));
    this.consecutiveFailures.set(providerName, 0);
  }

  /**
   * Check if monitoring is active
   */
  isHealthMonitoring(): boolean {
    return this.isMonitoring;
  }
}