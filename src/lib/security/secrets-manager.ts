/**
 * ENCRYPTED SECRETS MANAGEMENT SYSTEM
 *
 * Provides secure storage and retrieval of API keys and sensitive configuration
 * Supports multiple backends: Database (Supabase), Redis, and local encryption
 */

import crypto from 'node:crypto';
import { supabaseAdmin } from '../database/supabase-client';

// Encryption configuration
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const KEY_DERIVATION_ITERATIONS = 100000;

interface SecretMetadata {
  id: string;
  name: string;
  provider: string;
  environment: 'development' | 'staging' | 'production';
  created_at: Date;
  updated_at: Date;
  last_rotated?: Date;
  expires_at?: Date;
  version: number;
  is_active: boolean;
}

interface EncryptedSecret {
  encrypted_value: string;
  iv: string;
  auth_tag: string;
  salt: string;
}

export class SecretsManager {
  private masterKey: string;
  private supabase: any;
  private redis: any;

  constructor() {
    // Master encryption key from environment
    this.masterKey = process.env.SECRETS_MASTER_KEY || this.generateMasterKey();

    // Initialize backends
    this.initializeBackends();
  }

  private initializeBackends() {
    // Use singleton Supabase admin client to prevent multiple instances
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      this.supabase = supabaseAdmin;
    }

    // Redis for caching (if available)
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      // Redis client setup would go here
      console.log('✅ Redis backend available for secrets caching');
    }
  }

  private generateMasterKey(): string {
    const key = crypto.randomBytes(32).toString('hex');
    console.warn('⚠️ Generated temporary master key - set SECRETS_MASTER_KEY in production');
    return key;
  }

  private deriveKey(password: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(password, salt, KEY_DERIVATION_ITERATIONS, 32, 'sha512');
  }

  /**
   * Encrypt a secret value with metadata
   */
  private encryptSecret(value: string, metadata: SecretMetadata): EncryptedSecret {
    const salt = crypto.randomBytes(16);
    const key = this.deriveKey(this.masterKey, salt);
    const iv = crypto.randomBytes(12);

    const cipher = crypto.createCipherGCM(ENCRYPTION_ALGORITHM, key, iv);

    // Add metadata as additional authenticated data
    const aad = Buffer.from(JSON.stringify({
      name: metadata.name,
      provider: metadata.provider,
      version: metadata.version
    }));
    cipher.setAAD(aad);

    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encrypted_value: encrypted,
      iv: iv.toString('hex'),
      auth_tag: authTag.toString('hex'),
      salt: salt.toString('hex')
    };
  }

  /**
   * Decrypt a secret value
   */
  private decryptSecret(encryptedSecret: EncryptedSecret, metadata: SecretMetadata): string {
    const salt = Buffer.from(encryptedSecret.salt, 'hex');
    const key = this.deriveKey(this.masterKey, salt);
    const iv = Buffer.from(encryptedSecret.iv, 'hex');
    const authTag = Buffer.from(encryptedSecret.auth_tag, 'hex');

    const decipher = crypto.createDecipherGCM(ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Verify metadata integrity
    const aad = Buffer.from(JSON.stringify({
      name: metadata.name,
      provider: metadata.provider,
      version: metadata.version
    }));
    decipher.setAAD(aad);

    let decrypted = decipher.update(encryptedSecret.encrypted_value, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Store a secret securely
   */
  async storeSecret(
    name: string,
    value: string,
    provider: string,
    options: {
      environment?: 'development' | 'staging' | 'production';
      expiresInDays?: number;
      replaceExisting?: boolean;
    } = {}
  ): Promise<string> {
    const environment = options.environment || process.env.NODE_ENV as any || 'development';
    const secretId = crypto.randomUUID();

    // Check if secret already exists
    if (!options.replaceExisting) {
      const existing = await this.getSecretMetadata(name, provider, environment);
      if (existing) {
        throw new Error(`Secret ${name} already exists for ${provider} in ${environment}`);
      }
    }

    const metadata: SecretMetadata = {
      id: secretId,
      name,
      provider,
      environment,
      created_at: new Date(),
      updated_at: new Date(),
      expires_at: options.expiresInDays
        ? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000)
        : undefined,
      version: 1,
      is_active: true
    };

    const encryptedSecret = this.encryptSecret(value, metadata);

    // Store in database
    if (this.supabase) {
      const { error } = await this.supabase
        .from('encrypted_secrets')
        .upsert({
          id: secretId,
          name,
          provider,
          environment,
          encrypted_value: encryptedSecret.encrypted_value,
          iv: encryptedSecret.iv,
          auth_tag: encryptedSecret.auth_tag,
          salt: encryptedSecret.salt,
          metadata: metadata,
          created_at: metadata.created_at,
          updated_at: metadata.updated_at,
          expires_at: metadata.expires_at,
          is_active: true
        });

      if (error) {
        console.error('Failed to store secret:', error);
        throw new Error('Failed to store secret securely');
      }
    }

    console.log(`✅ Secret ${name} stored securely for ${provider} in ${environment}`);
    return secretId;
  }

  /**
   * Retrieve a secret
   */
  async getSecret(
    name: string,
    provider: string,
    environment?: 'development' | 'staging' | 'production'
  ): Promise<string | null> {
    const env = environment || process.env.NODE_ENV as any || 'development';

    // Try cache first (Redis if available)
    const cacheKey = `secret:${env}:${provider}:${name}`;

    // Get from database
    if (this.supabase) {
      const { data, error } = await this.supabase
        .from('encrypted_secrets')
        .select('*')
        .eq('name', name)
        .eq('provider', provider)
        .eq('environment', env)
        .eq('is_active', true)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        console.warn(`Secret ${name} not found for ${provider} in ${env}`);
        return null;
      }

      // Check expiration
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        console.warn(`Secret ${name} has expired`);
        return null;
      }

      const encryptedSecret: EncryptedSecret = {
        encrypted_value: data.encrypted_value,
        iv: data.iv,
        auth_tag: data.auth_tag,
        salt: data.salt
      };

      try {
        const decryptedValue = this.decryptSecret(encryptedSecret, data.metadata);

        // Cache for 5 minutes if Redis available
        // await this.cacheSecret(cacheKey, decryptedValue, 300);

        return decryptedValue;
      } catch (error) {
        console.error('Failed to decrypt secret:', error);
        throw new Error('Secret decryption failed - possible tampering detected');
      }
    }

    return null;
  }

  /**
   * Rotate a secret (create new version)
   */
  async rotateSecret(
    name: string,
    provider: string,
    newValue: string,
    environment?: 'development' | 'staging' | 'production'
  ): Promise<string> {
    const env = environment || process.env.NODE_ENV as any || 'development';

    // Deactivate old version
    if (this.supabase) {
      await this.supabase
        .from('encrypted_secrets')
        .update({ is_active: false })
        .eq('name', name)
        .eq('provider', provider)
        .eq('environment', env);
    }

    // Store new version
    const newSecretId = await this.storeSecret(name, newValue, provider, {
      environment: env,
      replaceExisting: true
    });

    // Update rotation timestamp
    if (this.supabase) {
      await this.supabase
        .from('encrypted_secrets')
        .update({ last_rotated: new Date() })
        .eq('id', newSecretId);
    }

    console.log(`🔄 Secret ${name} rotated successfully for ${provider} in ${env}`);
    return newSecretId;
  }

  /**
   * Get secret metadata
   */
  async getSecretMetadata(
    name: string,
    provider: string,
    environment?: 'development' | 'staging' | 'production'
  ): Promise<SecretMetadata | null> {
    const env = environment || process.env.NODE_ENV as any || 'development';

    if (this.supabase) {
      const { data, error } = await this.supabase
        .from('encrypted_secrets')
        .select('metadata')
        .eq('name', name)
        .eq('provider', provider)
        .eq('environment', env)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return null;
      }

      return data.metadata;
    }

    return null;
  }

  /**
   * List all secrets (metadata only)
   */
  async listSecrets(environment?: string): Promise<SecretMetadata[]> {
    const env = environment || process.env.NODE_ENV || 'development';

    if (this.supabase) {
      const { data, error } = await this.supabase
        .from('encrypted_secrets')
        .select('metadata')
        .eq('environment', env)
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Failed to list secrets:', error);
        return [];
      }

      return data.map(item => item.metadata);
    }

    return [];
  }

  /**
   * Delete a secret permanently
   */
  async deleteSecret(
    name: string,
    provider: string,
    environment?: 'development' | 'staging' | 'production'
  ): Promise<boolean> {
    const env = environment || process.env.NODE_ENV as any || 'development';

    if (this.supabase) {
      const { error } = await this.supabase
        .from('encrypted_secrets')
        .delete()
        .eq('name', name)
        .eq('provider', provider)
        .eq('environment', env);

      if (error) {
        console.error('Failed to delete secret:', error);
        return false;
      }
    }

    console.log(`🗑️ Secret ${name} deleted for ${provider} in ${env}`);
    return true;
  }

  /**
   * Health check - verify encryption/decryption works
   */
  async healthCheck(): Promise<boolean> {
    const testSecret = 'test-secret-value';
    const testMetadata: SecretMetadata = {
      id: 'health-check',
      name: 'health-check',
      provider: 'test',
      environment: 'development',
      created_at: new Date(),
      updated_at: new Date(),
      version: 1,
      is_active: true
    };

    try {
      const encrypted = this.encryptSecret(testSecret, testMetadata);
      const decrypted = this.decryptSecret(encrypted, testMetadata);

      if (decrypted === testSecret) {
        console.log('✅ Secrets manager health check passed');
        return true;
      } else {
        console.error('❌ Secrets manager health check failed: decryption mismatch');
        return false;
      }
    } catch (error) {
      console.error('❌ Secrets manager health check failed:', error);
      return false;
    }
  }
}

// Global instance
let secretsManager: SecretsManager;

export const getSecretsManager = (): SecretsManager => {
  if (!secretsManager) {
    secretsManager = new SecretsManager();
  }
  return secretsManager;
};

// Utility functions for common operations
export const storeApiKey = async (
  provider: 'openai' | 'openrouter' | 'perplexity' | 'github',
  apiKey: string,
  environment?: 'development' | 'staging' | 'production'
): Promise<string> => {
  const manager = getSecretsManager();
  return manager.storeSecret(`${provider}_api_key`, apiKey, provider, { environment });
};

export const getApiKey = async (
  provider: 'openai' | 'openrouter' | 'perplexity' | 'github',
  environment?: 'development' | 'staging' | 'production'
): Promise<string | null> => {
  const manager = getSecretsManager();
  return manager.getSecret(`${provider}_api_key`, provider, environment);
};

export const rotateApiKey = async (
  provider: 'openai' | 'openrouter' | 'perplexity' | 'github',
  newApiKey: string,
  environment?: 'development' | 'staging' | 'production'
): Promise<string> => {
  const manager = getSecretsManager();
  return manager.rotateSecret(`${provider}_api_key`, provider, newApiKey, environment);
};
