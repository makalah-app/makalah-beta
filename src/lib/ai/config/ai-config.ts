/**
 * Academic AI Configuration Management System
 * 
 * Central configuration management for the academic AI system,
 * providing type-safe configuration for all AI services, personas,
 * prompts, and workflow phases.
 * 
 * Features:
 * - Type-safe configuration validation
 * - Environment-specific settings
 * - Dynamic configuration updates
 * - Performance optimization settings
 * - Integration with Vercel AI SDK
 * 
 * @module AiConfig
 * @version 1.0.0
 */

import { AcademicPhase } from '../types';

/**
 * Main AI system configuration
 */
export interface AiConfig {
  providers: ProviderConfig;
  prompts: PromptConfig;
  guardrails: GuardrailConfig;
  optimization: OptimizationConfig;
  qa: QualityAssuranceConfig;
  workflow: WorkflowConfig;
  integration: IntegrationConfig;
  monitoring: MonitoringConfig;
  security: SecurityConfig;
}

/**
 * AI provider configuration
 */
export interface ProviderConfig {
  primary: {
    provider: 'openrouter' | 'openai';
    model: string;
    apiKey: string;
    baseUrl?: string;
  };
  fallback: {
    provider: 'openrouter' | 'openai';
    model: string;
    apiKey: string;
    baseUrl?: string;
  };
  settings: {
    temperature: number;
    maxTokens: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
    timeout: number;
    retries: number;
  };
  rateLimit: {
    requestsPerMinute: number;
    tokensPerMinute: number;
    concurrent: number;
  };
}


/**
 * Prompt system configuration
 */
export interface PromptConfig {
  versioning: {
    enabled: boolean;
    strategy: 'semantic' | 'timestamp' | 'hash';
    defaultVersion: string;
  };
  optimization: {
    enabled: boolean;
    abTesting: boolean;
    performanceTracking: boolean;
    autoTuning: boolean;
  };
  templates: {
    baseDirectory: string;
    phases: Record<AcademicPhase, PromptPhaseConfig>;
  };
  validation: {
    enabled: boolean;
    strictMode: boolean;
    requiredFields: string[];
  };
}

/**
 * Phase-specific prompt configuration
 */
export interface PromptPhaseConfig {
  templates: string[];
  defaultTemplate: string;
  personaOverrides?: Record<string, string>;
  validation: {
    minTokens: number;
    maxTokens: number;
    requiredElements: string[];
  };
}

/**
 * Guardrail system configuration
 */
export interface GuardrailConfig {
  citationVerification: {
    enabled: boolean;
    strictMode: boolean;
    realTimeChecking: boolean;
    sources: {
      academic: boolean;
      government: boolean;
      news: boolean;
      books: boolean;
    };
    verification: {
      checkExistence: boolean;
      checkAccuracy: boolean;
      checkRelevance: boolean;
    };
  };
  hallucinationDetection: {
    enabled: boolean;
    sensitivity: 'low' | 'medium' | 'high' | 'maximum';
    realTimeDetection: boolean;
    factChecking: boolean;
    confidenceThreshold: number;
  };
  academicStandards: {
    enabled: boolean;
    level: 'undergraduate' | 'graduate' | 'doctoral' | 'postdoc';
    citationStyle: 'apa' | 'mla' | 'chicago' | 'harvard';
    languageStandards: {
      formality: boolean;
      terminology: boolean;
      structure: boolean;
    };
  };
  contentFiltering: {
    enabled: boolean;
    offensive: boolean;
    copyright: boolean;
    personal: boolean;
    sensitive: boolean;
  };
}

/**
 * Optimization configuration
 */
export interface OptimizationConfig {
  tokenOptimization: {
    enabled: boolean;
    strategy: 'aggressive' | 'balanced' | 'conservative';
    budgetLimits: Record<AcademicPhase, number>;
    compressionLevel: number;
  };
  responseOptimization: {
    enabled: boolean;
    caching: boolean;
    parallelProcessing: boolean;
    streamingOptimization: boolean;
  };
  promptOptimization: {
    enabled: boolean;
    abTesting: boolean;
    adaptiveTuning: boolean;
    performanceTracking: boolean;
  };
  contextOptimization: {
    enabled: boolean;
    memoryManagement: boolean;
    contextCompression: boolean;
    relevanceFiltering: boolean;
  };
}

/**
 * Quality assurance configuration
 */
export interface QualityAssuranceConfig {
  validation: {
    enabled: boolean;
    realTime: boolean;
    batch: boolean;
    phases: Record<AcademicPhase, boolean>;
  };
  testing: {
    enabled: boolean;
    automated: boolean;
    regressionTests: boolean;
    performanceTests: boolean;
  };
  monitoring: {
    enabled: boolean;
    personaConsistency: boolean;
    qualityMetrics: boolean;
    userSatisfaction: boolean;
  };
  reporting: {
    enabled: boolean;
    frequency: 'real-time' | 'hourly' | 'daily' | 'weekly';
    recipients: string[];
    format: 'json' | 'html' | 'pdf';
  };
}

/**
 * Workflow configuration
 */
export interface WorkflowConfig {
  phases: {
    enabled: Record<AcademicPhase, boolean>;
    required: Record<AcademicPhase, boolean>;
    timeouts: Record<AcademicPhase, number>;
  };
  approvalGates: {
    enabled: boolean;
    required: Record<AcademicPhase, boolean>;
    autoApproval: Record<AcademicPhase, boolean>;
    timeouts: Record<AcademicPhase, number>;
  };
  contextPropagation: {
    enabled: boolean;
    maxContextLength: number;
    compressionRatio: number;
    memoryRetention: number;
  };
  transitions: {
    automatic: boolean;
    validation: boolean;
    rollback: boolean;
  };
}

/**
 * Integration configuration
 */
export interface IntegrationConfig {
  database: {
    provider: 'supabase' | 'postgresql' | 'mysql';
    connection: string;
    poolSize: number;
    timeout: number;
  };
  storage: {
    provider: 'supabase' | 's3' | 'gcs';
    bucket: string;
    maxFileSize: number;
  };
  authentication: {
    provider: 'supabase' | 'auth0' | 'firebase';
    jwt: {
      secret: string;
      expirationTime: number;
    };
  };
  external: {
    apis: Record<string, ExternalApiConfig>;
    webhooks: WebhookConfig[];
  };
}

/**
 * External API configuration
 */
export interface ExternalApiConfig {
  baseUrl: string;
  apiKey?: string;
  timeout: number;
  retries: number;
  rateLimit: {
    requestsPerMinute: number;
    concurrent: number;
  };
}

/**
 * Webhook configuration
 */
export interface WebhookConfig {
  url: string;
  events: string[];
  secret?: string;
  timeout: number;
  retries: number;
}

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
  logging: {
    enabled: boolean;
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'text';
    destination: 'console' | 'file' | 'external';
  };
  metrics: {
    enabled: boolean;
    performance: boolean;
    usage: boolean;
    errors: boolean;
    customMetrics: string[];
  };
  alerting: {
    enabled: boolean;
    channels: ('email' | 'slack' | 'webhook')[];
    thresholds: {
      errorRate: number;
      responseTime: number;
      tokenUsage: number;
    };
  };
  analytics: {
    enabled: boolean;
    userBehavior: boolean;
    performanceAnalytics: boolean;
    qualityAnalytics: boolean;
  };
}

/**
 * Security configuration
 */
export interface SecurityConfig {
  authentication: {
    required: boolean;
    method: 'jwt' | 'oauth' | 'apikey';
    tokenExpiration: number;
  };
  authorization: {
    enabled: boolean;
    rbac: boolean;
    permissions: string[];
  };
  dataProtection: {
    encryption: boolean;
    anonymization: boolean;
    retention: number;
  };
  inputValidation: {
    enabled: boolean;
    sanitization: boolean;
    injectionPrevention: boolean;
  };
}

/**
 * Deep partial type for nested configuration objects
 */
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Environment-specific configurations
 */
export interface EnvironmentConfig {
  development: DeepPartial<AiConfig>;
  staging: DeepPartial<AiConfig>;
  production: DeepPartial<AiConfig>;
}

/**
 * Configuration validation schema
 */
export interface ConfigValidationSchema {
  required: (keyof AiConfig)[];
  optional: (keyof AiConfig)[];
  validators: Record<string, (value: any) => boolean>;
  defaults: Partial<AiConfig>;
}

/**
 * AI Configuration Service
 * 
 * Manages all AI system configuration with type safety and validation
 */
export class AiConfigService {
  private config: AiConfig;
  private environment: 'development' | 'staging' | 'production';
  private watchers: Map<string, (config: AiConfig) => void> = new Map();

  constructor(baseConfig: AiConfig, environment: string = 'development') {
    this.environment = environment as any;
    this.config = this.mergeEnvironmentConfig(baseConfig);
    this.validateConfiguration(this.config);
  }

  /**
   * Get complete configuration
   */
  getConfig(): AiConfig {
    return { ...this.config };
  }

  /**
   * Get specific configuration section
   */
  getSection<T extends keyof AiConfig>(section: T): AiConfig[T] {
    return this.config[section];
  }

  /**
   * Update configuration section
   */
  updateSection<T extends keyof AiConfig>(
    section: T, 
    updates: Partial<AiConfig[T]>
  ): void {
    this.config[section] = {
      ...this.config[section],
      ...updates
    };
    
    this.notifyWatchers();
  }

  /**
   * Update complete configuration
   */
  updateConfig(updates: Partial<AiConfig>): void {
    this.config = {
      ...this.config,
      ...updates
    };
    
    this.validateConfiguration(this.config);
    this.notifyWatchers();
  }

  /**
   * Watch for configuration changes
   */
  watch(key: string, callback: (config: AiConfig) => void): void {
    this.watchers.set(key, callback);
  }

  /**
   * Remove configuration watcher
   */
  unwatch(key: string): void {
    this.watchers.delete(key);
  }

  /**
   * Get environment-specific configuration
   */
  getEnvironmentConfig(): string {
    return this.environment;
  }

  /**
   * Validate configuration
   */
  private validateConfiguration(config: AiConfig): void {
    // Basic validation
    if (!config.providers?.primary?.model) {
      throw new Error('Primary AI provider model is required');
    }

    if (!config.providers?.primary?.apiKey) {
      throw new Error('Primary AI provider API key is required');
    }

    // Validate token limits
    if (config.providers.settings.maxTokens < 100) {
      throw new Error('Maximum tokens must be at least 100');
    }

    // Validate temperature range
    if (config.providers.settings.temperature < 0 || 
        config.providers.settings.temperature > 2) {
      throw new Error('Temperature must be between 0 and 2');
    }

    // Validate rate limits
    if (config.providers.rateLimit.requestsPerMinute < 1) {
      throw new Error('Rate limit must be at least 1 request per minute');
    }
  }

  /**
   * Merge environment-specific overrides
   */
  private mergeEnvironmentConfig(baseConfig: AiConfig): AiConfig {
    const envOverrides = this.getEnvironmentOverrides();
    return this.deepMerge(baseConfig, envOverrides);
  }

  /**
   * Get environment-specific overrides
   */
  private getEnvironmentOverrides(): DeepPartial<AiConfig> {
    switch (this.environment) {
      case 'development':
        return {
          providers: {
            settings: {
              temperature: 0.1,
              maxTokens: 8192,
              topP: 1,
              frequencyPenalty: 0,
              presencePenalty: 0,
              timeout: 30000,
              retries: 3
            }
          },
          guardrails: {
            citationVerification: {
              enabled: false,
              strictMode: false,
              realTimeChecking: false,
              sources: {
                academic: true,
                government: true,
                news: false,
                books: true
              },
              verification: {
                checkExistence: true,
                checkAccuracy: false,
                checkRelevance: true
              }
            }
          },
          monitoring: {
            logging: {
              enabled: true,
              level: 'debug' as const,
              format: 'json' as const,
              destination: 'console' as const
            }
          }
        };
      
      case 'staging':
        return {
          providers: {
            settings: {
              temperature: 0.1,
              maxTokens: 8192,
              topP: 1,
              frequencyPenalty: 0,
              presencePenalty: 0,
              timeout: 30000,
              retries: 3
            }
          },
          guardrails: {
            citationVerification: {
              enabled: true,
              strictMode: false,
              realTimeChecking: true,
              sources: {
                academic: true,
                government: true,
                news: false,
                books: true
              },
              verification: {
                checkExistence: true,
                checkAccuracy: false,
                checkRelevance: true
              }
            }
          }
        };
      
      case 'production':
        return {
          providers: {
            settings: {
              temperature: 0.1,
              maxTokens: 8192,
              topP: 1,
              frequencyPenalty: 0,
              presencePenalty: 0,
              timeout: 30000,
              retries: 3
            }
          },
          guardrails: {
            citationVerification: {
              enabled: true,
              strictMode: true,
              realTimeChecking: true,
              sources: {
                academic: true,
                government: true,
                news: false,
                books: true
              },
              verification: {
                checkExistence: true,
                checkAccuracy: true,
                checkRelevance: true
              }
            }
          },
          monitoring: {
            logging: {
              enabled: true,
              level: 'info' as const,
              format: 'json' as const,
              destination: 'console' as const
            }
          }
        };
      
      default:
        return {};
    }
  }

  /**
   * Deep merge two configuration objects
   */
  private deepMerge(base: any, override: any): any {
    const result = { ...base };
    
    for (const key in override) {
      if (override[key] && typeof override[key] === 'object' && !Array.isArray(override[key])) {
        result[key] = this.deepMerge(result[key] || {}, override[key]);
      } else {
        result[key] = override[key];
      }
    }
    
    return result;
  }

  /**
   * Notify configuration watchers
   */
  private notifyWatchers(): void {
    this.watchers.forEach((callback) => {
      try {
        callback(this.config);
      } catch (error) {
      }
    });
  }

  /**
   * Export configuration for backup
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration from backup
   */
  importConfig(configJson: string): void {
    try {
      const imported = JSON.parse(configJson);
      this.validateConfiguration(imported);
      this.config = imported;
      this.notifyWatchers();
    } catch (error) {
      throw new Error(`Failed to import configuration: ${error}`);
    }
  }

  /**
   * Reset to default configuration
   */
  resetToDefaults(): void {
    this.config = createDefaultConfig();
    this.notifyWatchers();
  }
}

/**
 * Create default AI configuration
 */
export function createDefaultConfig(): AiConfig {
  return {
    providers: {
      primary: {
        provider: 'openrouter',
        model: 'google/gemini-2.5-flash',
        apiKey: process.env.OPENROUTER_API_KEY || '',
        baseUrl: 'https://openrouter.ai/api/v1'
      },
      fallback: {
        provider: 'openai',
        model: 'gpt-4o-mini',
        apiKey: process.env.OPENAI_API_KEY || ''
      },
      settings: {
        temperature: 0.1,
        maxTokens: 8192,
        topP: 1,
        frequencyPenalty: 0,
        presencePenalty: 0,
        timeout: 30000,
        retries: 3
      },
      rateLimit: {
        requestsPerMinute: 60,
        tokensPerMinute: 100000,
        concurrent: 5
      }
    },
    prompts: {
      versioning: {
        enabled: true,
        strategy: 'semantic',
        defaultVersion: '1.0.0'
      },
      optimization: {
        enabled: true,
        abTesting: false,
        performanceTracking: true,
        autoTuning: false
      },
      templates: {
        baseDirectory: '/src/lib/ai/prompts/templates',
        phases: {
          research_analysis: {
            templates: ['literature-review', 'source-analysis'],
            defaultTemplate: 'literature-review',
            validation: { minTokens: 200, maxTokens: 2000, requiredElements: ['citations'] }
          },
          outline_generation: {
            templates: ['structure-planning', 'outline-generation'],
            defaultTemplate: 'structure-planning',
            validation: { minTokens: 100, maxTokens: 1000, requiredElements: ['structure'] }
          },
          content_drafting: {
            templates: ['content-generation', 'section-writing'],
            defaultTemplate: 'content-generation',
            validation: { minTokens: 300, maxTokens: 3000, requiredElements: ['content', 'citations'] }
          },
          citation_integration: {
            templates: ['citation-formatting', 'reference-management'],
            defaultTemplate: 'citation-formatting',
            validation: { minTokens: 50, maxTokens: 1000, requiredElements: ['citations'] }
          },
          structure_refinement: {
            templates: ['structure-review', 'coherence-check'],
            defaultTemplate: 'structure-review',
            validation: { minTokens: 200, maxTokens: 2000, requiredElements: ['feedback'] }
          },
          quality_review: {
            templates: ['quality-review'], // Removed 'academic-validation' (deleted with qa/ directory)
            defaultTemplate: 'quality-review',
            validation: { minTokens: 200, maxTokens: 2000, requiredElements: ['feedback'] }
          },
          final_formatting: {
            templates: ['final-polish', 'submission-prep'],
            defaultTemplate: 'final-polish',
            validation: { minTokens: 100, maxTokens: 1500, requiredElements: ['polish'] }
          }
        }
      },
      validation: {
        enabled: true,
        strictMode: false,
        requiredFields: ['template', 'persona', 'phase']
      }
    },
    guardrails: {
      citationVerification: {
        enabled: true,
        strictMode: false,
        realTimeChecking: true,
        sources: {
          academic: true,
          government: true,
          news: false,
          books: true
        },
        verification: {
          checkExistence: true,
          checkAccuracy: false,
          checkRelevance: true
        }
      },
      hallucinationDetection: {
        enabled: true,
        sensitivity: 'medium',
        realTimeDetection: true,
        factChecking: false,
        confidenceThreshold: 0.8
      },
      academicStandards: {
        enabled: true,
        level: 'graduate',
        citationStyle: 'apa',
        languageStandards: {
          formality: true,
          terminology: true,
          structure: true
        }
      },
      contentFiltering: {
        enabled: true,
        offensive: true,
        copyright: true,
        personal: true,
        sensitive: true
      }
    },
    optimization: {
      tokenOptimization: {
        enabled: true,
        strategy: 'balanced',
        budgetLimits: {
          research_analysis: 5000,
          outline_generation: 2000,
          content_drafting: 10000,
          citation_integration: 1500,
          structure_refinement: 3000,
          quality_review: 3000,
          final_formatting: 2000
        },
        compressionLevel: 0.7
      },
      responseOptimization: {
        enabled: true,
        caching: false,
        parallelProcessing: false,
        streamingOptimization: true
      },
      promptOptimization: {
        enabled: true,
        abTesting: false,
        adaptiveTuning: false,
        performanceTracking: true
      },
      contextOptimization: {
        enabled: true,
        memoryManagement: true,
        contextCompression: true,
        relevanceFiltering: true
      }
    },
    qa: {
      validation: {
        enabled: true,
        realTime: true,
        batch: false,
        phases: {
          research_analysis: true,
          outline_generation: true,
          content_drafting: true,
          citation_integration: true,
          structure_refinement: true,
          quality_review: true,
          final_formatting: true
        }
      },
      testing: {
        enabled: false,
        automated: false,
        regressionTests: false,
        performanceTests: false
      },
      monitoring: {
        enabled: true,
        personaConsistency: true,
        qualityMetrics: true,
        userSatisfaction: false
      },
      reporting: {
        enabled: false,
        frequency: 'daily',
        recipients: [],
        format: 'json'
      }
    },
    workflow: {
      phases: {
        enabled: {
          research_analysis: true,
          outline_generation: true,
          content_drafting: true,
          citation_integration: true,
          structure_refinement: true,
          quality_review: true,
          final_formatting: true
        },
        required: {
          research_analysis: true,
          outline_generation: true,
          content_drafting: true,
          citation_integration: false,
          structure_refinement: false,
          quality_review: false,
          final_formatting: false
        },
        timeouts: {
          research_analysis: 600000,     // 10 minutes
          outline_generation: 300000,    // 5 minutes
          content_drafting: 900000,      // 15 minutes
          citation_integration: 300000,  // 5 minutes
          structure_refinement: 600000,  // 10 minutes
          quality_review: 600000,        // 10 minutes
          final_formatting: 300000       // 5 minutes
        }
      },
      approvalGates: {
        enabled: true,
        required: {
          research_analysis: true,
          outline_generation: true,
          content_drafting: false,
          citation_integration: false,
          structure_refinement: true,
          quality_review: true,
          final_formatting: true
        },
        autoApproval: {
          research_analysis: false,
          outline_generation: false,
          content_drafting: true,
          citation_integration: true,
          structure_refinement: false,
          quality_review: false,
          final_formatting: false
        },
        timeouts: {
          research_analysis: 86400000,   // 24 hours
          outline_generation: 86400000,  // 24 hours
          content_drafting: 3600000,     // 1 hour
          citation_integration: 3600000, // 1 hour
          structure_refinement: 86400000, // 24 hours
          quality_review: 86400000,      // 24 hours
          final_formatting: 86400000     // 24 hours
        }
      },
      contextPropagation: {
        enabled: true,
        maxContextLength: 8000,
        compressionRatio: 0.5,
        memoryRetention: 7
      },
      transitions: {
        automatic: false,
        validation: true,
        rollback: true
      }
    },
    integration: {
      database: {
        provider: 'supabase',
        connection: process.env.SUPABASE_URL || '',
        poolSize: 10,
        timeout: 30000
      },
      storage: {
        provider: 'supabase',
        bucket: 'makalah-storage',
        maxFileSize: 10485760 // 10MB
      },
      authentication: {
        provider: 'supabase',
        jwt: {
          secret: process.env.JWT_SECRET || '',
          expirationTime: 86400000 // 24 hours
        }
      },
      external: {
        apis: {},
        webhooks: []
      }
    },
    monitoring: {
      logging: {
        enabled: true,
        level: 'info',
        format: 'json',
        destination: 'console'
      },
      metrics: {
        enabled: true,
        performance: true,
        usage: true,
        errors: true,
        customMetrics: []
      },
      alerting: {
        enabled: false,
        channels: [],
        thresholds: {
          errorRate: 0.05,
          responseTime: 10000,
          tokenUsage: 50000
        }
      },
      analytics: {
        enabled: false,
        userBehavior: false,
        performanceAnalytics: false,
        qualityAnalytics: false
      }
    },
    security: {
      authentication: {
        required: true,
        method: 'jwt',
        tokenExpiration: 86400000
      },
      authorization: {
        enabled: true,
        rbac: false,
        permissions: ['read', 'write', 'admin']
      },
      dataProtection: {
        encryption: false,
        anonymization: false,
        retention: 2592000000 // 30 days
      },
      inputValidation: {
        enabled: true,
        sanitization: true,
        injectionPrevention: true
      }
    }
  };
}

/**
 * Global configuration service instance
 */
export const aiConfigService = new AiConfigService(createDefaultConfig());
