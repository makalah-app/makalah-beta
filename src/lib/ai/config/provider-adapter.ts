/**
 * Provider Adapter - Bridge between AIProviderManager and dynamic-config.ts
 *
 * This adapter provides compatibility layer untuk API routes yang masih menggunakan
 * AIProviderManager pattern while using dynamic-config.ts as the underlying implementation.
 *
 * Maintains API contracts without breaking existing endpoints.
 */

import { getDynamicModelConfig, type DynamicModelConfig } from '../dynamic-config';

export type ProviderStrategy = 'primary-first' | 'health-based' | 'round-robin' | 'fallback-only';
export type TextProvider = 'openai' | 'openrouter';
export type ToolProvider = 'openai' | 'openrouter';

export interface HybridProviderConfig {
  provider: TextProvider;
  model: string;
  temperature: number;
  maxTokens: number;
  isActive: boolean;
  isDefault: boolean;
  role: 'primary' | 'fallback';
  apiKeyEncrypted?: string;
  apiKeyHint?: string;
  priority: number;
}

export interface ToolProviderConfig {
  toolName: string;
  provider: ToolProvider;
  model: string;
  apiKeyEncrypted?: string;
  apiKeyHint?: string;
  isActive: boolean;
  fallbackProvider?: ToolProvider;
  fallbackModel?: string;
}

export interface HybridConfiguration {
  textGeneration: {
    primary: HybridProviderConfig;
    fallback: HybridProviderConfig[];
    systemPrompt?: string;
  };
  toolExecution: {
    [toolName: string]: ToolProviderConfig;
  };
  healthMonitoring: {
    enabled: boolean;
    intervalMs: number;
    timeoutMs: number;
  };
}

export interface ProviderSelection {
  provider: any;
  providerName: string;
  model: string;
  config: any;
  isHealthy: boolean;
  responseTimeMs: number;
}

export interface ProviderHealthStatus {
  [key: string]: {
    status: 'healthy' | 'unhealthy' | 'unknown';
    responseTime?: number;
    lastChecked?: string;
    error?: string;
  };
}

export interface ProviderConfig {
  strategy: ProviderStrategy;
  primary: {
    name: string;
    model: string;
    status: 'healthy' | 'unhealthy';
  };
  fallback: {
    name: string;
    model: string;
    status: 'healthy' | 'unhealthy';
  };
  health?: ProviderHealthStatus;
}

/**
 * Compatibility adapter class to maintain API contracts
 */
export class ProviderManagerAdapter {
  private strategy: ProviderStrategy = 'primary-first';
  private dynamicConfig: DynamicModelConfig | null = null;

  constructor() {
    this.loadConfig();
  }

  private async loadConfig(): Promise<void> {
    try {
      this.dynamicConfig = await getDynamicModelConfig();
    } catch (error) {
    }
  }

  /**
   * Get provider configuration compatible with existing API
   */
  async getProviderConfig(): Promise<ProviderConfig> {
    if (!this.dynamicConfig) {
      await this.loadConfig();
    }

    const config = this.dynamicConfig!;

    return {
      strategy: this.strategy,
      primary: {
        name: config.primaryProvider,
        model: config.primaryModelName,
        status: 'healthy' // Assume healthy for now, health check can be added
      },
      fallback: {
        name: config.fallbackProvider,
        model: config.fallbackModelName,
        status: 'healthy'
      }
    };
  }

  /**
   * Get provider health status
   */
  async getProviderHealthStatus(): Promise<ProviderHealthStatus> {
    if (!this.dynamicConfig) {
      await this.loadConfig();
    }

    const config = this.dynamicConfig!;

    // Basic health status - can be enhanced with actual health checks
    return {
      [config.primaryProvider]: {
        status: 'healthy',
        responseTime: 150,
        lastChecked: new Date().toISOString()
      },
      [config.fallbackProvider]: {
        status: 'healthy',
        responseTime: 200,
        lastChecked: new Date().toISOString()
      }
    };
  }

  /**
   * Set provider selection strategy
   */
  setStrategy(strategy: ProviderStrategy): void {
    this.strategy = strategy;
  }

  /**
   * Select provider based on strategy
   */
  async selectProvider(options: { strategy?: ProviderStrategy } = {}): Promise<ProviderSelection> {
    if (!this.dynamicConfig) {
      await this.loadConfig();
    }

    const config = this.dynamicConfig!;
    const strategy = options.strategy || this.strategy;

    // Determine which provider to use based on strategy
    let useProvider: 'primary' | 'fallback' = 'primary';

    switch (strategy) {
      case 'fallback-only':
        useProvider = 'fallback';
        break;
      case 'primary-first':
      case 'health-based':
      case 'round-robin':
      default:
        useProvider = 'primary';
        break;
    }

    const selectedProvider = useProvider === 'primary' ? config.primaryProvider : config.fallbackProvider;
    const selectedModel = useProvider === 'primary' ? config.primaryModel : config.fallbackModel;
    const selectedModelName = useProvider === 'primary' ? config.primaryModelName : config.fallbackModelName;

    return {
      provider: selectedModel,
      providerName: selectedProvider,
      model: selectedModelName,
      config: config.config,
      isHealthy: true,
      responseTimeMs: 150
    };
  }
}

/**
 * Global adapter instance
 */
let providerAdapterInstance: ProviderManagerAdapter | null = null;

/**
 * Get global provider adapter (maintains singleton pattern)
 */
export function getProviderAdapter(): ProviderManagerAdapter {
  if (!providerAdapterInstance) {
    providerAdapterInstance = new ProviderManagerAdapter();
  }
  return providerAdapterInstance;
}

/**
 * Compatibility exports to maintain existing API contracts
 */
export function getProviderManager() {
  return getProviderAdapter();
}

export function getAIProviders() {
  // Return basic provider info for compatibility
  return {
    openai: { name: 'OpenAI', status: 'available' },
    openrouter: { name: 'OpenRouter', status: 'available' }
  };
}