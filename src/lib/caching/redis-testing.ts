/**
 * Redis Connection Testing and Validation Procedures for Makalah AI
 * Comprehensive testing suite for Redis integration and performance validation
 * 
 * Task 10 - Performance Optimization with Redis Caching
 * Provides testing utilities for Redis health, performance, and integration validation
 */

import { redisManager, cacheUtils, REDIS_PREFIXES } from '../config/redis-config';
import { sessionManager, type UserSession } from './session-manager';
import { performanceMiddleware } from './performance-middleware';
import { cacheInvalidationManager } from './cache-invalidation';

/**
 * Test result status
 */
export type TestStatus = 'pass' | 'fail' | 'warn' | 'skip';

/**
 * Individual test result
 */
export interface TestResult {
  name: string;
  description: string;
  status: TestStatus;
  duration: number;
  details?: Record<string, any>;
  error?: string;
  recommendations?: string[];
}

/**
 * Test suite result
 */
export interface TestSuiteResult {
  suiteName: string;
  totalTests: number;
  passed: number;
  failed: number;
  warnings: number;
  skipped: number;
  totalDuration: number;
  results: TestResult[];
  summary: {
    status: TestStatus;
    message: string;
    criticalIssues: string[];
    recommendations: string[];
  };
}

/**
 * Redis performance benchmark result
 */
export interface BenchmarkResult {
  operation: string;
  iterations: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  throughput: number; // operations per second
  successRate: number;
  errors: string[];
}

/**
 * Redis Testing and Validation Manager
 */
export class RedisTestingManager {
  private static instance: RedisTestingManager;

  private constructor() {}

  /**
   * Get singleton Redis testing manager instance
   */
  public static getInstance(): RedisTestingManager {
    if (!RedisTestingManager.instance) {
      RedisTestingManager.instance = new RedisTestingManager();
    }
    return RedisTestingManager.instance;
  }

  /**
   * Run comprehensive Redis validation suite
   */
  public async runValidationSuite(): Promise<TestSuiteResult> {
    const startTime = Date.now();
    const results: TestResult[] = [];
    
    console.log('🧪 Starting Redis validation suite...\n');

    // Connection tests
    results.push(await this.testRedisConnection());
    results.push(await this.testRedisAuthentication());
    results.push(await this.testRedisHealth());

    // Basic operations tests
    results.push(await this.testBasicOperations());
    results.push(await this.testTTLOperations());
    results.push(await this.testPatternOperations());

    // Integration tests
    results.push(await this.testSessionManagement());
    results.push(await this.testPerformanceMiddleware());
    results.push(await this.testCacheInvalidation());

    // Performance tests
    results.push(await this.testCachePerformance());
    results.push(await this.testConcurrencyHandling());

    // Edge case tests
    results.push(await this.testErrorHandling());
    results.push(await this.testMemoryUsage());

    const totalDuration = Date.now() - startTime;
    
    // Calculate summary statistics
    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;
    const warnings = results.filter(r => r.status === 'warn').length;
    const skipped = results.filter(r => r.status === 'skip').length;

    const criticalIssues = results
      .filter(r => r.status === 'fail')
      .map(r => r.error || r.name);

    const recommendations = results
      .flatMap(r => r.recommendations || [])
      .filter((rec, index, arr) => arr.indexOf(rec) === index); // Unique recommendations

    const overallStatus: TestStatus = 
      failed > 0 ? 'fail' : 
      warnings > 0 ? 'warn' : 
      'pass';

    const summary = {
      status: overallStatus,
      message: `${passed}/${results.length} tests passed`,
      criticalIssues,
      recommendations,
    };

    console.log(`\n✅ Redis validation suite completed in ${totalDuration}ms`);
    console.log(`📊 Results: ${passed} passed, ${failed} failed, ${warnings} warnings, ${skipped} skipped`);

    return {
      suiteName: 'Redis Comprehensive Validation',
      totalTests: results.length,
      passed,
      failed,
      warnings,
      skipped,
      totalDuration,
      results,
      summary,
    };
  }

  /**
   * Run performance benchmarks
   */
  public async runBenchmarks(iterations: number = 1000): Promise<{
    benchmarks: BenchmarkResult[];
    summary: {
      avgThroughput: number;
      totalOperations: number;
      totalTime: number;
      overallSuccessRate: number;
    };
  }> {
    const benchmarks: BenchmarkResult[] = [];
    
    console.log(`🏃‍♂️ Starting Redis performance benchmarks (${iterations} iterations each)...\n`);

    // Benchmark different operations
    benchmarks.push(await this.benchmarkOperation('SET', iterations, async () => {
      const key = `benchmark:set:${Date.now()}:${Math.random()}`;
      await cacheUtils.set(key, 'test-value', 60);
    }));

    benchmarks.push(await this.benchmarkOperation('GET', iterations, async () => {
      const key = `benchmark:get:${Date.now()}:${Math.random()}`;
      await cacheUtils.set(key, 'test-value', 60);
      await cacheUtils.get(key);
    }));

    benchmarks.push(await this.benchmarkOperation('DEL', iterations, async () => {
      const key = `benchmark:del:${Date.now()}:${Math.random()}`;
      await cacheUtils.set(key, 'test-value', 60);
      await cacheUtils.del(key);
    }));

    benchmarks.push(await this.benchmarkOperation('TTL', iterations, async () => {
      const key = `benchmark:ttl:${Date.now()}:${Math.random()}`;
      await cacheUtils.set(key, 'test-value', 60);
      await cacheUtils.ttl(key);
    }));

    // Calculate summary
    const totalOperations = benchmarks.reduce((sum, b) => sum + b.iterations, 0);
    const totalTime = benchmarks.reduce((sum, b) => sum + b.totalTime, 0);
    const avgThroughput = benchmarks.reduce((sum, b) => sum + b.throughput, 0) / benchmarks.length;
    const overallSuccessRate = benchmarks.reduce((sum, b) => sum + b.successRate, 0) / benchmarks.length;

    console.log(`\n🏁 Benchmarks completed`);
    console.log(`📈 Average throughput: ${Math.round(avgThroughput)} ops/sec`);
    console.log(`⏱️  Total time: ${totalTime}ms for ${totalOperations} operations`);

    return {
      benchmarks,
      summary: {
        avgThroughput: Math.round(avgThroughput * 100) / 100,
        totalOperations,
        totalTime,
        overallSuccessRate: Math.round(overallSuccessRate * 100) / 100,
      },
    };
  }

  /**
   * Test specific Redis integration scenario
   */
  public async testIntegrationScenario(scenario: 'session_workflow' | 'cache_invalidation'): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      switch (scenario) {
        case 'session_workflow':
          return await this.testSessionWorkflowScenario();
        case 'cache_invalidation':
          return await this.testCacheInvalidationScenario();
        default:
          throw new Error(`Unknown scenario: ${scenario}`);
      }
    } catch (error) {
      return {
        name: `Integration Scenario: ${scenario}`,
        description: `Test ${scenario} integration scenario`,
        status: 'fail',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Individual test implementations

  private async testRedisConnection(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const isHealthy = await redisManager.performHealthCheck();
      
      return {
        name: 'Redis Connection',
        description: 'Test Redis connection establishment',
        status: isHealthy ? 'pass' : 'fail',
        duration: Date.now() - startTime,
        details: { healthy: isHealthy },
        recommendations: isHealthy ? [] : ['Check Redis server status and connection credentials'],
      };
    } catch (error) {
      return {
        name: 'Redis Connection',
        description: 'Test Redis connection establishment',
        status: 'fail',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        recommendations: ['Verify Redis server is running and accessible'],
      };
    }
  }

  private async testRedisAuthentication(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // Test with current credentials
      const testKey = `auth-test:${Date.now()}`;
      await cacheUtils.set(testKey, 'auth-test-value', 30);
      const retrieved = await cacheUtils.get(testKey);
      await cacheUtils.del(testKey);
      
      return {
        name: 'Redis Authentication',
        description: 'Test Redis authentication with current credentials',
        status: retrieved === 'auth-test-value' ? 'pass' : 'fail',
        duration: Date.now() - startTime,
        details: { authSuccessful: retrieved === 'auth-test-value' },
      };
    } catch (error) {
      return {
        name: 'Redis Authentication',
        description: 'Test Redis authentication with current credentials',
        status: 'fail',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        recommendations: ['Verify Redis authentication token is correct'],
      };
    }
  }

  private async testRedisHealth(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const stats = await redisManager.getCacheStats();
      
      return {
        name: 'Redis Health Check',
        description: 'Comprehensive Redis health assessment',
        status: stats.isHealthy ? 'pass' : 'fail',
        duration: Date.now() - startTime,
        details: stats,
      };
    } catch (error) {
      return {
        name: 'Redis Health Check',
        description: 'Comprehensive Redis health assessment',
        status: 'fail',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async testBasicOperations(): Promise<TestResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    
    try {
      const testKey = `basic-test:${Date.now()}`;
      const testValue = { message: 'test', timestamp: Date.now() };
      
      // Test SET
      const setResult = await cacheUtils.set(testKey, testValue, 60);
      if (!setResult) errors.push('SET operation failed');
      
      // Test GET
      const getValue = await cacheUtils.get(testKey);
      if (JSON.stringify(getValue) !== JSON.stringify(testValue)) {
        errors.push('GET operation returned incorrect value');
      }
      
      // Test EXISTS
      const exists = await cacheUtils.exists(testKey);
      if (!exists) errors.push('EXISTS operation failed');
      
      // Test DELETE
      const delResult = await cacheUtils.del(testKey);
      if (!delResult) errors.push('DELETE operation failed');
      
      // Verify deletion
      const afterDel = await cacheUtils.get(testKey);
      if (afterDel !== null) errors.push('Key still exists after deletion');
      
      return {
        name: 'Basic Operations',
        description: 'Test SET, GET, EXISTS, DELETE operations',
        status: errors.length === 0 ? 'pass' : 'fail',
        duration: Date.now() - startTime,
        details: { operations: ['SET', 'GET', 'EXISTS', 'DELETE'], errors },
        error: errors.length > 0 ? errors.join(', ') : undefined,
      };
    } catch (error) {
      return {
        name: 'Basic Operations',
        description: 'Test SET, GET, EXISTS, DELETE operations',
        status: 'fail',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async testTTLOperations(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const testKey = `ttl-test:${Date.now()}`;
      
      // Set with TTL
      await cacheUtils.set(testKey, 'ttl-test-value', 2); // 2 seconds
      
      // Check initial TTL
      const initialTTL = await cacheUtils.ttl(testKey);
      if (!initialTTL || initialTTL <= 0) {
        throw new Error('TTL not set correctly');
      }
      
      // Wait a bit and check TTL decreased
      await new Promise(resolve => setTimeout(resolve, 1000));
      const laterTTL = await cacheUtils.ttl(testKey);
      
      if (!laterTTL || laterTTL >= initialTTL) {
        throw new Error('TTL not decreasing correctly');
      }
      
      // Clean up
      await cacheUtils.del(testKey);
      
      return {
        name: 'TTL Operations',
        description: 'Test TTL setting and expiration behavior',
        status: 'pass',
        duration: Date.now() - startTime,
        details: { initialTTL, laterTTL },
      };
    } catch (error) {
      return {
        name: 'TTL Operations',
        description: 'Test TTL setting and expiration behavior',
        status: 'fail',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async testPatternOperations(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const testPattern = `pattern-test:${Date.now()}`;
      const keys: string[] = [];
      
      // Create multiple keys with same pattern
      for (let i = 0; i < 5; i++) {
        const key = `${testPattern}:${i}`;
        await cacheUtils.set(key, `value-${i}`, 60);
        keys.push(key);
      }
      
      // Test pattern deletion
      const deleted = await redisManager.deleteCachePattern(`${testPattern}:*`);
      if (deleted !== 5) {
        throw new Error(`Expected to delete 5 keys, but deleted ${deleted}`);
      }
      
      // Verify all keys are deleted
      for (const key of keys) {
        const exists = await cacheUtils.exists(key);
        if (exists) {
          throw new Error(`Key ${key} still exists after pattern deletion`);
        }
      }
      
      return {
        name: 'Pattern Operations',
        description: 'Test pattern-based key operations',
        status: 'pass',
        duration: Date.now() - startTime,
        details: { pattern: `${testPattern}:*`, deletedKeys: deleted },
      };
    } catch (error) {
      return {
        name: 'Pattern Operations',
        description: 'Test pattern-based key operations',
        status: 'fail',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async testSessionManagement(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const testSession: UserSession = {
        userId: `test-user-${Date.now()}`,
        sessionId: `test-session-${Date.now()}`,
        email: 'test@example.com',
        role: 'user',
        lastActivity: new Date(),
        preferences: { theme: 'light' },
        permissions: ['read'],
        metadata: {
          loginTime: new Date(),
          refreshCount: 0,
        },
      };
      
      // Test session creation
      const created = await sessionManager.createSession(testSession);
      if (!created) throw new Error('Session creation failed');
      
      // Test session retrieval
      const retrieved = await sessionManager.getSession(testSession.sessionId);
      if (!retrieved || retrieved.userId !== testSession.userId) {
        throw new Error('Session retrieval failed');
      }
      
      // Test session update
      retrieved.preferences.theme = 'dark';
      const updated = await sessionManager.updateSession(retrieved);
      if (!updated) throw new Error('Session update failed');
      
      // Test session deletion
      const deleted = await sessionManager.deleteSession(testSession.sessionId);
      if (!deleted) throw new Error('Session deletion failed');
      
      return {
        name: 'Session Management',
        description: 'Test session CRUD operations',
        status: 'pass',
        duration: Date.now() - startTime,
        details: { sessionId: testSession.sessionId, operations: ['create', 'read', 'update', 'delete'] },
      };
    } catch (error) {
      return {
        name: 'Session Management',
        description: 'Test session CRUD operations',
        status: 'fail',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }


  private async testPerformanceMiddleware(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // Test cached query execution
      const result = await performanceMiddleware.executeQuery(
        'SELECT * FROM test_table WHERE id = ?',
        [123],
        {
          userId: 'test-user',
          operation: 'select',
          cacheable: true,
          priority: 'medium',
        },
        async () => ({ id: 123, name: 'Test Record', data: 'test data' })
      );
      
      if (!result.data || result.data.id !== 123) {
        throw new Error('Performance middleware query execution failed');
      }
      
      // Test metrics collection
      const metrics = performanceMiddleware.getPerformanceMetrics();
      if (metrics.queries.total === 0) {
        throw new Error('Performance metrics not collected');
      }
      
      return {
        name: 'Performance Middleware',
        description: 'Test performance middleware integration',
        status: 'pass',
        duration: Date.now() - startTime,
        details: { 
          queryExecuted: true,
          fromCache: result.fromCache,
          executionTime: result.executionTime,
          metricsCollected: true
        },
      };
    } catch (error) {
      return {
        name: 'Performance Middleware',
        description: 'Test performance middleware integration',
        status: 'fail',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async testCacheInvalidation(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // Test triggering invalidation
      const events = await cacheInvalidationManager.triggerInvalidation(
        'test.invalidation',
        'test_table',
        'update',
        { testData: true }
      );
      
      // Test TTL optimization
      const optimizedTTL = await cacheInvalidationManager.optimizeTTL(
        `${REDIS_PREFIXES.ARTIFACT}test-key`,
        { frequency: 15, lastAccess: new Date(), dataSize: 1024 }
      );
      
      return {
        name: 'Cache Invalidation',
        description: 'Test cache invalidation and TTL optimization',
        status: 'pass',
        duration: Date.now() - startTime,
        details: { 
          triggeredEvents: events.length,
          optimizedTTL,
          rulesProcessed: events.map(e => e.ruleId)
        },
      };
    } catch (error) {
      return {
        name: 'Cache Invalidation',
        description: 'Test cache invalidation and TTL optimization',
        status: 'fail',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async testCachePerformance(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const iterations = 100;
      const testKey = `perf-test:${Date.now()}`;
      const testValue = { data: 'performance test value', timestamp: Date.now() };
      
      // Measure SET performance
      const setStart = Date.now();
      for (let i = 0; i < iterations; i++) {
        await cacheUtils.set(`${testKey}:${i}`, testValue, 60);
      }
      const setTime = Date.now() - setStart;
      
      // Measure GET performance
      const getStart = Date.now();
      for (let i = 0; i < iterations; i++) {
        await cacheUtils.get(`${testKey}:${i}`);
      }
      const getTime = Date.now() - getStart;
      
      // Cleanup
      for (let i = 0; i < iterations; i++) {
        await cacheUtils.del(`${testKey}:${i}`);
      }
      
      const avgSetTime = setTime / iterations;
      const avgGetTime = getTime / iterations;
      
      // Performance thresholds
      const setThreshold = 10; // 10ms per SET
      const getThreshold = 5;  // 5ms per GET
      
      const setPerf = avgSetTime <= setThreshold ? 'good' : 'slow';
      const getPerf = avgGetTime <= getThreshold ? 'good' : 'slow';
      
      return {
        name: 'Cache Performance',
        description: 'Test cache operation performance',
        status: (setPerf === 'good' && getPerf === 'good') ? 'pass' : 'warn',
        duration: Date.now() - startTime,
        details: {
          iterations,
          setTime: `${avgSetTime.toFixed(2)}ms avg`,
          getTime: `${avgGetTime.toFixed(2)}ms avg`,
          setPerformance: setPerf,
          getPerformance: getPerf,
        },
        recommendations: [
          ...(setPerf === 'slow' ? [`SET operations are slow (${avgSetTime.toFixed(2)}ms avg). Consider optimizing network or Redis configuration.`] : []),
          ...(getPerf === 'slow' ? [`GET operations are slow (${avgGetTime.toFixed(2)}ms avg). Consider optimizing network or Redis configuration.`] : []),
        ],
      };
    } catch (error) {
      return {
        name: 'Cache Performance',
        description: 'Test cache operation performance',
        status: 'fail',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async testConcurrencyHandling(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const concurrentOperations = 50;
      const testKey = `concurrency-test:${Date.now()}`;
      
      // Create concurrent SET operations
      const setPromises = Array.from({ length: concurrentOperations }, (_, i) =>
        cacheUtils.set(`${testKey}:${i}`, `value-${i}`, 60)
      );
      
      const setResults = await Promise.all(setPromises);
      const successfulSets = setResults.filter(Boolean).length;
      
      // Create concurrent GET operations
      const getPromises = Array.from({ length: concurrentOperations }, (_, i) =>
        cacheUtils.get(`${testKey}:${i}`)
      );
      
      const getResults = await Promise.all(getPromises);
      const successfulGets = getResults.filter(r => r !== null).length;
      
      // Cleanup
      const delPromises = Array.from({ length: concurrentOperations }, (_, i) =>
        cacheUtils.del(`${testKey}:${i}`)
      );
      await Promise.all(delPromises);
      
      const successRate = (successfulSets + successfulGets) / (concurrentOperations * 2) * 100;
      
      return {
        name: 'Concurrency Handling',
        description: 'Test concurrent cache operations',
        status: successRate >= 95 ? 'pass' : successRate >= 90 ? 'warn' : 'fail',
        duration: Date.now() - startTime,
        details: {
          concurrentOperations,
          successfulSets,
          successfulGets,
          successRate: `${successRate.toFixed(1)}%`,
        },
        recommendations: successRate < 95 ? ['Consider optimizing Redis connection pool or reducing concurrent load'] : [],
      };
    } catch (error) {
      return {
        name: 'Concurrency Handling',
        description: 'Test concurrent cache operations',
        status: 'fail',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async testErrorHandling(): Promise<TestResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    
    try {
      // Test invalid key operations
      try {
        await cacheUtils.get('');
      } catch (error) {
        // Expected error for empty key
      }
      
      // Test extremely long key
      const longKey = 'a'.repeat(10000);
      try {
        await cacheUtils.set(longKey, 'value', 60);
      } catch (error) {
        // May fail with very long keys
      }
      
      // Test very large value
      const largeValue = 'x'.repeat(1000000); // 1MB
      try {
        const testKey = `large-value-test:${Date.now()}`;
        await cacheUtils.set(testKey, largeValue, 60);
        await cacheUtils.del(testKey);
      } catch (error) {
        errors.push('Large value handling failed');
      }
      
      return {
        name: 'Error Handling',
        description: 'Test error handling with edge cases',
        status: errors.length === 0 ? 'pass' : 'warn',
        duration: Date.now() - startTime,
        details: { errorsEncountered: errors.length, errors },
      };
    } catch (error) {
      return {
        name: 'Error Handling',
        description: 'Test error handling with edge cases',
        status: 'fail',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async testMemoryUsage(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const stats = await redisManager.getCacheStats();
      
      return {
        name: 'Memory Usage',
        description: 'Check Redis memory usage and health',
        status: 'pass',
        duration: Date.now() - startTime,
        details: stats,
      };
    } catch (error) {
      return {
        name: 'Memory Usage',
        description: 'Check Redis memory usage and health',
        status: 'warn',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        recommendations: ['Memory usage information not available'],
      };
    }
  }

  // Scenario tests

  private async testSessionWorkflowScenario(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // Simulate complete session workflow
      const userId = `workflow-user-${Date.now()}`;
      const sessionId = `workflow-session-${Date.now()}`;
      
      // 1. User login - create session
      const session: UserSession = {
        userId,
        sessionId,
        email: `${userId}@test.com`,
        role: 'user',
        lastActivity: new Date(),
        preferences: { theme: 'light' },
        permissions: ['read', 'write'],
        metadata: { loginTime: new Date(), refreshCount: 0 },
      };
      
      await sessionManager.createSession(session);
      
      // 2. User activity - update session
      for (let i = 0; i < 5; i++) {
        const retrieved = await sessionManager.getSession(sessionId);
        if (retrieved) {
          retrieved.lastActivity = new Date();
          await sessionManager.updateSession(retrieved);
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // 3. Session extension
      await sessionManager.extendSession(sessionId, 3600);
      
      // 4. User logout - cleanup
      await sessionManager.deleteSession(sessionId);
      
      return {
        name: 'Session Workflow Scenario',
        description: 'Complete session lifecycle workflow',
        status: 'pass',
        duration: Date.now() - startTime,
        details: { userId, sessionId, steps: ['create', 'activity', 'extend', 'cleanup'] },
      };
    } catch (error) {
      return {
        name: 'Session Workflow Scenario',
        description: 'Complete session lifecycle workflow',
        status: 'fail',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }


  private async testCacheInvalidationScenario(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // Set up test data
      const testKeys = [`test-key-${Date.now()}:1`, `test-key-${Date.now()}:2`];
      for (const key of testKeys) {
        await cacheUtils.set(key, `value-${key}`, 300);
      }
      
      // Test pattern invalidation
      const pattern = testKeys[0].split(':')[0] + ':*';
      const invalidated = await redisManager.deleteCachePattern(pattern);
      
      // Verify invalidation
      let stillExists = 0;
      for (const key of testKeys) {
        const exists = await cacheUtils.exists(key);
        if (exists) stillExists++;
      }
      
      return {
        name: 'Cache Invalidation Scenario',
        description: 'Test cache invalidation patterns',
        status: stillExists === 0 ? 'pass' : 'fail',
        duration: Date.now() - startTime,
        details: { 
          pattern,
          invalidatedKeys: invalidated,
          remainingKeys: stillExists,
        },
        error: stillExists > 0 ? `${stillExists} keys still exist after invalidation` : undefined,
      };
    } catch (error) {
      return {
        name: 'Cache Invalidation Scenario',
        description: 'Test cache invalidation patterns',
        status: 'fail',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Benchmark helper

  private async benchmarkOperation(
    name: string,
    iterations: number,
    operation: () => Promise<void>
  ): Promise<BenchmarkResult> {
    const times: number[] = [];
    const errors: string[] = [];
    let successCount = 0;

    console.log(`⏱️  Benchmarking ${name}...`);

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      try {
        await operation();
        const time = Date.now() - startTime;
        times.push(time);
        successCount++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(errorMsg);
        times.push(Date.now() - startTime); // Include failed operation time
      }
    }

    const totalTime = times.reduce((sum, time) => sum + time, 0);
    const avgTime = totalTime / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const throughput = (successCount / totalTime) * 1000; // ops per second
    const successRate = (successCount / iterations) * 100;

    console.log(`   ${name}: ${avgTime.toFixed(2)}ms avg, ${throughput.toFixed(0)} ops/sec`);

    return {
      operation: name,
      iterations,
      totalTime,
      avgTime: Math.round(avgTime * 100) / 100,
      minTime,
      maxTime,
      throughput: Math.round(throughput),
      successRate: Math.round(successRate * 100) / 100,
      errors: [...new Set(errors)], // Unique errors
    };
  }
}

/**
 * Export singleton Redis testing manager
 */
export const redisTestingManager = RedisTestingManager.getInstance();

/**
 * Testing utilities for common operations
 */
export const testUtils = {
  runValidation: () => redisTestingManager.runValidationSuite(),
  runBenchmarks: (iterations?: number) => redisTestingManager.runBenchmarks(iterations),
  testScenario: (scenario: 'session_workflow' | 'cache_invalidation') =>
    redisTestingManager.testIntegrationScenario(scenario),
};