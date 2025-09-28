/**
 * Rate Limiting Middleware for AI API Calls
 * Implements token bucket algorithm with sliding window for AI provider requests
 * 
 * Based on Vercel AI SDK v5 Core patterns from:
 * - /documentation/docs/03-ai-sdk-core/40-middleware.mdx
 * - /documentation/docs/06-advanced/06-rate-limiting.mdx
 */

import { RATE_LIMIT_CONFIG, LOGGING_CONFIG } from '../../config/constants';
import { env } from '../../config/env';
import type { RateLimitConfig, RateLimitState } from '../types';

/**
 * Rate limit exceeded error
 */
export class RateLimitError extends Error {
  constructor(
    message: string,
    public resetTime: number,
    public limit: number,
    public remaining: number,
    public retryAfter: number
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

/**
 * Rate limit bucket for token bucket algorithm
 */
interface TokenBucket {
  tokens: number;
  lastRefill: number;
  capacity: number;
  refillRate: number; // tokens per millisecond
}

/**
 * Rate limiter class with multiple strategies
 */
export class AIRateLimiter {
  private buckets: Map<string, TokenBucket> = new Map();
  private requestCounts: Map<string, Array<number>> = new Map();
  private config: RateLimitConfig;

  constructor(config?: Partial<RateLimitConfig>) {
    this.config = {
      ...RATE_LIMIT_CONFIG,
      enabled: true, // Default to enabled
      ...config,
    };
  }

  /**
   * Check if request is allowed and consume tokens
   */
  async checkLimit(
    key: string, 
    tokens: number = 1,
    customLimits?: Partial<RateLimitConfig>
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number; retryAfter?: number }> {
    const effectiveConfig = { ...this.config, ...customLimits };
    const bucketKey = `${effectiveConfig.keyPrefix}${key}`;

    // Check sliding window rate limit
    const slideResult = this.checkSlidingWindow(bucketKey, 1, effectiveConfig);
    if (!slideResult.allowed) {
      this.logRateLimit(key, 'sliding_window', slideResult);
      return slideResult;
    }

    // Check token bucket rate limit
    const bucketResult = this.checkTokenBucket(bucketKey, tokens, effectiveConfig);
    if (!bucketResult.allowed) {
      this.logRateLimit(key, 'token_bucket', bucketResult);
      return bucketResult;
    }

    // Both checks passed
    return {
      allowed: true,
      remaining: Math.min(slideResult.remaining, bucketResult.remaining),
      resetTime: Math.max(slideResult.resetTime, bucketResult.resetTime),
    };
  }

  /**
   * Sliding window rate limiter for requests per minute
   */
  private checkSlidingWindow(
    key: string,
    requests: number,
    config: RateLimitConfig
  ): { allowed: boolean; remaining: number; resetTime: number; retryAfter?: number } {
    const now = Date.now();
    const windowStart = now - config.windowSizeMs;

    // Get or create request history
    if (!this.requestCounts.has(key)) {
      this.requestCounts.set(key, []);
    }

    const requestHistory = this.requestCounts.get(key)!;
    
    // Remove expired requests
    const validRequests = requestHistory.filter(timestamp => timestamp > windowStart);
    
    // Check if adding new requests would exceed limit
    if (validRequests.length + requests > config.requestsPerMinute) {
      const oldestRequest = validRequests[0] || now;
      const resetTime = oldestRequest + config.windowSizeMs;
      const retryAfter = Math.ceil((resetTime - now) / 1000);

      return {
        allowed: false,
        remaining: 0,
        resetTime,
        retryAfter,
      };
    }

    // Add new requests to history
    for (let i = 0; i < requests; i++) {
      validRequests.push(now);
    }
    
    this.requestCounts.set(key, validRequests);

    return {
      allowed: true,
      remaining: config.requestsPerMinute - validRequests.length,
      resetTime: now + config.windowSizeMs,
    };
  }

  /**
   * Token bucket rate limiter for tokens per minute
   */
  private checkTokenBucket(
    key: string,
    tokens: number,
    config: RateLimitConfig
  ): { allowed: boolean; remaining: number; resetTime: number; retryAfter?: number } {
    const now = Date.now();
    
    // Get or create token bucket
    if (!this.buckets.has(key)) {
      this.buckets.set(key, {
        tokens: config.tokensPerMinute,
        lastRefill: now,
        capacity: config.tokensPerMinute,
        refillRate: config.tokensPerMinute / config.windowSizeMs, // tokens per ms
      });
    }

    const bucket = this.buckets.get(key)!;
    
    // Refill tokens based on time passed
    const timePassed = now - bucket.lastRefill;
    const newTokens = timePassed * bucket.refillRate;
    bucket.tokens = Math.min(bucket.capacity, bucket.tokens + newTokens);
    bucket.lastRefill = now;

    // Check if enough tokens available
    if (bucket.tokens < tokens) {
      const tokensNeeded = tokens - bucket.tokens;
      const timeToRefill = tokensNeeded / bucket.refillRate;
      const resetTime = now + timeToRefill;
      const retryAfter = Math.ceil(timeToRefill / 1000);

      return {
        allowed: false,
        remaining: Math.floor(bucket.tokens),
        resetTime,
        retryAfter,
      };
    }

    // Consume tokens
    bucket.tokens -= tokens;

    return {
      allowed: true,
      remaining: Math.floor(bucket.tokens),
      resetTime: now + ((bucket.capacity - bucket.tokens) / bucket.refillRate),
    };
  }

  /**
   * Check rate limit without consuming tokens
   */
  async checkLimitDryRun(
    key: string, 
    tokens: number = 1,
    customLimits?: Partial<RateLimitConfig>
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const effectiveConfig = { ...this.config, ...customLimits };
    const bucketKey = `${effectiveConfig.keyPrefix}${key}`;

    // Check without modifying state
    const slideResult = this.peekSlidingWindow(bucketKey, 1, effectiveConfig);
    const bucketResult = this.peekTokenBucket(bucketKey, tokens, effectiveConfig);

    return {
      allowed: slideResult.allowed && bucketResult.allowed,
      remaining: Math.min(slideResult.remaining, bucketResult.remaining),
      resetTime: Math.max(slideResult.resetTime, bucketResult.resetTime),
    };
  }

  /**
   * Peek sliding window without modifying state
   */
  private peekSlidingWindow(
    key: string,
    requests: number,
    config: RateLimitConfig
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const windowStart = now - config.windowSizeMs;

    const requestHistory = this.requestCounts.get(key) || [];
    const validRequests = requestHistory.filter(timestamp => timestamp > windowStart);

    return {
      allowed: validRequests.length + requests <= config.requestsPerMinute,
      remaining: Math.max(0, config.requestsPerMinute - validRequests.length),
      resetTime: now + config.windowSizeMs,
    };
  }

  /**
   * Peek token bucket without modifying state
   */
  private peekTokenBucket(
    key: string,
    tokens: number,
    config: RateLimitConfig
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const bucket = this.buckets.get(key);
    if (!bucket) {
      return {
        allowed: tokens <= config.tokensPerMinute,
        remaining: config.tokensPerMinute - tokens,
        resetTime: Date.now() + config.windowSizeMs,
      };
    }

    const now = Date.now();
    const timePassed = now - bucket.lastRefill;
    const newTokens = timePassed * bucket.refillRate;
    const currentTokens = Math.min(bucket.capacity, bucket.tokens + newTokens);

    return {
      allowed: currentTokens >= tokens,
      remaining: Math.floor(Math.max(0, currentTokens - tokens)),
      resetTime: now + ((bucket.capacity - currentTokens + tokens) / bucket.refillRate),
    };
  }

  /**
   * Get current rate limit status
   */
  getStatus(key: string): RateLimitState {
    const bucketKey = `${this.config.keyPrefix}${key}`;
    const now = Date.now();

    // Get sliding window status
    const windowStart = now - this.config.windowSizeMs;
    const requestHistory = this.requestCounts.get(bucketKey) || [];
    const validRequests = requestHistory.filter(timestamp => timestamp > windowStart);
    const requestsRemaining = Math.max(0, this.config.requestsPerMinute - validRequests.length);

    // Get token bucket status
    const bucket = this.buckets.get(bucketKey);
    let tokensRemaining = this.config.tokensPerMinute;
    
    if (bucket) {
      const timePassed = now - bucket.lastRefill;
      const newTokens = timePassed * bucket.refillRate;
      tokensRemaining = Math.floor(Math.min(bucket.capacity, bucket.tokens + newTokens));
    }

    const resetTime = now + this.config.windowSizeMs;

    return {
      key: bucketKey,
      requests: validRequests.length,
      tokens: this.config.tokensPerMinute - tokensRemaining,
      windowStart: now,
      resetTime,
      isBlocked: requestsRemaining === 0 || tokensRemaining === 0,
    };
  }

  /**
   * Reset rate limits for a key
   */
  reset(key: string): void {
    const bucketKey = `${this.config.keyPrefix}${key}`;
    this.requestCounts.delete(bucketKey);
    this.buckets.delete(bucketKey);
  }

  /**
   * Reset all rate limits
   */
  resetAll(): void {
    this.requestCounts.clear();
    this.buckets.clear();
  }

  /**
   * Get all rate limit statuses
   */
  getAllStatuses(): Map<string, RateLimitState> {
    const statuses = new Map<string, RateLimitState>();
    
    // Get all keys from both maps
    const allKeys = new Set([
      ...this.requestCounts.keys(),
      ...this.buckets.keys(),
    ]);

    for (const key of allKeys) {
      const keyWithoutPrefix = key.replace(this.config.keyPrefix, '');
      statuses.set(keyWithoutPrefix, this.getStatus(keyWithoutPrefix));
    }

    return statuses;
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.config.windowSizeMs;

    // Clean up request counts
    for (const [key, requests] of this.requestCounts.entries()) {
      const validRequests = requests.filter(timestamp => timestamp > windowStart);
      if (validRequests.length === 0) {
        this.requestCounts.delete(key);
      } else {
        this.requestCounts.set(key, validRequests);
      }
    }

    // Clean up unused token buckets (optional - buckets auto-refill)
    // Could implement LRU eviction here if memory becomes a concern
  }

  /**
   * Create middleware function for AI SDK
   */
  createMiddleware(keyExtractor?: (context: any) => string) {
    return async (context: any) => {
      const key = keyExtractor ? keyExtractor(context) : 'default';
      
      // Estimate token usage (would be more accurate with actual model info)
      const estimatedTokens = this.estimateTokenUsage(context);
      
      const limitResult = await this.checkLimit(key, estimatedTokens);
      
      if (!limitResult.allowed) {
        throw new RateLimitError(
          `Rate limit exceeded. Try again in ${limitResult.retryAfter} seconds.`,
          limitResult.resetTime,
          this.config.tokensPerMinute,
          limitResult.remaining,
          limitResult.retryAfter || 60
        );
      }

      // Add rate limit info to response headers (if supported)
      if (context.response && typeof context.response.setHeader === 'function') {
        context.response.setHeader('X-RateLimit-Limit', this.config.tokensPerMinute);
        context.response.setHeader('X-RateLimit-Remaining', limitResult.remaining);
        context.response.setHeader('X-RateLimit-Reset', limitResult.resetTime);
      }

      return context;
    };
  }

  /**
   * Estimate token usage from context (rough approximation)
   */
  private estimateTokenUsage(context: any): number {
    let tokens = 1; // Default minimum

    if (context.prompt) {
      // Rough estimation: 1 token ≈ 4 characters
      if (typeof context.prompt === 'string') {
        tokens = Math.ceil(context.prompt.length / 4);
      } else if (Array.isArray(context.prompt)) {
        const totalText = context.prompt
          .map((msg: any) => msg.content || '')
          .join(' ');
        tokens = Math.ceil(totalText.length / 4);
      }
    }

    // Add expected output tokens
    if (context.maxTokens) {
      tokens += Math.ceil(context.maxTokens * 0.5); // Estimate 50% of max will be used
    } else {
      tokens += 100; // Default estimated output
    }

    return Math.max(1, tokens);
  }

  /**
   * Log rate limit events
   */
  private logRateLimit(
    key: string,
    type: 'sliding_window' | 'token_bucket',
    result: { allowed: boolean; remaining: number; resetTime: number; retryAfter?: number }
  ): void {
    if (LOGGING_CONFIG.enableAICallDebugging || env.NODE_ENV === 'development') {
      console.warn(`🚫 Rate limit hit [${type}]:`, {
        key,
        remaining: result.remaining,
        resetTime: new Date(result.resetTime).toISOString(),
        retryAfter: result.retryAfter,
      });
    }
  }
}

/**
 * Built-in rate limiting profiles
 */
export const RateLimitProfiles = {
  /**
   * Conservative limits for free tier
   */
  conservative: (): Partial<RateLimitConfig> => ({
    requestsPerMinute: 10,
    tokensPerMinute: 10000,
    burstSize: 3,
  }),

  /**
   * Standard limits for regular usage
   */
  standard: (): Partial<RateLimitConfig> => ({
    requestsPerMinute: 60,
    tokensPerMinute: 100000,
    burstSize: 10,
  }),

  /**
   * Aggressive limits for high-volume usage
   */
  aggressive: (): Partial<RateLimitConfig> => ({
    requestsPerMinute: 300,
    tokensPerMinute: 500000,
    burstSize: 50,
  }),

  /**
   * Development limits (very permissive)
   */
  development: (): Partial<RateLimitConfig> => ({
    requestsPerMinute: 1000,
    tokensPerMinute: 1000000,
    burstSize: 100,
  }),
};

/**
 * Global rate limiter instance
 */
let globalRateLimiter: AIRateLimiter | null = null;

/**
 * Get global rate limiter
 */
export function getRateLimiter(): AIRateLimiter {
  if (!globalRateLimiter) {
    const profile = env.NODE_ENV === 'development' 
      ? RateLimitProfiles.development()
      : RateLimitProfiles.standard();
    
    globalRateLimiter = new AIRateLimiter(profile);
  }
  return globalRateLimiter;
}

/**
 * Convenience functions for common rate limiting operations
 */
export const RateLimitHelpers = {
  /**
   * Check if user can make AI request
   */
  canMakeAIRequest: async (userId: string, tokens: number = 100): Promise<boolean> => {
    const limiter = getRateLimiter();
    const result = await limiter.checkLimitDryRun(userId, tokens);
    return result.allowed;
  },

  /**
   * Get user's remaining quota
   */
  getUserQuota: (userId: string): RateLimitState => {
    const limiter = getRateLimiter();
    return limiter.getStatus(userId);
  },

  /**
   * Create user-based rate limit middleware
   */
  createUserRateLimitMiddleware: () => {
    const limiter = getRateLimiter();
    return limiter.createMiddleware((context) => {
      return context.userId || context.user?.id || 'anonymous';
    });
  },

  /**
   * Create IP-based rate limit middleware
   */
  createIPRateLimitMiddleware: () => {
    const limiter = getRateLimiter();
    return limiter.createMiddleware((context) => {
      return context.ip || context.request?.ip || 'unknown';
    });
  },
};

/**
 * Cleanup interval for expired rate limit entries
 */
if (env.NODE_ENV !== 'test') {
  setInterval(() => {
    const limiter = getRateLimiter();
    limiter.cleanup();
  }, 60000); // Clean up every minute
}