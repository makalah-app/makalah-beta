/* @ts-nocheck */
/**
 * API Key Encryption and Security Implementation
 * 
 * Task 2: Hybrid Provider Architecture - API Key Encryption and Security
 * 
 * SECURITY IMPLEMENTATION:
 * - AES-256-GCM encryption for API key storage in database
 * - Secure hint generation for UI display (first 10 chars + ***)
 * - Environment-aware crypto polyfill compatibility
 * - Comprehensive audit logging for all encryption/decryption operations
 * - Migration utility for transitioning environment variables to database
 * 
 * FEATURES:
 * - ApiKeyManager class with encrypt/decrypt/hint generation
 * - Secure key derivation using PBKDF2
 * - Environment-aware encryption key management
 * - One-time migration from .env.local to database
 * - Comprehensive error handling and security logging
 * 
 * INTEGRATION:
 * - Compatible with existing crypto-polyfill infrastructure
 * - Works with enhanced model_configs table (api_key_encrypted, api_key_hint)
 * - Supports provider_tools table API key storage
 * - Integration with admin configuration API
 */

import { getCrypto, getRandomBytes } from '@/lib/utils/crypto-polyfill';
import { supabaseAdmin } from '@/lib/database/supabase-client';

// ==================== TYPE DEFINITIONS ====================

export interface EncryptedKeyData {
  encryptedKey: string;
  hint: string;
  algorithm: string;
  keyDerivation: string;
  createdAt: string;
}

export interface DecryptionResult {
  plainKey: string;
  metadata: {
    algorithm: string;
    decryptedAt: string;
    keyLength: number;
  };
}

export interface MigrationResult {
  provider: string;
  migrated: boolean;
  error?: string;
  originalHint?: string;
}

export interface AuditLogEntry {
  operation: 'encrypt' | 'decrypt' | 'hint_generation' | 'migration' | 'initialization';
  provider: string;
  timestamp: string;
  success: boolean;
  error?: string;
  metadata?: any;
}

// ==================== SECURITY CONSTANTS ====================

const ENCRYPTION_ALGORITHM = 'AES-256-GCM';
const KEY_DERIVATION_ALGORITHM = 'PBKDF2';
const KEY_DERIVATION_ITERATIONS = 100000; // OWASP recommended minimum
const IV_LENGTH = 12; // 96 bits for GCM
const SALT_LENGTH = 32; // 256 bits
const TAG_LENGTH = 16; // 128 bits for GCM
const DERIVED_KEY_LENGTH = 32; // 256 bits

// Base key for PBKDF2 - in production, this should be from a secure vault
const ENCRYPTION_BASE_KEY = process.env.API_KEY_ENCRYPTION_SECRET || 'makalah-ai-api-key-encryption-base-2025';

/**
 * API Key Manager - Secure Encryption and Management
 * 
 * Provides enterprise-grade API key encryption, decryption, and hint generation
 * with comprehensive audit logging and environment-aware security.
 */
export class ApiKeyManager {
  private auditLogs: AuditLogEntry[] = [];

  constructor() {
    this.logAudit('initialization', 'system', true, { 
      algorithm: ENCRYPTION_ALGORITHM,
      keyDerivation: KEY_DERIVATION_ALGORITHM 
    });
  }

  /**
   * Encrypt API key using AES-256-GCM
   * 
   * @param plainKey - Plain text API key to encrypt
   * @returns Promise<string> - Base64 encoded encrypted data with metadata
   */
  async encryptKey(plainKey: string): Promise<string> {
    try {
      if (!plainKey || plainKey.length < 8) {
        throw new Error('Invalid API key: minimum length 8 characters required');
      }

      const crypto = getCrypto();
      
      // Generate random salt and IV
      const salt = getRandomBytes(SALT_LENGTH);
      const iv = getRandomBytes(IV_LENGTH);
      
      // Derive encryption key using PBKDF2
      const derivedKey = await this.deriveKey(ENCRYPTION_BASE_KEY, salt);
      
      // Encrypt the API key
      let ciphertext: Uint8Array;
      let authTag: Uint8Array;
      
      if ('subtle' in crypto && crypto.subtle) {
        // Web Crypto API implementation
        const cryptoKey = await crypto.subtle.importKey(
          'raw',
          derivedKey as any,
          { name: 'AES-GCM' },
          false,
          ['encrypt']
        );
        
        const encrypted = await crypto.subtle.encrypt(
          { name: 'AES-GCM', iv: iv as BufferSource },
          cryptoKey,
          new TextEncoder().encode(plainKey)
        );
        
        const encryptedArray = new Uint8Array(encrypted);
        ciphertext = encryptedArray.slice(0, -TAG_LENGTH);
        authTag = encryptedArray.slice(-TAG_LENGTH);
      } else {
        // Node.js crypto implementation
        const nodeCrypto = crypto as typeof import('crypto');
        const cipher = nodeCrypto.createCipheriv('aes-256-gcm', derivedKey, iv);
        cipher.setAAD(salt); // Additional authenticated data
        
        let encrypted = cipher.update(plainKey, 'utf8');
        const final = cipher.final();
        const encryptedBuffer = Buffer.concat([encrypted, final]);
        ciphertext = new Uint8Array(encryptedBuffer.buffer, encryptedBuffer.byteOffset, encryptedBuffer.byteLength);
        authTag = cipher.getAuthTag();
      }
      
      // Combine all components: version|salt|iv|ciphertext|tag
      const combined = new Uint8Array(
        1 + // version byte
        SALT_LENGTH + 
        IV_LENGTH + 
        ciphertext.length + 
        TAG_LENGTH
      );
      
      let offset = 0;
      combined.set([1], offset); // Version 1
      offset += 1;
      combined.set(salt, offset);
      offset += SALT_LENGTH;
      combined.set(iv, offset);
      offset += IV_LENGTH;
      combined.set(ciphertext, offset);
      offset += ciphertext.length;
      combined.set(authTag, offset);
      
      // Encode to base64
      const encrypted = btoa(String.fromCharCode.apply(null, Array.from(combined)));
      
      this.logAudit('encrypt', 'api_key', true, {
        keyLength: plainKey.length,
        encryptedLength: encrypted.length,
        algorithm: ENCRYPTION_ALGORITHM
      });
      
      return encrypted;
      
    } catch (error) {
      this.logAudit('encrypt', 'api_key', false, { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw new Error(`API key encryption failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Decrypt API key using AES-256-GCM
   * 
   * @param encryptedKey - Base64 encoded encrypted API key
   * @returns Promise<DecryptionResult> - Decrypted key with metadata
   */
  async decryptKey(encryptedKey: string): Promise<DecryptionResult> {
    try {
      if (!encryptedKey) {
        throw new Error('Encrypted key is required');
      }

      // Decode from base64
      const combined = new Uint8Array(
        atob(encryptedKey).split('').map(c => c.charCodeAt(0))
      );
      
      // Parse components
      let offset = 0;
      const version = combined[offset];
      offset += 1;
      
      if (version !== 1) {
        throw new Error(`Unsupported encryption version: ${version}`);
      }
      
      const salt = combined.slice(offset, offset + SALT_LENGTH);
      offset += SALT_LENGTH;
      const iv = combined.slice(offset, offset + IV_LENGTH);
      offset += IV_LENGTH;
      const ciphertext = combined.slice(offset, -TAG_LENGTH);
      const authTag = combined.slice(-TAG_LENGTH);
      
      // Derive the same key
      const derivedKey = await this.deriveKey(ENCRYPTION_BASE_KEY, salt);
      
      const crypto = getCrypto();
      let plaintext: string;
      
      if ('subtle' in crypto && crypto.subtle) {
        // Web Crypto API implementation
        const cryptoKey = await crypto.subtle.importKey(
          'raw',
          derivedKey as unknown as BufferSource,
          { name: 'AES-GCM' },
          false,
          ['decrypt']
        );
        
        // Combine ciphertext and tag for Web Crypto API
        const encryptedData = new Uint8Array(ciphertext.length + authTag.length);
        encryptedData.set(ciphertext);
        encryptedData.set(authTag, ciphertext.length);
        
        // @ts-ignore: WebCrypto BufferSource typing differences across environments
        const decrypted = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: iv },
          cryptoKey,
          encryptedData as any
        );
        
        plaintext = new TextDecoder().decode(decrypted);
      } else {
        // Node.js crypto implementation
        const nodeCrypto = crypto as typeof import('crypto');
        const decipher = nodeCrypto.createDecipheriv('aes-256-gcm', derivedKey, iv);
        decipher.setAAD(salt);
        decipher.setAuthTag(Buffer.from(authTag));
        
        let decrypted = decipher.update(Buffer.from(ciphertext), undefined, 'utf8');
        decrypted += decipher.final('utf8');
        plaintext = decrypted;
      }
      
      const result: DecryptionResult = {
        plainKey: plaintext,
        metadata: {
          algorithm: ENCRYPTION_ALGORITHM,
          decryptedAt: new Date().toISOString(),
          keyLength: plaintext.length
        }
      };
      
      this.logAudit('decrypt', 'api_key', true, {
        keyLength: plaintext.length,
        algorithm: ENCRYPTION_ALGORITHM
      });
      
      return result;
      
    } catch (error) {
      this.logAudit('decrypt', 'api_key', false, { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw new Error(`API key decryption failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Generate secure hint for UI display
   * Shows first 10 characters followed by '***'
   * 
   * @param key - API key (plain or encrypted)
   * @returns string - Secure hint for display
   */
  generateHint(key: string): string {
    try {
      if (!key || key.length < 8) {
        return 'Invalid key';
      }
      
      // Determine if key appears to be encrypted (base64) or plain
      const isEncrypted = /^[A-Za-z0-9+/]+=*$/.test(key) && key.length > 50;
      
      let hint: string;
      if (isEncrypted) {
        // For encrypted keys, use a generic format
        hint = 'encrypted-***';
      } else {
        // For plain keys, show first 10 characters
        const prefix = key.substring(0, Math.min(10, key.length));
        hint = `${prefix}***`;
      }
      
      this.logAudit('hint_generation', 'api_key', true, {
        originalLength: key.length,
        hintLength: hint.length,
        isEncrypted
      });
      
      return hint;
      
    } catch (error) {
      this.logAudit('hint_generation', 'api_key', false, { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return 'error-***';
    }
  }

  /**
   * Migrate existing environment API keys to database
   * 
   * @param providers - Array of provider names to migrate
   * @returns Promise<MigrationResult[]> - Migration results per provider
   */
  async migrateEnvironmentKeys(providers?: string[]): Promise<MigrationResult[]> {
    const defaultProviders = ['openai', 'openrouter'];
    const targetProviders = providers || defaultProviders;
    const results: MigrationResult[] = [];
    
    for (const provider of targetProviders) {
      try {
        // Get environment variable
        const envKey = `${provider.toUpperCase()}_API_KEY`;
        const plainKey = process.env[envKey];
        
        if (!plainKey) {
          results.push({
            provider,
            migrated: false,
            error: `Environment variable ${envKey} not found`
          });
          continue;
        }
        
        // Check if already migrated
        const { data: existingConfig, error: fetchError } = await supabaseAdmin
          .from('model_configs')
          .select('api_key_encrypted, api_key_hint')
          .eq('provider', provider)
          .eq('is_active', true)
          .maybeSingle();
        
        if (fetchError && fetchError.code !== 'PGRST116') {
          // PGRST116 is "not found", which is expected if no config exists
          throw fetchError;
        }
        
        const existing: any = existingConfig as any;
        if (existing?.api_key_encrypted) {
          results.push({
            provider,
            migrated: false,
            error: 'API key already migrated',
            originalHint: existing.api_key_hint
          });
          continue;
        }
        
        // Encrypt the key
        const encryptedKey = await this.encryptKey(plainKey);
        const hint = this.generateHint(plainKey);
        
        // Store in database
        const { error: upsertError } = await supabaseAdmin
          .from('model_configs')
          .upsert({
            provider,
            model_name: provider === 'openai' ? 'gpt-4o' : 'google/gemini-2.5-flash',
            temperature: 0.1,
            max_tokens: 4096,
            is_active: true,
            is_default: true,
            api_key_encrypted: encryptedKey,
            api_key_hint: hint,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as any, {
            onConflict: 'provider',
            ignoreDuplicates: false
          });
        
        if (upsertError) {
          throw upsertError;
        }
        
        results.push({
          provider,
          migrated: true,
          originalHint: hint
        });
        
        this.logAudit('migration', provider, true, {
          envKey,
          keyLength: plainKey.length,
          hint
        });
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          provider,
          migrated: false,
          error: errorMessage
        });
        
        this.logAudit('migration', provider, false, { 
          error: errorMessage 
        });
      }
    }
    
    return results;
  }

  /**
   * Derive encryption key using PBKDF2
   * 
   * @private
   * @param baseKey - Base key material
   * @param salt - Random salt
   * @returns Promise<Uint8Array> - Derived key
   */
  private async deriveKey(baseKey: string, salt: Uint8Array): Promise<Uint8Array> {
    const crypto = getCrypto();
    
    if ('subtle' in crypto && crypto.subtle) {
      // Web Crypto API implementation
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(baseKey),
        'PBKDF2',
        false,
        ['deriveBits']
      );
      
      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: KEY_DERIVATION_ITERATIONS,
          hash: 'SHA-256'
        },
        keyMaterial,
        DERIVED_KEY_LENGTH * 8 // bits
      );
      
      return new Uint8Array(derivedBits);
    } else {
      // Node.js crypto implementation
      const nodeCrypto = crypto as typeof import('crypto');
      const derived = nodeCrypto.pbkdf2Sync(
        baseKey,
        Buffer.from(salt),
        KEY_DERIVATION_ITERATIONS,
        DERIVED_KEY_LENGTH,
        'sha256'
      );
      return new Uint8Array(derived);
    }
  }

  /**
   * Log audit entry for security operations
   * 
   * @private
   * @param operation - Type of operation
   * @param provider - Provider context
   * @param success - Operation success status
   * @param metadata - Additional metadata
   */
  private logAudit(
    operation: AuditLogEntry['operation'],
    provider: string,
    success: boolean,
    metadata?: any
  ): void {
    const entry: AuditLogEntry = {
      operation,
      provider,
      timestamp: new Date().toISOString(),
      success,
      metadata
    };
    
    if (!success) {
      entry.error = metadata?.error || 'Operation failed';
    }
    
    this.auditLogs.push(entry);
    
    // Console logging for security operations
    const logLevel = success ? 'info' : 'error';
    const symbol = success ? '✅' : '❌';
    if (process.env.NODE_ENV === 'development') {
      console[logLevel](
        `${symbol} [API-KEY-SECURITY] ${operation.toUpperCase()} - ${provider}:`,
        success ? 'SUCCESS' : entry.error,
        metadata ? { metadata } : ''
      );
    }
  }

  /**
   * Get audit logs for security monitoring
   * 
   * @param operationType - Filter by operation type
   * @returns AuditLogEntry[] - Filtered audit logs
   */
  getAuditLogs(operationType?: AuditLogEntry['operation']): AuditLogEntry[] {
    if (operationType) {
      return this.auditLogs.filter(log => log.operation === operationType);
    }
    return [...this.auditLogs];
  }

  /**
   * Clear audit logs (for testing or cleanup)
   */
  clearAuditLogs(): void {
    this.auditLogs = [];
  }

  /**
   * Test encryption/decryption roundtrip
   * 
   * @param testKey - Test API key
   * @returns Promise<boolean> - Test success status
   */
  async testEncryptionRoundtrip(testKey?: string): Promise<boolean> {
    const testApiKey = testKey || 'sk-test-1234567890abcdefghijklmnopqrstuvwxyz';
    
    try {
      // Test encryption
      const encrypted = await this.encryptKey(testApiKey);
      console.log('🔐 Test encryption successful, encrypted length:', encrypted.length);
      
      // Test decryption
      const decrypted = await this.decryptKey(encrypted);
      console.log('🔓 Test decryption successful, key length:', decrypted.plainKey.length);
      
      // Test hint generation
      const hint = this.generateHint(testApiKey);
      console.log('💡 Test hint generation successful:', hint);
      
      // Verify roundtrip
      const success = decrypted.plainKey === testApiKey;
      console.log(success ? '✅ Roundtrip test PASSED' : '❌ Roundtrip test FAILED');
      
      return success;
      
    } catch (error) {
      console.error('❌ Roundtrip test ERROR:', error);
      return false;
    }
  }
}

// ==================== GLOBAL INSTANCE AND UTILITIES ====================

/**
 * Global API key manager instance
 */
export const apiKeyManager = new ApiKeyManager();

/**
 * Convenience function to encrypt API key
 */
export async function encryptAPIKey(plainKey: string): Promise<string> {
  return apiKeyManager.encryptKey(plainKey);
}

/**
 * Convenience function to decrypt API key
 */
export async function decryptAPIKey(encryptedKey: string): Promise<string> {
  const result = await apiKeyManager.decryptKey(encryptedKey);
  return result.plainKey;
}

/**
 * Convenience function to generate API key hint
 */
export function generateAPIKeyHint(key: string): string {
  return apiKeyManager.generateHint(key);
}

/**
 * Migration utility for one-time environment to database migration
 */
export async function migrateEnvironmentAPIKeys(): Promise<MigrationResult[]> {
  console.log('🚀 Starting API key migration from environment to database...');
  
  const results = await apiKeyManager.migrateEnvironmentKeys();
  
  const successful = results.filter(r => r.migrated).length;
  const total = results.length;
  
  console.log(`✅ Migration completed: ${successful}/${total} providers migrated successfully`);
  
  // Log detailed results
  results.forEach(result => {
    if (result.migrated) {
      console.log(`✅ ${result.provider.toUpperCase()}: Migrated successfully, hint: ${result.originalHint}`);
    } else {
      console.log(`❌ ${result.provider.toUpperCase()}: Failed - ${result.error}`);
    }
  });
  
  return results;
}

/**
 * Health check for API key encryption system
 */
export async function healthCheckEncryption(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  tests: Record<string, boolean>;
  message: string;
}> {
  const tests = {
    roundtripTest: false,
    cryptoAvailable: false,
    keyDerivation: false
  };
  
  try {
    // Test crypto availability
    getCrypto();
    tests.cryptoAvailable = true;
    
    // Test key derivation
    const testSalt = getRandomBytes(32);
    const manager = new ApiKeyManager();
    await (manager as any).deriveKey('test-key', testSalt);
    tests.keyDerivation = true;
    
    // Test full roundtrip
    tests.roundtripTest = await manager.testEncryptionRoundtrip();
    
    const healthyTests = Object.values(tests).filter(Boolean).length;
    const totalTests = Object.keys(tests).length;
    
    if (healthyTests === totalTests) {
      return { status: 'healthy', tests, message: 'All encryption systems operational' };
    } else if (healthyTests >= totalTests / 2) {
      return { status: 'degraded', tests, message: 'Some encryption systems degraded' };
    } else {
      return { status: 'unhealthy', tests, message: 'Critical encryption systems failing' };
    }
    
  } catch (error) {
    return { 
      status: 'unhealthy', 
      tests, 
      message: `Health check failed: ${error instanceof Error ? error.message : error}` 
    };
  }
}

/**
 * USAGE EXAMPLES:
 * 
 * // Basic encryption/decryption
 * const manager = new ApiKeyManager();
 * const encrypted = await manager.encryptKey('sk-1234567890abcdef');
 * const decrypted = await manager.decryptKey(encrypted);
 * 
 * // Generate hint for UI
 * const hint = manager.generateHint('sk-proj-abcdefghijk');
 * // Result: "sk-proj-ab***"
 * 
 * // Migration from environment
 * const results = await migrateEnvironmentAPIKeys();
 * 
 * // Health check
 * const health = await healthCheckEncryption();
 */
