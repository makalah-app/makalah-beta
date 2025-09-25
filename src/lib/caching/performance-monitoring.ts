/**
 * Performance Monitoring and Cache Hit Rate Tracking for Makalah AI
 * Comprehensive monitoring system for Redis cache performance and analytics
 * 
 * Task 10 - Performance Optimization with Redis Caching
 * Provides real-time monitoring, alerting, and analytics for cache performance
 */

import { redisManager, cacheUtils, REDIS_PREFIXES } from '../config/redis-config';
import { sessionManager } from './session-manager';
import { performanceMiddleware } from './performance-middleware';

/**
 * Performance metric types
 */
export type MetricType = 
  | 'cache_hit_rate'
  | 'response_time'
  | 'throughput'
  | 'error_rate'
  | 'memory_usage'
  | 'connection_health';

/**
 * Time range for metrics
 */
export type TimeRange = '1h' | '6h' | '24h' | '7d' | '30d';

/**
 * Performance metric data point
 */
export interface MetricDataPoint {
  timestamp: string;
  value: number;
  metadata?: Record<string, any>;
}

/**
 * Performance metric series
 */
export interface MetricSeries {
  metric: MetricType;
  timeRange: TimeRange;
  dataPoints: MetricDataPoint[];
  aggregation: {
    avg: number;
    min: number;
    max: number;
    count: number;
    trend: 'up' | 'down' | 'stable';
  };
}

/**
 * Cache operation statistics
 */
export interface CacheOperationStats {
  operation: string;
  total: number;
  hits: number;
  misses: number;
  hitRate: number;
  avgResponseTime: number;
  errorCount: number;
  errorRate: number;
  lastActivity: string;
}

/**
 * Performance alert configuration
 */
export interface PerformanceAlert {
  id: string;
  name: string;
  metric: MetricType;
  condition: 'greater_than' | 'less_than' | 'equals' | 'change_percent';
  threshold: number;
  timeWindow: number; // seconds
  enabled: boolean;
  lastTriggered?: string;
  triggerCount: number;
}

/**
 * Performance report
 */
export interface PerformanceReport {
  generatedAt: string;
  timeRange: TimeRange;
  summary: {
    totalRequests: number;
    cacheHitRate: number;
    avgResponseTime: number;
    errorRate: number;
    memoryUsage: string;
    connectionHealth: 'healthy' | 'degraded' | 'unhealthy';
  };
  metrics: MetricSeries[];
  operations: CacheOperationStats[];
  alerts: PerformanceAlert[];
  recommendations: string[];
}

/**
 * Performance monitoring configuration
 */
export interface MonitoringConfig {
  enabled: boolean;
  collectionInterval: number; // seconds
  retentionPeriod: number; // days
  alerting: {
    enabled: boolean;
    channels: ('console' | 'log' | 'webhook')[];
    webhookUrl?: string;
  };
  thresholds: {
    hitRateWarning: number;
    hitRateCritical: number;
    responseTimeWarning: number;
    responseTimeCritical: number;
    errorRateWarning: number;
    errorRateCritical: number;
  };
}

/**
 * Performance Monitor Manager
 */
export class PerformanceMonitorManager {
  private static instance: PerformanceMonitorManager;
  
  private config: MonitoringConfig = {
    enabled: true,
    collectionInterval: 60, // 1 minute
    retentionPeriod: 30, // 30 days
    alerting: {
      enabled: true,
      channels: ['console', 'log'],
    },
    thresholds: {
      hitRateWarning: 70,
      hitRateCritical: 50,
      responseTimeWarning: 100,
      responseTimeCritical: 500,
      errorRateWarning: 5,
      errorRateCritical: 10,
    },
  };

  private metrics: Map<string, MetricDataPoint[]> = new Map();
  private operations: Map<string, CacheOperationStats> = new Map();
  private alerts: Map<string, PerformanceAlert> = new Map();
  private collectionTimer?: NodeJS.Timeout;
  
  private rawMetrics = {
    requests: { total: 0, hits: 0, misses: 0, errors: 0 },
    responseTimes: [] as number[],
    operations: new Map<string, { total: number; hits: number; misses: number; errors: number; times: number[] }>(),
  };

  private constructor() {
    this.initializeDefaultAlerts();
    this.startMetricsCollection();
  }

  /**
   * Get singleton performance monitor manager instance
   */
  public static getInstance(): PerformanceMonitorManager {
    if (!PerformanceMonitorManager.instance) {
      PerformanceMonitorManager.instance = new PerformanceMonitorManager();
    }
    return PerformanceMonitorManager.instance;
  }

  /**
   * Update monitoring configuration
   */
  public updateConfig(newConfig: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (!this.config.enabled && this.collectionTimer) {
      clearInterval(this.collectionTimer);
      this.collectionTimer = undefined;
    } else if (this.config.enabled && !this.collectionTimer) {
      this.startMetricsCollection();
    }
    
    console.log('✓ Performance monitoring configuration updated');
  }

  /**
   * Record cache operation for monitoring
   */
  public recordCacheOperation(
    operation: string,
    hit: boolean,
    responseTime: number,
    error?: boolean
  ): void {
    if (!this.config.enabled) return;

    // Update raw metrics
    this.rawMetrics.requests.total++;
    if (hit) {
      this.rawMetrics.requests.hits++;
    } else {
      this.rawMetrics.requests.misses++;
    }
    if (error) {
      this.rawMetrics.requests.errors++;
    }
    this.rawMetrics.responseTimes.push(responseTime);

    // Update operation-specific metrics
    const opMetrics = this.rawMetrics.operations.get(operation) || {
      total: 0, hits: 0, misses: 0, errors: 0, times: []
    };
    opMetrics.total++;
    if (hit) opMetrics.hits++; else opMetrics.misses++;
    if (error) opMetrics.errors++;
    opMetrics.times.push(responseTime);
    this.rawMetrics.operations.set(operation, opMetrics);

    // Limit stored response times to prevent memory issues
    if (this.rawMetrics.responseTimes.length > 10000) {
      this.rawMetrics.responseTimes = this.rawMetrics.responseTimes.slice(-5000);
    }
    if (opMetrics.times.length > 1000) {
      opMetrics.times = opMetrics.times.slice(-500);
    }
  }

  /**
   * Get real-time performance metrics
   */
  public async getRealTimeMetrics(): Promise<{
    hitRate: number;
    avgResponseTime: number;
    throughput: number;
    errorRate: number;
    activeConnections: boolean;
    memoryUsage: string;
  }> {
    const total = this.rawMetrics.requests.total;
    const hits = this.rawMetrics.requests.hits;
    const errors = this.rawMetrics.requests.errors;
    const times = this.rawMetrics.responseTimes;

    const hitRate = total > 0 ? (hits / total) * 100 : 0;
    const avgResponseTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    const errorRate = total > 0 ? (errors / total) * 100 : 0;

    // Calculate throughput (requests per minute over last 5 minutes)
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    const recentPoints = this.getMetricDataPoints('throughput', '1h')
      .filter(p => new Date(p.timestamp).getTime() > fiveMinutesAgo);
    const throughput = recentPoints.length > 0 
      ? recentPoints.reduce((sum, p) => sum + p.value, 0) / recentPoints.length 
      : 0;

    // Check connection health
    const activeConnections = await redisManager.performHealthCheck();

    // Get memory usage
    const stats = await redisManager.getCacheStats();
    const memoryUsage = stats.memoryUsage || 'N/A';

    return {
      hitRate: Math.round(hitRate * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime * 100) / 100,
      throughput: Math.round(throughput),
      errorRate: Math.round(errorRate * 100) / 100,
      activeConnections,
      memoryUsage,
    };
  }

  /**
   * Get performance metrics for specific time range
   */
  public getMetrics(metric: MetricType, timeRange: TimeRange): MetricSeries {
    const dataPoints = this.getMetricDataPoints(metric, timeRange);
    
    if (dataPoints.length === 0) {
      return {
        metric,
        timeRange,
        dataPoints: [],
        aggregation: { avg: 0, min: 0, max: 0, count: 0, trend: 'stable' },
      };
    }

    const values = dataPoints.map(dp => dp.value);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    // Calculate trend
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const trendThreshold = avg * 0.05; // 5% change threshold
    
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (secondAvg > firstAvg + trendThreshold) trend = 'up';
    else if (secondAvg < firstAvg - trendThreshold) trend = 'down';

    return {
      metric,
      timeRange,
      dataPoints,
      aggregation: {
        avg: Math.round(avg * 100) / 100,
        min: Math.round(min * 100) / 100,
        max: Math.round(max * 100) / 100,
        count: values.length,
        trend,
      },
    };
  }

  /**
   * Get cache operation statistics
   */
  public getCacheOperationStats(): CacheOperationStats[] {
    const stats: CacheOperationStats[] = [];

    for (const [operation, metrics] of this.rawMetrics.operations) {
      const hitRate = metrics.total > 0 ? (metrics.hits / metrics.total) * 100 : 0;
      const errorRate = metrics.total > 0 ? (metrics.errors / metrics.total) * 100 : 0;
      const avgResponseTime = metrics.times.length > 0 
        ? metrics.times.reduce((a, b) => a + b, 0) / metrics.times.length 
        : 0;

      stats.push({
        operation,
        total: metrics.total,
        hits: metrics.hits,
        misses: metrics.misses,
        hitRate: Math.round(hitRate * 100) / 100,
        avgResponseTime: Math.round(avgResponseTime * 100) / 100,
        errorCount: metrics.errors,
        errorRate: Math.round(errorRate * 100) / 100,
        lastActivity: new Date().toISOString(),
      });
    }

    return stats.sort((a, b) => b.total - a.total);
  }

  /**
   * Generate comprehensive performance report
   */
  public async generateReport(timeRange: TimeRange = '24h'): Promise<PerformanceReport> {
    const realTimeMetrics = await this.getRealTimeMetrics();
    const operations = this.getCacheOperationStats();
    
    const metrics: MetricSeries[] = [
      this.getMetrics('cache_hit_rate', timeRange),
      this.getMetrics('response_time', timeRange),
      this.getMetrics('throughput', timeRange),
      this.getMetrics('error_rate', timeRange),
    ];

    const alerts = Array.from(this.alerts.values()).filter(alert => alert.enabled);
    const recommendations = this.generateRecommendations(realTimeMetrics, operations);

    return {
      generatedAt: new Date().toISOString(),
      timeRange,
      summary: {
        totalRequests: this.rawMetrics.requests.total,
        cacheHitRate: realTimeMetrics.hitRate,
        avgResponseTime: realTimeMetrics.avgResponseTime,
        errorRate: realTimeMetrics.errorRate,
        memoryUsage: realTimeMetrics.memoryUsage,
        connectionHealth: realTimeMetrics.activeConnections ? 'healthy' : 'unhealthy',
      },
      metrics,
      operations,
      alerts,
      recommendations,
    };
  }

  /**
   * Add custom performance alert
   */
  public addAlert(alert: Omit<PerformanceAlert, 'id' | 'triggerCount'>): string {
    const id = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullAlert: PerformanceAlert = {
      ...alert,
      id,
      triggerCount: 0,
    };
    
    this.alerts.set(id, fullAlert);
    console.log(`✓ Added performance alert: ${alert.name}`);
    
    return id;
  }

  /**
   * Remove performance alert
   */
  public removeAlert(alertId: string): boolean {
    const deleted = this.alerts.delete(alertId);
    if (deleted) {
      console.log(`✓ Removed performance alert: ${alertId}`);
    }
    return deleted;
  }

  /**
   * Check all alerts and trigger notifications
   */
  public async checkAlerts(): Promise<PerformanceAlert[]> {
    const triggeredAlerts: PerformanceAlert[] = [];
    
    if (!this.config.alerting.enabled) return triggeredAlerts;

    const realTimeMetrics = await this.getRealTimeMetrics();
    
    for (const alert of this.alerts.values()) {
      if (!alert.enabled) continue;
      
      let currentValue: number = 0;
      
      switch (alert.metric) {
        case 'cache_hit_rate':
          currentValue = realTimeMetrics.hitRate;
          break;
        case 'response_time':
          currentValue = realTimeMetrics.avgResponseTime;
          break;
        case 'error_rate':
          currentValue = realTimeMetrics.errorRate;
          break;
        case 'throughput':
          currentValue = realTimeMetrics.throughput;
          break;
      }
      
      let shouldTrigger = false;
      
      switch (alert.condition) {
        case 'greater_than':
          shouldTrigger = currentValue > alert.threshold;
          break;
        case 'less_than':
          shouldTrigger = currentValue < alert.threshold;
          break;
        case 'equals':
          shouldTrigger = Math.abs(currentValue - alert.threshold) < 0.01;
          break;
      }
      
      if (shouldTrigger) {
        alert.lastTriggered = new Date().toISOString();
        alert.triggerCount++;
        triggeredAlerts.push(alert);
        
        await this.sendAlertNotification(alert, currentValue);
      }
    }
    
    return triggeredAlerts;
  }

  /**
   * Export performance data for external analysis
   */
  public exportData(timeRange: TimeRange = '24h'): {
    metrics: Record<MetricType, MetricDataPoint[]>;
    operations: CacheOperationStats[];
    config: MonitoringConfig;
    exportedAt: string;
  } {
    const metricsData: Record<MetricType, MetricDataPoint[]> = {
      cache_hit_rate: this.getMetricDataPoints('cache_hit_rate', timeRange),
      response_time: this.getMetricDataPoints('response_time', timeRange),
      throughput: this.getMetricDataPoints('throughput', timeRange),
      error_rate: this.getMetricDataPoints('error_rate', timeRange),
      memory_usage: this.getMetricDataPoints('memory_usage', timeRange),
      connection_health: this.getMetricDataPoints('connection_health', timeRange),
    };

    return {
      metrics: metricsData,
      operations: this.getCacheOperationStats(),
      config: this.config,
      exportedAt: new Date().toISOString(),
    };
  }

  /**
   * Clear historical metrics data
   */
  public clearMetrics(olderThan?: Date): number {
    let clearedCount = 0;
    const cutoff = olderThan || new Date(Date.now() - this.config.retentionPeriod * 24 * 60 * 60 * 1000);
    
    for (const [metricKey, dataPoints] of this.metrics) {
      const originalLength = dataPoints.length;
      const filtered = dataPoints.filter(dp => new Date(dp.timestamp) > cutoff);
      this.metrics.set(metricKey, filtered);
      clearedCount += originalLength - filtered.length;
    }
    
    if (clearedCount > 0) {
      console.log(`✓ Cleared ${clearedCount} old metric data points`);
    }
    
    return clearedCount;
  }

  // Private methods

  /**
   * Initialize default performance alerts
   */
  private initializeDefaultAlerts(): void {
    this.addAlert({
      name: 'Low Cache Hit Rate',
      metric: 'cache_hit_rate',
      condition: 'less_than',
      threshold: this.config.thresholds.hitRateWarning,
      timeWindow: 300, // 5 minutes
      enabled: true,
    });

    this.addAlert({
      name: 'High Response Time',
      metric: 'response_time',
      condition: 'greater_than',
      threshold: this.config.thresholds.responseTimeWarning,
      timeWindow: 300, // 5 minutes
      enabled: true,
    });

    this.addAlert({
      name: 'High Error Rate',
      metric: 'error_rate',
      condition: 'greater_than',
      threshold: this.config.thresholds.errorRateWarning,
      timeWindow: 600, // 10 minutes
      enabled: true,
    });
  }

  /**
   * Start metrics collection timer
   */
  private startMetricsCollection(): void {
    if (this.collectionTimer) {
      clearInterval(this.collectionTimer);
    }

    this.collectionTimer = setInterval(async () => {
      await this.collectMetrics();
      await this.checkAlerts();
      this.clearMetrics(); // Clean old data
    }, this.config.collectionInterval * 1000);

    console.log(`✓ Performance metrics collection started (${this.config.collectionInterval}s interval)`);
  }

  /**
   * Collect current metrics
   */
  private async collectMetrics(): Promise<void> {
    const timestamp = new Date().toISOString();
    const realTimeMetrics = await this.getRealTimeMetrics();

    // Collect cache hit rate
    this.addMetricDataPoint('cache_hit_rate', {
      timestamp,
      value: realTimeMetrics.hitRate,
      metadata: { requests: this.rawMetrics.requests.total },
    });

    // Collect response time
    this.addMetricDataPoint('response_time', {
      timestamp,
      value: realTimeMetrics.avgResponseTime,
      metadata: { samples: this.rawMetrics.responseTimes.length },
    });

    // Collect throughput
    const recentRequests = this.rawMetrics.requests.total; // Simplified
    this.addMetricDataPoint('throughput', {
      timestamp,
      value: recentRequests / (this.config.collectionInterval / 60), // requests per minute
    });

    // Collect error rate
    this.addMetricDataPoint('error_rate', {
      timestamp,
      value: realTimeMetrics.errorRate,
      metadata: { errors: this.rawMetrics.requests.errors },
    });

    // Collect memory usage (if available)
    try {
      const stats = await redisManager.getCacheStats();
      this.addMetricDataPoint('memory_usage', {
        timestamp,
        value: 0, // Would need to parse memory info
        metadata: { memoryInfo: stats.memoryUsage },
      });
    } catch (error) {
      // Memory usage not available
    }

    // Collect connection health
    this.addMetricDataPoint('connection_health', {
      timestamp,
      value: realTimeMetrics.activeConnections ? 1 : 0,
    });
  }

  /**
   * Add metric data point
   */
  private addMetricDataPoint(metric: MetricType, dataPoint: MetricDataPoint): void {
    const metricKey = `${metric}`;
    const dataPoints = this.metrics.get(metricKey) || [];
    dataPoints.push(dataPoint);
    
    // Keep only recent data points to prevent memory issues
    const maxPoints = this.getMaxDataPoints();
    if (dataPoints.length > maxPoints) {
      dataPoints.splice(0, dataPoints.length - maxPoints);
    }
    
    this.metrics.set(metricKey, dataPoints);
  }

  /**
   * Get metric data points for time range
   */
  private getMetricDataPoints(metric: MetricType, timeRange: TimeRange): MetricDataPoint[] {
    const metricKey = `${metric}`;
    const dataPoints = this.metrics.get(metricKey) || [];
    
    const now = Date.now();
    const timeRangeMs = this.getTimeRangeMs(timeRange);
    const cutoff = now - timeRangeMs;
    
    return dataPoints.filter(dp => new Date(dp.timestamp).getTime() > cutoff);
  }

  /**
   * Get time range in milliseconds
   */
  private getTimeRangeMs(timeRange: TimeRange): number {
    switch (timeRange) {
      case '1h': return 60 * 60 * 1000;
      case '6h': return 6 * 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      case '7d': return 7 * 24 * 60 * 60 * 1000;
      case '30d': return 30 * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  }

  /**
   * Get maximum data points to store
   */
  private getMaxDataPoints(): number {
    // Store enough points for 30 days at current collection interval
    return (30 * 24 * 60 * 60) / this.config.collectionInterval;
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(
    realTimeMetrics: any,
    operations: CacheOperationStats[]
  ): string[] {
    const recommendations: string[] = [];

    if (realTimeMetrics.hitRate < this.config.thresholds.hitRateWarning) {
      recommendations.push(`Cache hit rate is low (${realTimeMetrics.hitRate}%). Consider optimizing TTL strategies or caching more frequently accessed data.`);
    }

    if (realTimeMetrics.avgResponseTime > this.config.thresholds.responseTimeWarning) {
      recommendations.push(`Average response time is high (${realTimeMetrics.avgResponseTime}ms). Consider optimizing network connection or Redis configuration.`);
    }

    if (realTimeMetrics.errorRate > this.config.thresholds.errorRateWarning) {
      recommendations.push(`Error rate is high (${realTimeMetrics.errorRate}%). Review connection stability and query patterns.`);
    }

    // Operation-specific recommendations
    const lowPerformingOps = operations.filter(op => op.hitRate < 30 && op.total > 10);
    if (lowPerformingOps.length > 0) {
      recommendations.push(`Operations with low hit rates detected: ${lowPerformingOps.map(op => op.operation).join(', ')}. Consider caching strategies for these operations.`);
    }

    const slowOperations = operations.filter(op => op.avgResponseTime > 50);
    if (slowOperations.length > 0) {
      recommendations.push(`Slow operations detected: ${slowOperations.map(op => `${op.operation} (${op.avgResponseTime}ms)`).join(', ')}. Consider optimization.`);
    }

    if (!realTimeMetrics.activeConnections) {
      recommendations.push('Redis connection is unhealthy. Check Redis server status and network connectivity.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Cache performance is optimal. No immediate action required.');
    }

    return recommendations;
  }

  /**
   * Send alert notification
   */
  private async sendAlertNotification(alert: PerformanceAlert, currentValue: number): Promise<void> {
    const message = `Performance Alert: ${alert.name} - ${alert.metric} is ${currentValue} (threshold: ${alert.threshold})`;
    
    for (const channel of this.config.alerting.channels) {
      switch (channel) {
        case 'console':
          console.warn(`🚨 ${message}`);
          break;
        case 'log':
          console.log(`ALERT [${new Date().toISOString()}]: ${message}`);
          break;
        case 'webhook':
          if (this.config.alerting.webhookUrl) {
            try {
              // In a real implementation, would send HTTP request to webhook
              console.log(`Would send webhook to: ${this.config.alerting.webhookUrl}`);
            } catch (error) {
              console.error('Failed to send webhook alert:', error);
            }
          }
          break;
      }
    }
  }
}

/**
 * Export singleton performance monitor manager
 */
export const performanceMonitorManager = PerformanceMonitorManager.getInstance();

/**
 * Performance monitoring utilities
 */
export const monitoringUtils = {
  record: (operation: string, hit: boolean, responseTime: number, error?: boolean) =>
    performanceMonitorManager.recordCacheOperation(operation, hit, responseTime, error),
  
  getRealTime: () => performanceMonitorManager.getRealTimeMetrics(),
  getMetrics: (metric: MetricType, timeRange: TimeRange) =>
    performanceMonitorManager.getMetrics(metric, timeRange),
  
  getStats: () => performanceMonitorManager.getCacheOperationStats(),
  generateReport: (timeRange?: TimeRange) => performanceMonitorManager.generateReport(timeRange),
  
  addAlert: (alert: any) => performanceMonitorManager.addAlert(alert),
  removeAlert: (alertId: string) => performanceMonitorManager.removeAlert(alertId),
  checkAlerts: () => performanceMonitorManager.checkAlerts(),
  
  export: (timeRange?: TimeRange) => performanceMonitorManager.exportData(timeRange),
  clear: (olderThan?: Date) => performanceMonitorManager.clearMetrics(olderThan),
  
  updateConfig: (config: Partial<MonitoringConfig>) => performanceMonitorManager.updateConfig(config),
};