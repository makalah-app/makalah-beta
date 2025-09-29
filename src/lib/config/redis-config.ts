/**
 * Redis Configuration and Client Management for Makalah AI
 * Implements Upstash Redis connection with performance optimization caching
 * 
 * Task 10 - Performance Optimization with Redis Caching
 * Integrates with existing database infrastructure from Tasks 07-09
 */

import { Redis } from '@upstash/redis';
import { env } from './env';

/**
 * Redis cache key prefixes for different data types
 */
export const REDIS_PREFIXES = {
  SESSION: 'session:',
  USER: 'user:',
  WORKFLOW: 'workflow:',
  ARTIFACT: 'artifact:',
  QUERY_CACHE: 'query:',
  AI_INTERACTION: 'ai:',
  PERFORMANCE: 'perf:',
  RATE_LIMIT: 'rate:',
  HEALTH_CHECK: 'health:',
} as const;

/**
 * Redis TTL strategies for different data types (in seconds)
 */
export const TTL_STRATEGIES = {
  SESSION: env.REDIS_SESSION_TTL, // 24 hours
  USER_DATA: env.REDIS_DEFAULT_TTL, // 1 hour
  WORKFLOW_STATE: env.REDIS_DEFAULT_TTL, // 1 hour
  ARTIFACT_CACHE: env.REDIS_ARTIFACT_TTL, // 2 hours
  QUERY_CACHE: env.REDIS_DEFAULT_TTL, // 1 hour
  AI_RESPONSE: 7200, // 2 hours
  PERFORMANCE_METRICS: 1800, // 30 minutes
  RATE_LIMIT: 3600, // 1 hour
  HEALTH_CHECK: 300, // 5 minutes
  TEMPORARY: 600, // 10 minutes
  DEFAULT: env.REDIS_DEFAULT_TTL, // 1 hour - fallback default
} as const;

/**
 * Redis client configuration with error handling and retry logic
 */
export class RedisManager {
  private static instance: RedisManager;
  private redis: Redis;
  private isHealthy: boolean = false;
  private lastHealthCheck: number = 0;

  private constructor() {
    this.redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
      retry: {
        retries: env.REDIS_MAX_RETRIES,
        backoff: (retryCount: number) => Math.min(200 * Math.pow(2, retryCount), 3000),
      },
      automaticDeserialization: true,
    });

    // Initialize health check
    this.initializeHealthCheck();
  }

  /**
   * Get singleton Redis manager instance
   */
  public static getInstance(): RedisManager {
    if (!RedisManager.instance) {
      RedisManager.instance = new RedisManager();
    }
    return RedisManager.instance;
  }

  /**
   * Get Redis client instance
   */
  public getClient(): Redis {
    return this.redis;
  }

  /**
   * Initialize health check monitoring
   */
  private async initializeHealthCheck(): Promise<void> {
    try {
      await this.performHealthCheck();
      // Redis connection established successfully - silent handling for production
    } catch (error) {
      // Redis connection failed - silent handling for production
      this.isHealthy = false;
    }
  }

  /**
   * Perform Redis health check
   */
  public async performHealthCheck(): Promise<boolean> {
    const now = Date.now();
    
    // Skip if checked within last 30 seconds
    if (this.isHealthy && (now - this.lastHealthCheck) < 30000) {
      return this.isHealthy;
    }

    try {
      const testKey = `${REDIS_PREFIXES.HEALTH_CHECK}${Date.now()}`;
      const testValue = 'health-check';
      
      // Test write and read
      await this.redis.set(testKey, testValue, { ex: TTL_STRATEGIES.HEALTH_CHECK });
      const result = await this.redis.get(testKey);
      
      if (result === testValue) {
        this.isHealthy = true;
        this.lastHealthCheck = now;
        
        // Clean up test key
        await this.redis.del(testKey);
        
        return true;
      }
      
      this.isHealthy = false;
      return false;
    } catch (error) {
      // Redis health check failed - silent handling for production
      this.isHealthy = false;
      return false;
    }
  }

  /**
   * Check if Redis is healthy
   */
  public isRedisHealthy(): boolean {
    return this.isHealthy;
  }

  /**
   * Get formatted cache key
   */
  public formatKey(prefix: keyof typeof REDIS_PREFIXES, identifier: string): string {
    return `${REDIS_PREFIXES[prefix]}${identifier}`;
  }

  /**
   * Set cache with automatic TTL
   */
  public async setCache<T>(
    key: string,
    value: T,
    ttl?: number
  ): Promise<boolean> {
    try {
      if (!this.isHealthy) {
        // Redis not healthy, cache set skipped - silent handling for production
        return false;
      }

      const expirationTime = ttl || TTL_STRATEGIES.TEMPORARY;
      await this.redis.set(key, value, { ex: expirationTime });
      
      return true;
    } catch (error) {
      // Redis cache set failed - silent handling for production
      return false;
    }
  }

  /**
   * Get cache with type safety
   */
  public async getCache<T>(key: string): Promise<T | null> {
    try {
      if (!this.isHealthy) {
        // Redis not healthy, cache get skipped - silent handling for production
        return null;
      }

      const result = await this.redis.get<T>(key);
      return result;
    } catch (error) {
      // Redis cache get failed - silent handling for production
      return null;
    }
  }

  /**
   * Delete cache entry
   */
  public async deleteCache(key: string): Promise<boolean> {
    try {
      if (!this.isHealthy) {
        // Redis not healthy, cache delete skipped - silent handling for production
        return false;
      }

      const result = await this.redis.del(key);
      return result > 0;
    } catch (error) {
      // Redis cache delete failed - silent handling for production
      return false;
    }
  }

  /**
   * Delete multiple cache entries by pattern
   */
  public async deleteCachePattern(pattern: string): Promise<number> {
    try {
      if (!this.isHealthy) {
        // Redis not healthy, pattern delete skipped - silent handling for production
        return 0;
      }

      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }

      const result = await this.redis.del(...keys);
      return result;
    } catch (error) {
      // Redis pattern delete failed - silent handling for production
      return 0;
    }
  }

  /**
   * Check if key exists in cache
   */
  public async hasCache(key: string): Promise<boolean> {
    try {
      if (!this.isHealthy) {
        return false;
      }

      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch (error) {
      // Redis exists check failed - silent handling for production
      return false;
    }
  }

  /**
   * Get cache TTL (time to live)
   */
  public async getCacheTTL(key: string): Promise<number | null> {
    try {
      if (!this.isHealthy) {
        return null;
      }

      const ttl = await this.redis.ttl(key);
      return ttl;
    } catch (error) {
      // Redis TTL check failed - silent handling for production
      return null;
    }
  }

  /**
   * Extend cache TTL
   */
  public async extendCacheTTL(key: string, additionalSeconds: number): Promise<boolean> {
    try {
      if (!this.isHealthy) {
        return false;
      }

      const currentTtl = await this.redis.ttl(key);
      if (currentTtl <= 0) {
        return false; // Key doesn't exist or has no expiration
      }

      const newTtl = currentTtl + additionalSeconds;
      const result = await this.redis.expire(key, newTtl);
      return result === 1;
    } catch (error) {
      // Redis TTL extend failed - silent handling for production
      return false;
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  public async getCacheStats(): Promise<{
    isHealthy: boolean;
    lastHealthCheck: Date;
    memoryUsage?: string;
    keyCount?: number;
  }> {
    const stats = {
      isHealthy: this.isHealthy,
      lastHealthCheck: new Date(this.lastHealthCheck),
    };

    try {
      if (this.isHealthy) {
        // Get memory info (if available) - DISABLED: Upstash Redis doesn't support info command
        // const info = await this.redis.info('memory');
        return {
          ...stats,
          memoryUsage: 'N/A - info command not supported',
        };
      }
    } catch (error) {
      // Failed to get Redis stats - silent handling for production
    }

    return stats;
  }
}

/**
 * Get Redis manager singleton instance
 */
export const redisManager = RedisManager.getInstance();

/**
 * Direct Redis client access for advanced operations
 */
export const redis = redisManager.getClient();

/**
 * Cache utilities for common operations
 */
export const cacheUtils = {
  formatKey: (prefix: keyof typeof REDIS_PREFIXES, id: string) => 
    redisManager.formatKey(prefix, id),
  
  set: <T>(key: string, value: T, ttl?: number) => 
    redisManager.setCache(key, value, ttl),
  
  get: <T>(key: string) => 
    redisManager.getCache<T>(key),
  
  del: (key: string) => 
    redisManager.deleteCache(key),
  
  exists: (key: string) => 
    redisManager.hasCache(key),
  
  ttl: (key: string) => 
    redisManager.getCacheTTL(key),
  
  isHealthy: () => 
    redisManager.isRedisHealthy(),
  
  healthCheck: () => 
    redisManager.performHealthCheck(),
};