/**
 * API KEY ROTATION SYSTEM
 *
 * Automated and manual API key rotation with notifications and rollback
 * Supports multiple providers with different rotation strategies
 */

import { getSecretsManager, type SecretsManager } from './secrets-manager';
import { supabaseAdmin } from '../database/supabase-client';

interface ProviderConfig {
  name: string;
  apiEndpoint?: string;
  rotationUrl?: string;
  testEndpoint: string;
  keyFormat: RegExp;
  rotationIntervalDays: number;
  warningDays: number;
  supportedEnvironments: ('development' | 'staging' | 'production')[];
}

interface RotationResult {
  success: boolean;
  oldKeyId?: string;
  newKeyId?: string;
  message: string;
  timestamp: Date;
  rollbackAvailable: boolean;
}

interface RotationStatus {
  provider: string;
  lastRotated?: Date;
  nextRotation: Date;
  warningDate: Date;
  status: 'healthy' | 'warning' | 'critical' | 'rotating';
  daysUntilRotation: number;
}

export class ApiKeyRotationManager {
  private secretsManager: SecretsManager;
  private supabase: any;

  // Provider configurations
  private providers: Record<string, ProviderConfig> = {
    openai: {
      name: 'OpenAI',
      apiEndpoint: 'https://api.openai.com/v1',
      testEndpoint: '/models',
      keyFormat: /^sk-proj-[A-Za-z0-9_-]+$/,
      rotationIntervalDays: 90,
      warningDays: 30,
      supportedEnvironments: ['development', 'staging', 'production']
    },
    openrouter: {
      name: 'OpenRouter',
      apiEndpoint: 'https://openrouter.ai/api/v1',
      testEndpoint: '/models',
      keyFormat: /^sk-or-v1-[A-Za-z0-9_-]+$/,
      rotationIntervalDays: 60,
      warningDays: 15,
      supportedEnvironments: ['development', 'staging', 'production']
    },
    github: {
      name: 'GitHub',
      apiEndpoint: 'https://api.github.com',
      testEndpoint: '/user',
      keyFormat: /^ghp_[A-Za-z0-9_-]{36}$/,
      rotationIntervalDays: 365,
      warningDays: 60,
      supportedEnvironments: ['development', 'production']
    }
  };

  constructor() {
    this.secretsManager = getSecretsManager();

    // Use singleton Supabase admin client to prevent multiple instances
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      this.supabase = supabaseAdmin;
    }
  }

  /**
   * Test if an API key is valid
   */
  async testApiKey(provider: string, apiKey: string): Promise<boolean> {
    const config = this.providers[provider];
    if (!config || !config.apiEndpoint) {
      return false;
    }

    try {
      const response = await fetch(`${config.apiEndpoint}${config.testEndpoint}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        method: 'GET',
        timeout: 10000
      } as any);

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check rotation status for all providers
   */
  async checkRotationStatus(environment?: string): Promise<RotationStatus[]> {
    const env = environment || process.env.NODE_ENV || 'development';
    const statuses: RotationStatus[] = [];

    for (const [providerKey, config] of Object.entries(this.providers)) {
      if (!config.supportedEnvironments.includes(env as any)) {
        continue;
      }

      const metadata = await this.secretsManager.getSecretMetadata(
        `${providerKey}_api_key`,
        providerKey,
        env as any
      );

      const now = new Date();
      const lastRotated = metadata?.last_rotated || metadata?.created_at || new Date(0);
      const nextRotation = new Date(lastRotated.getTime() + config.rotationIntervalDays * 24 * 60 * 60 * 1000);
      const warningDate = new Date(nextRotation.getTime() - config.warningDays * 24 * 60 * 60 * 1000);
      const daysUntilRotation = Math.ceil((nextRotation.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

      let status: RotationStatus['status'] = 'healthy';
      if (daysUntilRotation <= 0) {
        status = 'critical';
      } else if (now >= warningDate) {
        status = 'warning';
      }

      statuses.push({
        provider: providerKey,
        lastRotated,
        nextRotation,
        warningDate,
        status,
        daysUntilRotation
      });
    }

    return statuses;
  }

  /**
   * Manually rotate an API key
   */
  async rotateApiKey(
    provider: string,
    newApiKey: string,
    environment?: string,
    options: {
      testKey?: boolean;
      notifyUsers?: boolean;
      keepBackup?: boolean;
    } = {}
  ): Promise<RotationResult> {
    const {
      testKey = true,
      notifyUsers = true,
      keepBackup = true
    } = options;

    const env = environment || process.env.NODE_ENV || 'development';
    const config = this.providers[provider];

    if (!config) {
      return {
        success: false,
        message: `Unknown provider: ${provider}`,
        timestamp: new Date(),
        rollbackAvailable: false
      };
    }

    // Validate key format
    if (!config.keyFormat.test(newApiKey)) {
      return {
        success: false,
        message: `Invalid API key format for ${config.name}`,
        timestamp: new Date(),
        rollbackAvailable: false
      };
    }

    // Test new key if requested
    if (testKey) {
      const isValid = await this.testApiKey(provider, newApiKey);
      if (!isValid) {
        return {
          success: false,
          message: `New API key failed validation test for ${config.name}`,
          timestamp: new Date(),
          rollbackAvailable: false
        };
      }
    }

    try {
      // Get current key for backup
      let oldKeyId: string | undefined;
      if (keepBackup) {
        const currentKey = await this.secretsManager.getSecret(
          `${provider}_api_key`,
          provider,
          env as any
        );
        if (currentKey) {
          // Store backup
          oldKeyId = await this.secretsManager.storeSecret(
            `${provider}_api_key_backup`,
            currentKey,
            provider,
            {
              environment: env as any,
              expiresInDays: 30,
              replaceExisting: true
            }
          );
        }
      }

      // Rotate the key
      const newKeyId = await this.secretsManager.rotateSecret(
        `${provider}_api_key`,
        provider,
        newApiKey,
        env as any
      );

      // Log rotation
      await this.logRotation(provider, env, 'manual', true, 'Key rotated successfully');

      // Notify users if requested
      if (notifyUsers) {
        await this.notifyRotation(provider, env, 'success');
      }

      return {
        success: true,
        oldKeyId,
        newKeyId,
        message: `API key rotated successfully for ${config.name}`,
        timestamp: new Date(),
        rollbackAvailable: !!oldKeyId
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Log failed rotation
      await this.logRotation(provider, env, 'manual', false, errorMessage);

      return {
        success: false,
        message: `Rotation failed for ${config.name}: ${errorMessage}`,
        timestamp: new Date(),
        rollbackAvailable: false
      };
    }
  }

  /**
   * Rollback to previous API key
   */
  async rollbackApiKey(
    provider: string,
    environment?: string
  ): Promise<RotationResult> {
    const env = environment || process.env.NODE_ENV || 'development';

    try {
      // Get backup key
      const backupKey = await this.secretsManager.getSecret(
        `${provider}_api_key_backup`,
        provider,
        env as any
      );

      if (!backupKey) {
        return {
          success: false,
          message: `No backup key available for ${provider}`,
          timestamp: new Date(),
          rollbackAvailable: false
        };
      }

      // Test backup key
      const isValid = await this.testApiKey(provider, backupKey);
      if (!isValid) {
        return {
          success: false,
          message: `Backup key is no longer valid for ${provider}`,
          timestamp: new Date(),
          rollbackAvailable: false
        };
      }

      // Restore backup key
      const restoredKeyId = await this.secretsManager.rotateSecret(
        `${provider}_api_key`,
        provider,
        backupKey,
        env as any
      );

      // Log rollback
      await this.logRotation(provider, env, 'rollback', true, 'Key rolled back successfully');

      return {
        success: true,
        newKeyId: restoredKeyId,
        message: `API key rolled back successfully for ${provider}`,
        timestamp: new Date(),
        rollbackAvailable: false
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Log failed rollback
      await this.logRotation(provider, env, 'rollback', false, errorMessage);

      return {
        success: false,
        message: `Rollback failed for ${provider}: ${errorMessage}`,
        timestamp: new Date(),
        rollbackAvailable: false
      };
    }
  }

  /**
   * Generate rotation warnings for keys approaching expiration
   */
  async generateWarnings(): Promise<{
    critical: RotationStatus[];
    warnings: RotationStatus[];
    healthy: RotationStatus[];
  }> {
    const statuses = await this.checkRotationStatus();

    return {
      critical: statuses.filter(s => s.status === 'critical'),
      warnings: statuses.filter(s => s.status === 'warning'),
      healthy: statuses.filter(s => s.status === 'healthy')
    };
  }

  /**
   * Schedule automatic rotation for keys (would be called by cron job)
   */
  async scheduleRotations(): Promise<void> {
    const warnings = await this.generateWarnings();

    // Send notifications for critical keys
    for (const critical of warnings.critical) {
      await this.notifyRotation(critical.provider, 'production', 'critical');
    }

    // Send warnings for keys approaching expiration
    for (const warning of warnings.warnings) {
      await this.notifyRotation(warning.provider, 'production', 'warning');
    }

  }

  /**
   * Log rotation events
   */
  private async logRotation(
    provider: string,
    environment: string,
    type: 'manual' | 'automatic' | 'rollback',
    success: boolean,
    message: string
  ): Promise<void> {
    if (this.supabase) {
      try {
        await this.supabase
          .from('api_key_rotations')
          .insert({
            provider,
            environment,
            rotation_type: type,
            success,
            message,
            timestamp: new Date(),
            user_id: null // Would be set if user-initiated
          });
      } catch (error) {
      }
    }
  }

  /**
   * Send notifications about key rotations
   */
  private async notifyRotation(
    provider: string,
    environment: string,
    type: 'success' | 'warning' | 'critical'
  ): Promise<void> {
    const config = this.providers[provider];
    if (!config) return;

    const messages = {
      success: `✅ API key for ${config.name} has been rotated successfully in ${environment}`,
      warning: `⚠️ API key for ${config.name} in ${environment} needs rotation soon`,
      critical: `🚨 API key for ${config.name} in ${environment} has expired and needs immediate rotation`
    };

    // In a real implementation, this would send emails, Slack notifications, etc.

    // Log notification
    if (this.supabase) {
      try {
        await this.supabase
          .from('rotation_notifications')
          .insert({
            provider,
            environment,
            notification_type: type,
            message: messages[type],
            sent_at: new Date()
          });
      } catch (error) {
      }
    }
  }

  /**
   * Get rotation history for a provider
   */
  async getRotationHistory(
    provider: string,
    environment?: string,
    limit: number = 50
  ): Promise<any[]> {
    if (!this.supabase) {
      return [];
    }

    try {
      let query = this.supabase
        .from('api_key_rotations')
        .select('*')
        .eq('provider', provider)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (environment) {
        query = query.eq('environment', environment);
      }

      const { data, error } = await query;

      if (error) {
        return [];
      }

      return data || [];
    } catch (error) {
      return [];
    }
  }
}

// Global instance
let rotationManager: ApiKeyRotationManager;

export const getRotationManager = (): ApiKeyRotationManager => {
  if (!rotationManager) {
    rotationManager = new ApiKeyRotationManager();
  }
  return rotationManager;
};

// Utility functions
export const checkAllRotations = async () => {
  const manager = getRotationManager();
  return manager.generateWarnings();
};

export const rotateKey = async (
  provider: 'openai' | 'openrouter' | 'github',
  newKey: string,
  environment?: 'development' | 'staging' | 'production'
) => {
  const manager = getRotationManager();
  return manager.rotateApiKey(provider, newKey, environment);
};

export const rollbackKey = async (
  provider: 'openai' | 'openrouter' | 'github',
  environment?: 'development' | 'staging' | 'production'
) => {
  const manager = getRotationManager();
  return manager.rollbackApiKey(provider, environment);
};
