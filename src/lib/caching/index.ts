/**
 * Makalah AI Caching System - Complete Redis Integration
 * Comprehensive caching infrastructure for performance optimization
 * 
 * Task 10 - Performance Optimization with Redis Caching
 * 
 * This module provides a complete Redis-based caching solution including:
 * - Session management with TTL strategies
 * - Artifact caching for database query optimization
 * - Performance optimization middleware
 * - Cache invalidation strategies and TTL management
 * - Connection testing and validation procedures
 * - Performance monitoring with cache hit rate tracking
 * - Integration testing with database infrastructure
 */

// Core Redis Configuration
import {
  redisManager,
  redis,
  cacheUtils,
  RedisManager,
  REDIS_PREFIXES,
  TTL_STRATEGIES,
} from '../config/redis-config';

export {
  redisManager,
  redis,
  cacheUtils,
  RedisManager,
  REDIS_PREFIXES,
  TTL_STRATEGIES,
};

// Session Management
import {
  sessionManager,
  sessionUtils,
  SessionManager,
  type UserSession,
  type SessionActivity,
  type SessionStats,
} from './session-manager';

export {
  sessionManager,
  sessionUtils,
  SessionManager,
  type UserSession,
  type SessionActivity,
  type SessionStats,
};

// Artifact Caching - REMOVED: Artifact functionality eliminated per cleanup philosophy

// Performance Middleware
import {
  performanceMiddleware,
  perfUtils,
  PerformanceMiddleware,
  type QueryContext,
  type QueryResult,
  type PerformanceMetrics,
} from './performance-middleware';

export {
  performanceMiddleware,
  perfUtils,
  PerformanceMiddleware,
  type QueryContext,
  type QueryResult,
  type PerformanceMetrics,
};

// Cache Invalidation
import {
  cacheInvalidationManager,
  invalidationUtils,
  CacheInvalidationManager,
  type InvalidationPattern,
  type InvalidationRule,
  type TTLStrategy,
  type InvalidationEvent,
} from './cache-invalidation';

export {
  cacheInvalidationManager,
  invalidationUtils,
  CacheInvalidationManager,
  type InvalidationPattern,
  type InvalidationRule,
  type TTLStrategy,
  type InvalidationEvent,
};

// Performance Monitoring
import {
  performanceMonitorManager,
  monitoringUtils,
  PerformanceMonitorManager,
  type MetricType,
  type TimeRange,
  type MetricDataPoint,
  type MetricSeries,
  type CacheOperationStats,
  type PerformanceAlert,
  type PerformanceReport,
  type MonitoringConfig,
} from './performance-monitoring';

export {
  performanceMonitorManager,
  monitoringUtils,
  PerformanceMonitorManager,
  type MetricType,
  type TimeRange,
  type MetricDataPoint,
  type MetricSeries,
  type CacheOperationStats,
  type PerformanceAlert,
  type PerformanceReport,
  type MonitoringConfig,
};

// Testing & Validation - REMOVED: Testing utilities moved to development environment

/**
 * Initialize the complete caching system
 */
export async function initializeCachingSystem(): Promise<{
  success: boolean;
  message: string;
  components: {
    redis: boolean;
    session: boolean;
    performance: boolean;
    invalidation: boolean;
    monitoring: boolean;
  };
}> {
  try {
    // Initializing Makalah AI Caching System - silent handling for production
    
    const components = {
      redis: false,
      session: false,
      performance: false,
      invalidation: false,
      monitoring: false,
    };

    // 1. Initialize Redis connection
    try {
      components.redis = await redisManager.performHealthCheck();
      // Redis connection established - silent handling for production
    } catch (error) {
      // Redis connection failed - silent handling for production
    }

    // 2. Initialize session management
    try {
      // Test session manager
      const testSession = await sessionManager.getSessionStats();
      components.session = true;
      // Session management initialized - silent handling for production
    } catch (error) {
      // Session management initialization failed - silent handling for production
    }

    // 3. Artifact caching - REMOVED: Artifact functionality eliminated per cleanup philosophy

    // 4. Initialize performance middleware
    try {
      const perfMetrics = performanceMiddleware.getPerformanceMetrics();
      components.performance = true;
      // Performance middleware initialized - silent handling for production
    } catch (error) {
      // Performance middleware initialization failed - silent handling for production
    }

    // 5. Initialize cache invalidation
    try {
      const invalidationStats = cacheInvalidationManager.getInvalidationStats();
      components.invalidation = true;
      // Cache invalidation system initialized - silent handling for production
    } catch (error) {
      // Cache invalidation initialization failed - silent handling for production
    }

    // 6. Initialize performance monitoring
    try {
      const monitoringMetrics = await performanceMonitorManager.getRealTimeMetrics();
      components.monitoring = true;
      // Performance monitoring initialized - silent handling for production
    } catch (error) {
      // Performance monitoring initialization failed - silent handling for production
    }

    const successCount = Object.values(components).filter(Boolean).length;
    const success = successCount === Object.keys(components).length;

    const message = success 
      ? '🎉 All caching system components initialized successfully!'
      : `⚠️ Caching system partially initialized (${successCount}/${Object.keys(components).length} components)`;

    // System initialization status logged - silent handling for production
    
    return {
      success,
      message,
      components,
    };

  } catch (error) {
    const errorMessage = `❌ Caching system initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    // System initialization error logged - silent handling for production
    
    return {
      success: false,
      message: errorMessage,
      components: {
        redis: false,
        session: false,
        performance: false,
        invalidation: false,
        monitoring: false,
      },
    };
  }
}

// Validation functions - REMOVED: Testing utilities moved to development environment

/**
 * Get comprehensive system status
 */
export async function getCachingSystemStatus(): Promise<{
  redis: {
    healthy: boolean;
    stats: any;
  };
  performance: {
    realTime: any;
    report: PerformanceReport;
  };
  sessions: {
    stats: any;
  };
  invalidation: {
    stats: any;
    efficiency: any;
  };
}> {
  try {
    const [
      redisStats,
      realTimeMetrics,
      performanceReport,
      sessionStats,
      invalidationStats,
      invalidationEfficiency,
    ] = await Promise.all([
      redisManager.getCacheStats(),
      performanceMonitorManager.getRealTimeMetrics(),
      performanceMonitorManager.generateReport('1h'),
      sessionManager.getSessionStats(),
      cacheInvalidationManager.getInvalidationStats(),
      cacheInvalidationManager.analyzeCacheEfficiency(),
    ]);

    return {
      redis: {
        healthy: await redisManager.performHealthCheck(),
        stats: redisStats,
      },
      performance: {
        realTime: realTimeMetrics,
        report: performanceReport,
      },
      sessions: {
        stats: sessionStats,
      },
      invalidation: {
        stats: invalidationStats,
        efficiency: invalidationEfficiency,
      },
    };
    
  } catch (error) {
    // Failed to get caching system status - silent handling for production
    throw error;
  }
}

/**
 * Utility functions for common caching operations
 */
export const cachingUtils = {
  // Initialization
  initialize: initializeCachingSystem,
  getStatus: getCachingSystemStatus,

  // Session operations
  session: {
    create: sessionUtils.create,
    get: sessionUtils.get,
    getByUserId: sessionUtils.getByUserId,
    update: sessionUtils.update,
    delete: sessionUtils.delete,
    extend: sessionUtils.extend,
    stats: sessionUtils.stats,
    cleanup: sessionUtils.cleanup,
  },

  // Artifact operations - REMOVED: Artifact functionality eliminated per cleanup philosophy

  // Performance operations
  performance: {
    query: perfUtils.query,
    batch: perfUtils.batch,
    invalidate: perfUtils.invalidate,
    preload: perfUtils.preload,
    metrics: perfUtils.metrics,
    reset: perfUtils.reset,
    recommendations: perfUtils.recommendations,
  },

  // Cache management
  cache: {
    set: cacheUtils.set,
    get: cacheUtils.get,
    del: cacheUtils.del,
    exists: cacheUtils.exists,
    ttl: cacheUtils.ttl,
    formatKey: cacheUtils.formatKey,
    isHealthy: cacheUtils.isHealthy,
    healthCheck: cacheUtils.healthCheck,
  },

  // Monitoring operations
  monitoring: {
    record: monitoringUtils.record,
    getRealTime: monitoringUtils.getRealTime,
    getMetrics: monitoringUtils.getMetrics,
    getStats: monitoringUtils.getStats,
    generateReport: monitoringUtils.generateReport,
    addAlert: monitoringUtils.addAlert,
    removeAlert: monitoringUtils.removeAlert,
    checkAlerts: monitoringUtils.checkAlerts,
    export: monitoringUtils.export,
    clear: monitoringUtils.clear,
    updateConfig: monitoringUtils.updateConfig,
  },

  // Invalidation operations
  invalidation: {
    trigger: invalidationUtils.trigger,
    optimizeTTL: invalidationUtils.optimizeTTL,
    scheduleCleanup: invalidationUtils.scheduleCleanup,
    cascadeInvalidate: invalidationUtils.cascadeInvalidate,
    addRule: invalidationUtils.addRule,
    addStrategy: invalidationUtils.addStrategy,
    stats: invalidationUtils.stats,
    analyze: invalidationUtils.analyze,
  },

  // Testing operations - REMOVED: Testing utilities moved to development environment
};

/**
 * Default export for easy initialization
 */
const cachingSystem = {
  initialize: initializeCachingSystem,
  getStatus: getCachingSystemStatus,
  utils: cachingUtils,
};

export default cachingSystem;