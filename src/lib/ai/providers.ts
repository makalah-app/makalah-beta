/**
 * AI Provider Management and Selection Logic
 * Handles provider failover, health monitoring, and intelligent selection
 * 
 * Based on Vercel AI SDK v5 Core patterns from:
 * - /documentation/docs/03-ai-sdk-core/45-provider-management.mdx
 * - /documentation/docs/03-ai-sdk-core/50-error-handling.mdx
 */

import { getAIProviders, AIProviderConfig } from './config';
import { ProviderHealthManager } from './providers/health';
import { ProviderManager } from './providers/manager';
import { ERROR_CONFIG, LOGGING_CONFIG } from '../config/constants';

/**
 * Provider selection strategy
 */
export type ProviderStrategy = 'primary-first' | 'health-based' | 'round-robin' | 'fallback-only';

/**
 * Provider selection result
 */
export interface ProviderSelection {
  provider: any;
  providerName: string;
  model: string;
  config: any;
  isHealthy: boolean;
  responseTimeMs: number;
}

/**
 * Provider selection error
 */
export class ProviderSelectionError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'ProviderSelectionError';
  }
}

/**
 * Main AI provider manager class
 */
export class AIProviderManager {
  private providers: AIProviderConfig;
  private healthManager: ProviderHealthManager;
  private providerManager: ProviderManager;
  private currentStrategy: ProviderStrategy = 'primary-first';

  constructor(strategy: ProviderStrategy = 'primary-first') {
    this.providers = getAIProviders();
    this.healthManager = new ProviderHealthManager();
    this.providerManager = new ProviderManager(this.providers);
    this.currentStrategy = strategy;

    // Start health monitoring
    this.healthManager.startHealthChecks();
  }

  /**
   * Select the best available provider based on strategy
   */
  async selectProvider(options: {
    strategy?: ProviderStrategy;
    requireHealthy?: boolean;
    maxResponseTime?: number;
  } = {}): Promise<ProviderSelection> {
    const strategy = options.strategy || this.currentStrategy;
    const requireHealthy = options.requireHealthy ?? true;
    const maxResponseTime = options.maxResponseTime ?? 5000;

    try {
      switch (strategy) {
        case 'primary-first':
          return await this.selectPrimaryFirst(requireHealthy, maxResponseTime);
        
        case 'health-based':
          return await this.selectHealthBased(maxResponseTime);
          
        case 'round-robin':
          return await this.selectRoundRobin(requireHealthy, maxResponseTime);
          
        case 'fallback-only':
          return await this.selectFallbackOnly(requireHealthy, maxResponseTime);
          
        default:
          throw new ProviderSelectionError(`Unknown strategy: ${strategy}`);
      }
    } catch (error) {
      if (LOGGING_CONFIG.logProviderSwitching) {
        console.error('❌ Provider selection failed:', error);
      }
      throw error;
    }
  }

  /**
   * Primary-first strategy: Try primary, fallback to secondary
   */
  private async selectPrimaryFirst(
    requireHealthy: boolean, 
    maxResponseTime: number
  ): Promise<ProviderSelection> {
    // Try primary provider first
    const primaryHealth = await this.healthManager.checkProviderHealth('openrouter');
    
    if (this.isProviderViable(primaryHealth, requireHealthy, maxResponseTime)) {
      
      return {
        provider: this.providers.primary.provider,
        providerName: this.providers.primary.name,
        model: this.providers.primary.model,
        config: this.providers.primary.config,
        isHealthy: primaryHealth.status === 'healthy',
        responseTimeMs: primaryHealth.responseTimeMs,
      };
    }

    // Fallback to secondary provider
    const fallbackHealth = await this.healthManager.checkProviderHealth('openai');
    
    if (this.isProviderViable(fallbackHealth, requireHealthy, maxResponseTime)) {
      if (LOGGING_CONFIG.logProviderSwitching) {
        console.warn('⚠️  Primary provider unhealthy, using fallback: OpenAI');
      }
      
      return {
        provider: this.providers.fallback.provider,
        providerName: this.providers.fallback.name,
        model: this.providers.fallback.model,
        config: this.providers.fallback.config,
        isHealthy: fallbackHealth.status === 'healthy',
        responseTimeMs: fallbackHealth.responseTimeMs,
      };
    }

    throw new ProviderSelectionError(
      'No healthy providers available',
      new Error(`Primary: ${primaryHealth.error}, Fallback: ${fallbackHealth.error}`)
    );
  }

  /**
   * Health-based strategy: Select the healthiest provider
   */
  private async selectHealthBased(maxResponseTime: number): Promise<ProviderSelection> {
    const [primaryHealth, fallbackHealth] = await Promise.all([
      this.healthManager.checkProviderHealth('openrouter'),
      this.healthManager.checkProviderHealth('openai'),
    ]);

    // Compare health scores
    const primaryScore = this.calculateHealthScore(primaryHealth, maxResponseTime);
    const fallbackScore = this.calculateHealthScore(fallbackHealth, maxResponseTime);

    if (primaryScore >= fallbackScore && primaryScore > 0) {
      
      return {
        provider: this.providers.primary.provider,
        providerName: this.providers.primary.name,
        model: this.providers.primary.model,
        config: this.providers.primary.config,
        isHealthy: primaryHealth.status === 'healthy',
        responseTimeMs: primaryHealth.responseTimeMs,
      };
    }

    if (fallbackScore > 0) {
      
      return {
        provider: this.providers.fallback.provider,
        providerName: this.providers.fallback.name,
        model: this.providers.fallback.model,
        config: this.providers.fallback.config,
        isHealthy: fallbackHealth.status === 'healthy',
        responseTimeMs: fallbackHealth.responseTimeMs,
      };
    }

    throw new ProviderSelectionError('No providers meet health requirements');
  }

  /**
   * Round-robin strategy: Alternate between providers
   */
  private async selectRoundRobin(
    requireHealthy: boolean, 
    maxResponseTime: number
  ): Promise<ProviderSelection> {
    const usesPrimary = this.providerManager.getNextRoundRobin();
    
    if (usesPrimary) {
      const primaryHealth = await this.healthManager.checkProviderHealth('openrouter');
      if (this.isProviderViable(primaryHealth, requireHealthy, maxResponseTime)) {
        return {
          provider: this.providers.primary.provider,
          providerName: this.providers.primary.name,
          model: this.providers.primary.model,
          config: this.providers.primary.config,
          isHealthy: primaryHealth.status === 'healthy',
          responseTimeMs: primaryHealth.responseTimeMs,
        };
      }
    }

    // Use fallback if primary unavailable or it's fallback's turn
    const fallbackHealth = await this.healthManager.checkProviderHealth('openai');
    if (this.isProviderViable(fallbackHealth, requireHealthy, maxResponseTime)) {
      return {
        provider: this.providers.fallback.provider,
        providerName: this.providers.fallback.name,
        model: this.providers.fallback.model,
        config: this.providers.fallback.config,
        isHealthy: fallbackHealth.status === 'healthy',
        responseTimeMs: fallbackHealth.responseTimeMs,
      };
    }

    throw new ProviderSelectionError('No viable providers in round-robin selection');
  }

  /**
   * Fallback-only strategy: Only use fallback provider
   */
  private async selectFallbackOnly(
    requireHealthy: boolean, 
    maxResponseTime: number
  ): Promise<ProviderSelection> {
    const fallbackHealth = await this.healthManager.checkProviderHealth('openai');
    
    if (this.isProviderViable(fallbackHealth, requireHealthy, maxResponseTime)) {
      return {
        provider: this.providers.fallback.provider,
        providerName: this.providers.fallback.name,
        model: this.providers.fallback.model,
        config: this.providers.fallback.config,
        isHealthy: fallbackHealth.status === 'healthy',
        responseTimeMs: fallbackHealth.responseTimeMs,
      };
    }

    throw new ProviderSelectionError('Fallback provider not viable');
  }

  /**
   * Check if provider is viable based on health and response time
   */
  private isProviderViable(
    health: any, 
    requireHealthy: boolean, 
    maxResponseTime: number
  ): boolean {
    if (requireHealthy && health.status !== 'healthy') {
      return false;
    }
    
    if (health.responseTimeMs > maxResponseTime) {
      return false;
    }
    
    return true;
  }

  /**
   * Calculate health score for provider comparison
   */
  private calculateHealthScore(health: any, maxResponseTime: number): number {
    if (health.status === 'unhealthy') return 0;
    
    let score = health.status === 'healthy' ? 100 : 50; // degraded = 50
    
    // Penalize slow response times
    const responseTimePenalty = Math.max(0, (health.responseTimeMs / maxResponseTime) * 50);
    score -= responseTimePenalty;
    
    return Math.max(0, score);
  }

  /**
   * Get current provider health status
   */
  async getProviderHealthStatus() {
    return {
      primary: await this.healthManager.checkProviderHealth('openrouter'),
      fallback: await this.healthManager.checkProviderHealth('openai'),
    };
  }

  /**
   * Change provider selection strategy
   */
  setStrategy(strategy: ProviderStrategy) {
    this.currentStrategy = strategy;
  }

  /**
   * Stop health monitoring (cleanup)
   */
  dispose() {
    this.healthManager.stopHealthChecks();
  }
}

/**
 * Global provider manager instance
 */
let providerManager: AIProviderManager | null = null;

/**
 * Get global provider manager
 */
export function getProviderManager(): AIProviderManager {
  if (!providerManager) {
    providerManager = new AIProviderManager();
  }
  return providerManager;
}

/**
 * Quick provider selection utility
 */
export async function selectBestProvider(options?: {
  strategy?: ProviderStrategy;
  requireHealthy?: boolean;
  maxResponseTime?: number;
}): Promise<ProviderSelection> {
  const manager = getProviderManager();
  return await manager.selectProvider(options);
}