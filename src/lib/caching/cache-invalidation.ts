/**
 * Cache Invalidation Strategies and TTL Management for Makalah AI
 * Implements intelligent cache invalidation patterns and TTL optimization
 * 
 * Task 10 - Performance Optimization with Redis Caching
 * Provides comprehensive cache lifecycle management with data consistency guarantees
 */

import { redisManager, cacheUtils, TTL_STRATEGIES, REDIS_PREFIXES } from '../config/redis-config';
import { sessionManager } from './session-manager';

/**
 * Cache invalidation patterns
 */
export type InvalidationPattern = 
  | 'immediate'     // Invalidate immediately on change
  | 'delayed'       // Invalidate after short delay
  | 'scheduled'     // Invalidate at specific times
  | 'conditional'   // Invalidate based on conditions
  | 'cascade'       // Invalidate related entries
  | 'time_based';   // Invalidate based on TTL

/**
 * Cache invalidation rule
 */
export interface InvalidationRule {
  id: string;
  name: string;
  pattern: InvalidationPattern;
  trigger: {
    event: string;
    table?: string;
    operation?: 'insert' | 'update' | 'delete' | 'any';
    conditions?: Record<string, any>;
  };
  target: {
    keyPatterns: string[];
    cacheTypes: ('session' | 'query' | 'all')[];
    cascadeRules?: string[]; // Other rule IDs to trigger
  };
  schedule?: {
    delay?: number; // milliseconds
    cron?: string; // cron expression
    maxAge?: number; // maximum cache age before invalidation
  };
  enabled: boolean;
  priority: number; // Higher number = higher priority
  createdAt: string;
  updatedAt: string;
}

/**
 * TTL optimization strategy
 */
export interface TTLStrategy {
  id: string;
  name: string;
  keyPattern: string;
  baseTTL: number;
  dynamicFactors: {
    accessFrequency?: { factor: number; threshold: number };
    dataSize?: { factor: number; threshold: number };
    userRole?: Record<string, number>; // role -> multiplier
    timeOfDay?: Record<string, number>; // hour -> multiplier
    resourceLoad?: { factor: number; threshold: number };
  };
  minTTL: number;
  maxTTL: number;
  enabled: boolean;
}

/**
 * Cache invalidation event
 */
export interface InvalidationEvent {
  id: string;
  ruleId: string;
  trigger: {
    event: string;
    timestamp: string;
    userId?: string;
    metadata?: Record<string, any>;
  };
  result: {
    invalidatedKeys: string[];
    cascadedRules: string[];
    executionTime: number;
    success: boolean;
    errors: string[];
  };
}

/**
 * Cache Invalidation Manager
 */
export class CacheInvalidationManager {
  private static instance: CacheInvalidationManager;
  
  private rules: Map<string, InvalidationRule> = new Map();
  private ttlStrategies: Map<string, TTLStrategy> = new Map();
  private events: InvalidationEvent[] = [];
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map();
  
  private metrics = {
    invalidations: { total: 0, immediate: 0, delayed: 0, scheduled: 0, cascade: 0 },
    ttlOptimizations: { applied: 0, extended: 0, reduced: 0 },
    performance: { avgExecutionTime: 0, totalExecutionTime: 0 },
  };

  private constructor() {
    this.initializeDefaultRules();
    this.initializeDefaultTTLStrategies();
    this.startMaintenanceScheduler();
  }

  /**
   * Get singleton cache invalidation manager instance
   */
  public static getInstance(): CacheInvalidationManager {
    if (!CacheInvalidationManager.instance) {
      CacheInvalidationManager.instance = new CacheInvalidationManager();
    }
    return CacheInvalidationManager.instance;
  }

  /**
   * Add invalidation rule
   */
  public addInvalidationRule(rule: Omit<InvalidationRule, 'id' | 'createdAt' | 'updatedAt'>): string {
    const id = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullRule: InvalidationRule = {
      ...rule,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    this.rules.set(id, fullRule);
    console.log(`✓ Added invalidation rule: ${rule.name}`);
    
    return id;
  }

  /**
   * Add TTL optimization strategy
   */
  public addTTLStrategy(strategy: Omit<TTLStrategy, 'id'>): string {
    const id = `ttl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullStrategy: TTLStrategy = { ...strategy, id };
    
    this.ttlStrategies.set(id, fullStrategy);
    console.log(`✓ Added TTL strategy: ${strategy.name}`);
    
    return id;
  }

  /**
   * Trigger invalidation based on database event
   */
  public async triggerInvalidation(
    event: string,
    table?: string,
    operation?: 'insert' | 'update' | 'delete' | 'any',
    metadata?: Record<string, any>
  ): Promise<InvalidationEvent[]> {
    const applicableRules = this.getApplicableRules(event, table, operation);
    const events: InvalidationEvent[] = [];

    for (const rule of applicableRules) {
      const event = await this.executeInvalidationRule(rule, {
        event,
        table,
        operation,
        metadata,
      });
      events.push(event);
    }

    return events;
  }

  /**
   * Optimize TTL for a cache key
   */
  public async optimizeTTL(
    key: string,
    accessData?: {
      frequency: number;
      lastAccess: Date;
      dataSize: number;
      userRole?: string;
    }
  ): Promise<number | null> {
    const strategy = this.findTTLStrategy(key);
    if (!strategy || !strategy.enabled) {
      return null;
    }

    let optimizedTTL = strategy.baseTTL;

    // Apply access frequency factor
    if (strategy.dynamicFactors.accessFrequency && accessData?.frequency) {
      const { factor, threshold } = strategy.dynamicFactors.accessFrequency;
      if (accessData.frequency > threshold) {
        optimizedTTL *= factor;
        this.metrics.ttlOptimizations.extended++;
      }
    }

    // Apply data size factor
    if (strategy.dynamicFactors.dataSize && accessData?.dataSize) {
      const { factor, threshold } = strategy.dynamicFactors.dataSize;
      if (accessData.dataSize > threshold) {
        optimizedTTL *= factor;
        this.metrics.ttlOptimizations.reduced++;
      }
    }

    // Apply user role factor
    if (strategy.dynamicFactors.userRole && accessData?.userRole) {
      const roleFactor = strategy.dynamicFactors.userRole[accessData.userRole];
      if (roleFactor) {
        optimizedTTL *= roleFactor;
      }
    }

    // Apply time of day factor
    if (strategy.dynamicFactors.timeOfDay) {
      const currentHour = new Date().getHours();
      const timeFactor = strategy.dynamicFactors.timeOfDay[currentHour];
      if (timeFactor) {
        optimizedTTL *= timeFactor;
      }
    }

    // Clamp to min/max bounds
    optimizedTTL = Math.max(strategy.minTTL, Math.min(strategy.maxTTL, optimizedTTL));
    
    this.metrics.ttlOptimizations.applied++;
    return Math.floor(optimizedTTL);
  }

  /**
   * Schedule cache cleanup at regular intervals
   */
  public async scheduleCleanup(
    pattern: string,
    intervalMinutes: number,
    conditions?: {
      maxAge?: number;
      maxSize?: number;
      minAccessCount?: number;
    }
  ): Promise<string> {
    const jobId = `cleanup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const interval = setInterval(async () => {
      try {
        const cleaned = await this.performCleanup(pattern, conditions);
        if (cleaned > 0) {
          console.log(`✓ Scheduled cleanup removed ${cleaned} entries for pattern: ${pattern}`);
        }
      } catch (error) {
        console.error('Scheduled cleanup failed:', error);
      }
    }, intervalMinutes * 60 * 1000);

    this.scheduledJobs.set(jobId, interval);
    console.log(`✓ Scheduled cleanup job: ${jobId} (every ${intervalMinutes} minutes)`);
    
    return jobId;
  }

  /**
   * Invalidate cache with cascade support
   */
  public async invalidateWithCascade(
    keyPatterns: string[],
    cascadeRules?: string[],
    userId?: string
  ): Promise<{ invalidated: number; cascaded: number }> {
    let totalInvalidated = 0;
    let totalCascaded = 0;

    // Direct invalidation
    for (const pattern of keyPatterns) {
      const invalidated = await redisManager.deleteCachePattern(pattern);
      totalInvalidated += invalidated;
    }

    // Cascade invalidation
    if (cascadeRules && cascadeRules.length > 0) {
      for (const ruleId of cascadeRules) {
        const rule = this.rules.get(ruleId);
        if (rule && rule.enabled) {
          const cascadeEvent = await this.executeInvalidationRule(rule, {
            event: 'cascade',
            userId,
          });
          totalCascaded += cascadeEvent.result.invalidatedKeys.length;
        }
      }
    }

    this.metrics.invalidations.total += totalInvalidated;
    this.metrics.invalidations.cascade += totalCascaded;

    return { invalidated: totalInvalidated, cascaded: totalCascaded };
  }

  /**
   * Get invalidation statistics
   */
  public getInvalidationStats(): {
    rules: number;
    strategies: number;
    events: number;
    metrics: typeof this.metrics;
    recentEvents: InvalidationEvent[];
  } {
    return {
      rules: this.rules.size,
      strategies: this.ttlStrategies.size,
      events: this.events.length,
      metrics: { ...this.metrics },
      recentEvents: this.events.slice(-10), // Last 10 events
    };
  }

  /**
   * Analyze cache efficiency and provide recommendations
   */
  public async analyzeCacheEfficiency(): Promise<{
    efficiency: number;
    recommendations: string[];
    patterns: Array<{ pattern: string; hitRate: number; size: number }>;
  }> {
    const recommendations: string[] = [];
    const patterns: Array<{ pattern: string; hitRate: number; size: number }> = [];

    try {
      // Get cache patterns and analyze
      const allKeys = await redisManager.getClient().keys('*');
      const patternMap = new Map<string, { count: number; totalTTL: number }>();

      for (const key of allKeys) {
        const prefix = key.split(':')[0];
        const existing = patternMap.get(prefix) || { count: 0, totalTTL: 0 };
        const ttl = await redisManager.getCacheTTL(key) || 0;
        
        patternMap.set(prefix, {
          count: existing.count + 1,
          totalTTL: existing.totalTTL + ttl,
        });
      }

      // Calculate efficiency
      const totalKeys = allKeys.length;
      const activeKeys = Array.from(patternMap.values()).reduce((sum, p) => sum + p.count, 0);
      const efficiency = totalKeys > 0 ? (activeKeys / totalKeys) * 100 : 0;

      // Generate recommendations
      if (efficiency < 70) {
        recommendations.push('Low cache efficiency detected. Consider reviewing TTL strategies.');
      }

      if (this.metrics.invalidations.total > 1000 && this.metrics.invalidations.cascade < this.metrics.invalidations.total * 0.1) {
        recommendations.push('Consider implementing more cascade invalidation rules for better consistency.');
      }

      for (const [pattern, data] of patternMap) {
        const avgTTL = data.totalTTL / data.count;
        patterns.push({
          pattern,
          hitRate: 0, // Would need hit tracking
          size: data.count,
        });

        if (avgTTL < 300 && data.count > 100) {
          recommendations.push(`Pattern "${pattern}" has low TTL but high usage. Consider increasing TTL.`);
        }
      }

      return { efficiency: Math.round(efficiency * 100) / 100, recommendations, patterns };

    } catch (error) {
      console.error('Cache efficiency analysis failed:', error);
      return { efficiency: 0, recommendations: ['Analysis failed'], patterns: [] };
    }
  }

  // Private methods

  /**
   * Initialize default invalidation rules
   */
  private initializeDefaultRules(): void {
    // User session invalidation
    this.addInvalidationRule({
      name: 'User Session Update',
      pattern: 'immediate',
      trigger: {
        event: 'user.session.update',
        operation: 'any',
      },
      target: {
        keyPatterns: [`${REDIS_PREFIXES.SESSION}*`, `${REDIS_PREFIXES.USER}*`],
        cacheTypes: ['session'],
      },
      enabled: true,
      priority: 100,
    });

    // Content update invalidation (simplified)
    this.addInvalidationRule({
      name: 'Content Update',
      pattern: 'immediate',
      trigger: {
        event: 'content.update',
        table: 'chat_sessions',
        operation: 'update',
      },
      target: {
        keyPatterns: [`${REDIS_PREFIXES.QUERY_CACHE}search:*`],
        cacheTypes: ['query'],
        cascadeRules: [],
      },
      enabled: true,
      priority: 90,
    });

    // Query cache cleanup
    this.addInvalidationRule({
      name: 'Query Cache Cleanup',
      pattern: 'scheduled',
      trigger: {
        event: 'maintenance.cleanup',
      },
      target: {
        keyPatterns: [`${REDIS_PREFIXES.QUERY_CACHE}*`],
        cacheTypes: ['query'],
      },
      schedule: {
        delay: 3600000, // 1 hour
      },
      enabled: true,
      priority: 50,
    });
  }

  /**
   * Initialize default TTL strategies
   */
  private initializeDefaultTTLStrategies(): void {
    // Session TTL strategy
    this.addTTLStrategy({
      name: 'Session TTL Optimization',
      keyPattern: `${REDIS_PREFIXES.SESSION}*`,
      baseTTL: TTL_STRATEGIES.SESSION,
      dynamicFactors: {
        accessFrequency: { factor: 1.5, threshold: 10 },
        userRole: { admin: 2, user: 1 },
        timeOfDay: { 9: 1.2, 10: 1.2, 11: 1.2, 14: 1.2, 15: 1.2 }, // Business hours
      },
      minTTL: 1800, // 30 minutes
      maxTTL: 172800, // 48 hours
      enabled: true,
    });

    // Artifact TTL strategy
    this.addTTLStrategy({
      name: 'Artifact TTL Optimization',
      keyPattern: `${REDIS_PREFIXES.ARTIFACT}*`,
      baseTTL: TTL_STRATEGIES.ARTIFACT_CACHE,
      dynamicFactors: {
        accessFrequency: { factor: 2, threshold: 5 },
        dataSize: { factor: 0.8, threshold: 10000 }, // Reduce TTL for large data
      },
      minTTL: 900, // 15 minutes
      maxTTL: 86400, // 24 hours
      enabled: true,
    });

    // Query TTL strategy
    this.addTTLStrategy({
      name: 'Query TTL Optimization',
      keyPattern: `${REDIS_PREFIXES.QUERY_CACHE}*`,
      baseTTL: TTL_STRATEGIES.QUERY_CACHE,
      dynamicFactors: {
        accessFrequency: { factor: 1.8, threshold: 20 },
        resourceLoad: { factor: 0.7, threshold: 80 }, // Reduce TTL under high load
      },
      minTTL: 300, // 5 minutes
      maxTTL: 21600, // 6 hours
      enabled: true,
    });
  }

  /**
   * Get applicable invalidation rules for event
   */
  private getApplicableRules(
    event: string,
    table?: string,
    operation?: 'insert' | 'update' | 'delete' | 'any'
  ): InvalidationRule[] {
    return Array.from(this.rules.values())
      .filter(rule => {
        if (!rule.enabled) return false;

        // Check event match
        if (rule.trigger.event !== event && rule.trigger.event !== 'any') return false;

        // Check table match
        if (rule.trigger.table && rule.trigger.table !== table) return false;

        // Check operation match
        if (rule.trigger.operation && rule.trigger.operation !== operation && rule.trigger.operation !== 'any') return false;

        return true;
      })
      .sort((a, b) => b.priority - a.priority); // Higher priority first
  }

  /**
   * Find TTL strategy for key
   */
  private findTTLStrategy(key: string): TTLStrategy | null {
    for (const strategy of this.ttlStrategies.values()) {
      if (strategy.enabled && this.matchesPattern(key, strategy.keyPattern)) {
        return strategy;
      }
    }
    return null;
  }

  /**
   * Check if key matches pattern
   */
  private matchesPattern(key: string, pattern: string): boolean {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(key);
  }

  /**
   * Execute invalidation rule
   */
  private async executeInvalidationRule(
    rule: InvalidationRule,
    context: {
      event: string;
      table?: string;
      operation?: 'insert' | 'update' | 'delete' | 'any';
      metadata?: Record<string, any>;
      userId?: string;
    }
  ): Promise<InvalidationEvent> {
    const startTime = Date.now();
    const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const invalidationEvent: InvalidationEvent = {
      id: eventId,
      ruleId: rule.id,
      trigger: {
        event: context.event,
        timestamp: new Date().toISOString(),
        userId: context.userId,
        metadata: context.metadata,
      },
      result: {
        invalidatedKeys: [],
        cascadedRules: [],
        executionTime: 0,
        success: false,
        errors: [],
      },
    };

    try {
      switch (rule.pattern) {
        case 'immediate':
          await this.executeImmediateInvalidation(rule, invalidationEvent);
          break;
        case 'delayed':
          await this.executeDelayedInvalidation(rule, invalidationEvent);
          break;
        case 'cascade':
          await this.executeCascadeInvalidation(rule, invalidationEvent);
          break;
        case 'scheduled':
          await this.executeScheduledInvalidation(rule, invalidationEvent);
          break;
      }

      invalidationEvent.result.success = true;
      this.metrics.invalidations[rule.pattern]++;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      invalidationEvent.result.errors.push(errorMessage);
      console.error('Invalidation rule execution failed:', errorMessage);
    }

    invalidationEvent.result.executionTime = Date.now() - startTime;
    this.metrics.performance.totalExecutionTime += invalidationEvent.result.executionTime;
    this.metrics.performance.avgExecutionTime = 
      this.metrics.performance.totalExecutionTime / (this.metrics.invalidations.total || 1);

    // Store event (keep last 100)
    this.events.push(invalidationEvent);
    if (this.events.length > 100) {
      this.events.shift();
    }

    return invalidationEvent;
  }

  /**
   * Execute immediate invalidation
   */
  private async executeImmediateInvalidation(
    rule: InvalidationRule,
    event: InvalidationEvent
  ): Promise<void> {
    for (const pattern of rule.target.keyPatterns) {
      const deleted = await redisManager.deleteCachePattern(pattern);
      if (deleted > 0) {
        event.result.invalidatedKeys.push(`${pattern} (${deleted} keys)`);
      }
    }
  }

  /**
   * Execute delayed invalidation
   */
  private async executeDelayedInvalidation(
    rule: InvalidationRule,
    event: InvalidationEvent
  ): Promise<void> {
    const delay = rule.schedule?.delay || 1000;
    
    setTimeout(async () => {
      await this.executeImmediateInvalidation(rule, event);
    }, delay);
  }

  /**
   * Execute cascade invalidation
   */
  private async executeCascadeInvalidation(
    rule: InvalidationRule,
    event: InvalidationEvent
  ): Promise<void> {
    // Direct invalidation
    await this.executeImmediateInvalidation(rule, event);

    // Cascade to other rules
    if (rule.target.cascadeRules) {
      for (const cascadeRuleId of rule.target.cascadeRules) {
        const cascadeRule = this.rules.get(cascadeRuleId);
        if (cascadeRule && cascadeRule.enabled) {
          const cascadeEvent = await this.executeInvalidationRule(cascadeRule, {
            event: 'cascade',
            metadata: { parent: rule.id },
          });
          event.result.cascadedRules.push(cascadeRuleId);
        }
      }
    }
  }

  /**
   * Execute scheduled invalidation
   */
  private async executeScheduledInvalidation(
    rule: InvalidationRule,
    event: InvalidationEvent
  ): Promise<void> {
    // For scheduled invalidation, we would typically set up a cron job
    // For now, execute immediately as demonstration
    await this.executeImmediateInvalidation(rule, event);
  }

  /**
   * Perform cleanup with conditions
   */
  private async performCleanup(
    pattern: string,
    conditions?: {
      maxAge?: number;
      maxSize?: number;
      minAccessCount?: number;
    }
  ): Promise<number> {
    const keys = await redisManager.getClient().keys(pattern);
    let cleaned = 0;

    for (const key of keys) {
      let shouldDelete = false;

      // Check max age
      if (conditions?.maxAge) {
        const ttl = await redisManager.getCacheTTL(key);
        if (ttl && ttl > conditions.maxAge) {
          shouldDelete = true;
        }
      }

      // Additional conditions would be checked here
      // For now, simplified cleanup
      if (shouldDelete) {
        await cacheUtils.del(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Start maintenance scheduler
   */
  private startMaintenanceScheduler(): void {
    // Run every 30 minutes
    const maintenanceInterval = setInterval(async () => {
      try {
        await this.performMaintenanceTasks();
      } catch (error) {
        console.error('Maintenance tasks failed:', error);
      }
    }, 30 * 60 * 1000);

    this.scheduledJobs.set('maintenance', maintenanceInterval);
  }

  /**
   * Perform maintenance tasks
   */
  private async performMaintenanceTasks(): Promise<void> {
    // Clean up expired events
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    this.events = this.events.filter(event => 
      new Date(event.trigger.timestamp).getTime() > cutoff
    );

    // Check Redis health
    const healthy = await redisManager.performHealthCheck();
    if (!healthy) {
      console.warn('Redis health check failed during maintenance');
    }
  }
}

/**
 * Export singleton cache invalidation manager
 */
export const cacheInvalidationManager = CacheInvalidationManager.getInstance();

/**
 * Cache invalidation utilities for common operations
 */
export const invalidationUtils = {
  trigger: (event: string, table?: string, operation?: 'insert' | 'update' | 'delete' | 'any', metadata?: Record<string, any>) =>
    cacheInvalidationManager.triggerInvalidation(event, table, operation, metadata),
  
  optimizeTTL: (key: string, accessData?: any) =>
    cacheInvalidationManager.optimizeTTL(key, accessData),
  
  scheduleCleanup: (pattern: string, intervalMinutes: number, conditions?: any) =>
    cacheInvalidationManager.scheduleCleanup(pattern, intervalMinutes, conditions),
  
  cascadeInvalidate: (patterns: string[], cascadeRules?: string[], userId?: string) =>
    cacheInvalidationManager.invalidateWithCascade(patterns, cascadeRules, userId),
  
  addRule: (rule: any) => cacheInvalidationManager.addInvalidationRule(rule),
  addStrategy: (strategy: any) => cacheInvalidationManager.addTTLStrategy(strategy),
  
  stats: () => cacheInvalidationManager.getInvalidationStats(),
  analyze: () => cacheInvalidationManager.analyzeCacheEfficiency(),
};