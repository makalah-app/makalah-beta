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

// Testing & Validation
import {
  redisTestingManager,
  testUtils,
  RedisTestingManager,
  type TestResult,
  type TestSuiteResult,
  type TestStatus,
  type BenchmarkResult,
} from './redis-testing';

export {
  redisTestingManager,
  testUtils,
  RedisTestingManager,
  type TestResult,
  type TestSuiteResult,
  type TestStatus,
  type BenchmarkResult,
};

// Integration Testing
import {
  integrationTestManager,
  integrationUtils,
  IntegrationTestManager,
  MockDatabase,
  type DatabaseSchema,
} from './integration-tests';

export {
  integrationTestManager,
  integrationUtils,
  IntegrationTestManager,
  MockDatabase,
  type DatabaseSchema,
};

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
    console.log('🚀 Initializing Makalah AI Caching System...');
    
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
      console.log('✓ Redis connection established');
    } catch (error) {
      console.error('✗ Redis connection failed:', error);
    }

    // 2. Initialize session management
    try {
      // Test session manager
      const testSession = await sessionManager.getSessionStats();
      components.session = true;
      console.log('✓ Session management initialized');
    } catch (error) {
      console.error('✗ Session management initialization failed:', error);
    }

    // 3. Artifact caching - REMOVED: Artifact functionality eliminated per cleanup philosophy

    // 4. Initialize performance middleware
    try {
      const perfMetrics = performanceMiddleware.getPerformanceMetrics();
      components.performance = true;
      console.log('✓ Performance middleware initialized');
    } catch (error) {
      console.error('✗ Performance middleware initialization failed:', error);
    }

    // 5. Initialize cache invalidation
    try {
      const invalidationStats = cacheInvalidationManager.getInvalidationStats();
      components.invalidation = true;
      console.log('✓ Cache invalidation system initialized');
    } catch (error) {
      console.error('✗ Cache invalidation initialization failed:', error);
    }

    // 6. Initialize performance monitoring
    try {
      const monitoringMetrics = await performanceMonitorManager.getRealTimeMetrics();
      components.monitoring = true;
      console.log('✓ Performance monitoring initialized');
    } catch (error) {
      console.error('✗ Performance monitoring initialization failed:', error);
    }

    const successCount = Object.values(components).filter(Boolean).length;
    const success = successCount === Object.keys(components).length;

    const message = success 
      ? '🎉 All caching system components initialized successfully!'
      : `⚠️ Caching system partially initialized (${successCount}/${Object.keys(components).length} components)`;

    console.log(message);
    
    return {
      success,
      message,
      components,
    };

  } catch (error) {
    const errorMessage = `❌ Caching system initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(errorMessage);
    
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

/**
 * Run comprehensive system validation
 */
export async function validateCachingSystem(): Promise<{
  success: boolean;
  message: string;
  results: {
    redis: TestSuiteResult;
    integration: TestSuiteResult;
  };
}> {
  try {
    console.log('🔍 Running comprehensive caching system validation...');
    
    // Run Redis validation tests
    console.log('📋 Running Redis validation tests...');
    const redisResults = await redisTestingManager.runValidationSuite();
    
    // Run integration tests
    console.log('🔗 Running integration tests...');
    const integrationResults = await integrationTestManager.runIntegrationTests();
    
    const totalPassed = redisResults.passed + integrationResults.passed;
    const totalTests = redisResults.totalTests + integrationResults.totalTests;
    const success = redisResults.summary.status !== 'fail' && integrationResults.summary.status !== 'fail';
    
    const message = success
      ? `✅ Validation completed successfully (${totalPassed}/${totalTests} tests passed)`
      : `❌ Validation completed with issues (${totalPassed}/${totalTests} tests passed)`;
    
    console.log(message);
    
    return {
      success,
      message,
      results: {
        redis: redisResults,
        integration: integrationResults,
      },
    };
    
  } catch (error) {
    const errorMessage = `❌ System validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(errorMessage);
    
    return {
      success: false,
      message: errorMessage,
      results: {
        redis: {
          suiteName: 'Redis Validation (Failed)',
          totalTests: 0,
          passed: 0,
          failed: 1,
          warnings: 0,
          skipped: 0,
          totalDuration: 0,
          results: [],
          summary: {
            status: 'fail',
            message: 'Validation suite failed to run',
            criticalIssues: [errorMessage],
            recommendations: ['Check system configuration and dependencies'],
          },
        },
        integration: {
          suiteName: 'Integration Tests (Failed)',
          totalTests: 0,
          passed: 0,
          failed: 1,
          warnings: 0,
          skipped: 0,
          totalDuration: 0,
          results: [],
          summary: {
            status: 'fail',
            message: 'Integration tests failed to run',
            criticalIssues: [errorMessage],
            recommendations: ['Check database connectivity and Redis configuration'],
          },
        },
      },
    };
  }
}

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
    console.error('Failed to get caching system status:', error);
    throw error;
  }
}

/**
 * Utility functions for common caching operations
 */
export const cachingUtils = {
  // Initialization
  initialize: initializeCachingSystem,
  validate: validateCachingSystem,
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

  // Testing operations
  testing: {
    runValidation: testUtils.runValidation,
    runBenchmarks: testUtils.runBenchmarks,
    testScenario: testUtils.testScenario,
    runIntegrationTests: integrationUtils.runTests,
    testIntegrationScenario: integrationUtils.testScenario,
  },
};

/**
 * Default export for easy initialization
 */
const cachingSystem = {
  initialize: initializeCachingSystem,
  validate: validateCachingSystem,
  getStatus: getCachingSystemStatus,
  utils: cachingUtils,
};

export default cachingSystem;
