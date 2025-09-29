/**
 * Performance Optimization Middleware for Makalah AI
 * Implements Redis-based caching middleware for database operations with intelligent query optimization
 * 
 * Task 10 - Performance Optimization with Redis Caching
 * Provides middleware for database operations with automatic caching and performance monitoring
 */

import { redisManager, cacheUtils, TTL_STRATEGIES } from '../config/redis-config';
import { sessionManager } from './session-manager';

/**
 * Query execution context
 */
export interface QueryContext {
  userId?: string;
  sessionId?: string;
  operation: 'select' | 'insert' | 'update' | 'delete' | 'function';
  table?: string;
  cacheable: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timeout?: number;
}

/**
 * Query execution result with performance metrics
 */
export interface QueryResult<T = any> {
  data: T;
  fromCache: boolean;
  executionTime: number;
  cacheKey?: string;
  queryHash?: string;
  performance: {
    dbTime?: number;
    cacheTime?: number;
    totalTime: number;
  };
  metadata: {
    timestamp: string;
    userId?: string;
    operation: string;
    cached: boolean;
  };
}

/**
 * Performance metrics for monitoring
 */
export interface PerformanceMetrics {
  queries: {
    total: number;
    cached: number;
    database: number;
    failed: number;
  };
  timing: {
    avgCacheTime: number;
    avgDbTime: number;
    avgTotalTime: number;
    maxTime: number;
    minTime: number;
  };
  cacheEfficiency: {
    hitRate: number;
    missRate: number;
    invalidations: number;
  };
  operations: Record<string, {
    count: number;
    avgTime: number;
    cacheHitRate: number;
  }>;
}

/**
 * Database Operation Performance Middleware
 */
export class PerformanceMiddleware {
  private static instance: PerformanceMiddleware;
  
  private metrics: PerformanceMetrics = {
    queries: { total: 0, cached: 0, database: 0, failed: 0 },
    timing: { avgCacheTime: 0, avgDbTime: 0, avgTotalTime: 0, maxTime: 0, minTime: Infinity },
    cacheEfficiency: { hitRate: 0, missRate: 0, invalidations: 0 },
    operations: {},
  };

  private queryTimes: number[] = [];
  private maxStoredTimes = 1000; // Keep last 1000 query times for averages

  private constructor() {}

  /**
   * Get singleton performance middleware instance
   */
  public static getInstance(): PerformanceMiddleware {
    if (!PerformanceMiddleware.instance) {
      PerformanceMiddleware.instance = new PerformanceMiddleware();
    }
    return PerformanceMiddleware.instance;
  }

  /**
   * Execute database query with caching and performance optimization
   */
  public async executeQuery<T>(
    query: string,
    parameters: any[],
    context: QueryContext,
    executor: () => Promise<T>
  ): Promise<QueryResult<T>> {
    const startTime = Date.now();
    let fromCache = false;
    let cacheKey: string | undefined;
    let queryHash: string | undefined;

    try {
      // Only cache SELECT operations for now
      if (context.cacheable && context.operation === 'select') {
        queryHash = this.generateQueryHash(query, parameters);
        cacheKey = cacheUtils.formatKey('QUERY_CACHE', `${context.operation}:${queryHash}`);

        // Try to get from cache first
        const cacheStartTime = Date.now();
        const cachedResult = await cacheUtils.get<T>(cacheKey);
        const cacheTime = Date.now() - cacheStartTime;

        if (cachedResult !== null) {
          fromCache = true;
          const totalTime = Date.now() - startTime;
          
          this.updateMetrics(context.operation, totalTime, cacheTime, 0, true);

          return {
            data: cachedResult,
            fromCache: true,
            executionTime: totalTime,
            cacheKey,
            queryHash,
            performance: {
              cacheTime,
              totalTime,
            },
            metadata: {
              timestamp: new Date().toISOString(),
              userId: context.userId,
              operation: context.operation,
              cached: true,
            },
          };
        }
      }

      // Execute the actual database query
      const dbStartTime = Date.now();
      const result = await this.executeWithTimeout(executor, context.timeout || 30000);
      const dbTime = Date.now() - dbStartTime;

      // Cache the result if cacheable
      if (context.cacheable && cacheKey && queryHash) {
        const ttl = this.getTTLForOperation(context.operation);
        await cacheUtils.set(cacheKey, result, ttl);
        
        // Cache stored in Redis via cacheUtils
      }

      const totalTime = Date.now() - startTime;
      this.updateMetrics(context.operation, totalTime, 0, dbTime, false);

      return {
        data: result,
        fromCache: false,
        executionTime: totalTime,
        cacheKey,
        queryHash,
        performance: {
          dbTime,
          totalTime,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          userId: context.userId,
          operation: context.operation,
          cached: false,
        },
      };

    } catch (error) {
      const totalTime = Date.now() - startTime;
      this.metrics.queries.failed++;
      
      // Query execution failed - silent handling for production

      throw error;
    }
  }

  /**
   * Execute query with batching optimization
   */
  public async executeBatch<T>(
    queries: Array<{
      query: string;
      parameters: any[];
      context: QueryContext;
      executor: () => Promise<T>;
    }>
  ): Promise<QueryResult<T>[]> {
    const startTime = Date.now();
    const results: QueryResult<T>[] = [];
    
    // Group queries by cacheable status
    const cacheableQueries = queries.filter(q => q.context.cacheable);
    const nonCacheableQueries = queries.filter(q => !q.context.cacheable);

    // Check cache for cacheable queries
    for (const queryInfo of cacheableQueries) {
      try {
        const result = await this.executeQuery(
          queryInfo.query,
          queryInfo.parameters,
          queryInfo.context,
          queryInfo.executor
        );
        results.push(result);
      } catch (error) {
        // Batch query failed - silent handling for production
        // Continue with other queries
      }
    }

    // Execute non-cacheable queries
    for (const queryInfo of nonCacheableQueries) {
      try {
        const result = await this.executeQuery(
          queryInfo.query,
          queryInfo.parameters,
          queryInfo.context,
          queryInfo.executor
        );
        results.push(result);
      } catch (error) {
        // Batch query failed - silent handling for production
        // Continue with other queries
      }
    }

    const totalTime = Date.now() - startTime;
    // Executed batch queries - silent handling for production

    return results;
  }

  /**
   * Invalidate cache based on database changes
   */
  public async invalidateCache(
    operation: 'insert' | 'update' | 'delete',
    table: string,
    affectedIds?: string[]
  ): Promise<void> {
    try {
      const patterns: string[] = [];

      // Invalidate table-specific queries
      patterns.push(`select:*${table}*`);

      // Additional cache invalidation handled by cacheInvalidationManager

      // Invalidate general query patterns
      for (const pattern of patterns) {
        const deleted = await redisManager.deleteCachePattern(
          cacheUtils.formatKey('QUERY_CACHE', pattern)
        );
        if (deleted > 0) {
          this.metrics.cacheEfficiency.invalidations += deleted;
          // Invalidated cache entries - silent handling for production
        }
      }

    } catch (error) {
      // Cache invalidation failed - silent handling for production
    }
  }

  /**
   * Preload frequently accessed data into cache
   */
  public async preloadCache(
    queries: Array<{
      key: string;
      query: string;
      parameters: any[];
      executor: () => Promise<any>;
    }>
  ): Promise<{ loaded: number; failed: number }> {
    let loaded = 0;
    let failed = 0;

    for (const queryInfo of queries) {
      try {
        const cacheKey = cacheUtils.formatKey('QUERY_CACHE', queryInfo.key);
        
        // Check if already cached
        const existing = await cacheUtils.get(cacheKey);
        if (existing !== null) {
          loaded++;
          continue;
        }

        // Execute and cache
        const result = await queryInfo.executor();
        await cacheUtils.set(cacheKey, result, TTL_STRATEGIES.QUERY_CACHE);
        loaded++;

      } catch (error) {
        // Failed to preload query - silent handling for production
        failed++;
      }
    }

    // Preloaded queries completed - silent handling for production
    return { loaded, failed };
  }

  /**
   * Get performance metrics for monitoring
   */
  public getPerformanceMetrics(): PerformanceMetrics {
    // Calculate current averages
    if (this.queryTimes.length > 0) {
      this.metrics.timing.avgTotalTime = this.queryTimes.reduce((a, b) => a + b, 0) / this.queryTimes.length;
      this.metrics.timing.maxTime = Math.max(...this.queryTimes);
      this.metrics.timing.minTime = Math.min(...this.queryTimes);
    }

    // Calculate hit rate
    if (this.metrics.queries.total > 0) {
      this.metrics.cacheEfficiency.hitRate = 
        Math.round((this.metrics.queries.cached / this.metrics.queries.total) * 10000) / 100;
      this.metrics.cacheEfficiency.missRate = 
        Math.round((this.metrics.queries.database / this.metrics.queries.total) * 10000) / 100;
    }

    return { ...this.metrics };
  }

  /**
   * Reset performance metrics
   */
  public resetMetrics(): void {
    this.metrics = {
      queries: { total: 0, cached: 0, database: 0, failed: 0 },
      timing: { avgCacheTime: 0, avgDbTime: 0, avgTotalTime: 0, maxTime: 0, minTime: Infinity },
      cacheEfficiency: { hitRate: 0, missRate: 0, invalidations: 0 },
      operations: {},
    };
    this.queryTimes = [];
  }

  /**
   * Get query performance recommendations
   */
  public getPerformanceRecommendations(): string[] {
    const recommendations: string[] = [];
    const metrics = this.getPerformanceMetrics();

    if (metrics.cacheEfficiency.hitRate < 50) {
      recommendations.push('Low cache hit rate detected. Consider increasing TTL or adding more cacheable queries.');
    }

    if (metrics.timing.avgTotalTime > 1000) {
      recommendations.push('High average query time detected. Consider query optimization or indexing.');
    }

    if (metrics.queries.failed > metrics.queries.total * 0.1) {
      recommendations.push('High query failure rate detected. Check database connectivity and query validity.');
    }

    // Check individual operations
    for (const [operation, stats] of Object.entries(metrics.operations)) {
      if (stats.avgTime > 2000) {
        recommendations.push(`Operation "${operation}" has high average time (${stats.avgTime}ms). Consider optimization.`);
      }
      
      if (stats.cacheHitRate < 30 && stats.count > 10) {
        recommendations.push(`Operation "${operation}" has low cache hit rate (${stats.cacheHitRate}%). Consider caching strategy.`);
      }
    }

    return recommendations;
  }

  // Private helper methods

  /**
   * Generate hash for query caching
   */
  private generateQueryHash(query: string, parameters: any[]): string {
    const hashInput = JSON.stringify({ 
      query: query.replace(/\s+/g, ' ').trim(), 
      parameters 
    });
    
    // Simple hash implementation
    let hash = 0;
    if (hashInput.length === 0) return hash.toString();
    
    for (let i = 0; i < hashInput.length; i++) {
      const char = hashInput.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return Math.abs(hash).toString(16);
  }

  /**
   * Get TTL based on operation type
   */
  private getTTLForOperation(operation: string): number {
    switch (operation) {
      case 'select':
        return TTL_STRATEGIES.QUERY_CACHE;
      case 'function':
        return TTL_STRATEGIES.DEFAULT;
      default:
        return TTL_STRATEGIES.TEMPORARY;
    }
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(
    executor: () => Promise<T>, 
    timeout: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Query execution timeout after ${timeout}ms`));
      }, timeout);

      executor()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(
    operation: string, 
    totalTime: number, 
    cacheTime: number, 
    dbTime: number, 
    fromCache: boolean
  ): void {
    this.metrics.queries.total++;
    
    if (fromCache) {
      this.metrics.queries.cached++;
      this.metrics.timing.avgCacheTime = 
        (this.metrics.timing.avgCacheTime * (this.metrics.queries.cached - 1) + cacheTime) / this.metrics.queries.cached;
    } else {
      this.metrics.queries.database++;
      this.metrics.timing.avgDbTime = 
        (this.metrics.timing.avgDbTime * (this.metrics.queries.database - 1) + dbTime) / this.metrics.queries.database;
    }

    // Store query time for average calculation
    this.queryTimes.push(totalTime);
    if (this.queryTimes.length > this.maxStoredTimes) {
      this.queryTimes.shift();
    }

    // Update operation-specific metrics
    if (!this.metrics.operations[operation]) {
      this.metrics.operations[operation] = {
        count: 0,
        avgTime: 0,
        cacheHitRate: 0,
      };
    }

    const opMetrics = this.metrics.operations[operation];
    opMetrics.count++;
    opMetrics.avgTime = (opMetrics.avgTime * (opMetrics.count - 1) + totalTime) / opMetrics.count;
    
    // Calculate cache hit rate for this operation
    const opCacheHits = Array.from(Object.entries(this.metrics.operations))
      .filter(([op]) => op === operation)
      .reduce((acc, [, stats]) => acc + (fromCache ? 1 : 0), 0);
    opMetrics.cacheHitRate = Math.round((opCacheHits / opMetrics.count) * 10000) / 100;
  }
}

/**
 * Export singleton performance middleware
 */
export const performanceMiddleware = PerformanceMiddleware.getInstance();

/**
 * Performance middleware utilities for common operations
 */
export const perfUtils = {
  query: <T>(
    query: string, 
    params: any[], 
    context: QueryContext, 
    executor: () => Promise<T>
  ) => performanceMiddleware.executeQuery(query, params, context, executor),
  
  batch: <T>(queries: Array<{
    query: string;
    parameters: any[];
    context: QueryContext;
    executor: () => Promise<T>;
  }>) => performanceMiddleware.executeBatch(queries),
  
  invalidate: (operation: 'insert' | 'update' | 'delete', table: string, ids?: string[]) =>
    performanceMiddleware.invalidateCache(operation, table, ids),
  
  preload: (queries: Array<{
    key: string;
    query: string;
    parameters: any[];
    executor: () => Promise<any>;
  }>) => performanceMiddleware.preloadCache(queries),
  
  metrics: () => performanceMiddleware.getPerformanceMetrics(),
  reset: () => performanceMiddleware.resetMetrics(),
  recommendations: () => performanceMiddleware.getPerformanceRecommendations(),
};