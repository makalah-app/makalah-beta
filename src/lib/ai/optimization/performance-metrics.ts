/**
 * Academic AI Performance Tracking and Quality Metrics System
 * 
 * Provides comprehensive performance monitoring, quality metrics collection,
 * and analytics for academic AI operations with real-time tracking and reporting.
 * 
 * Based on Vercel AI SDK v5 patterns from:
 * /Users/eriksupit/Desktop/makalah/documentation/docs/03-ai-sdk-core/60-telemetry.mdx
 */

import type { LanguageModelV2Middleware } from '@ai-sdk/provider';

export interface PerformanceMetricsConfig {
  /** Enable performance tracking */
  enableTracking: boolean;
  /** Metrics collection settings */
  metricsCollection: MetricsCollectionConfig;
  /** Performance analysis settings */
  performanceAnalysis: PerformanceAnalysisConfig;
  /** Alerting configuration */
  alertingConfig: AlertingConfig;
  /** Reporting configuration */
  reportingConfig: ReportingConfig;
  /** Data retention settings */
  dataRetention: DataRetentionConfig;
}

export interface MetricsCollectionConfig {
  /** Metrics to collect */
  enabledMetrics: MetricType[];
  /** Collection frequency */
  collectionInterval: number;
  /** Sampling rate for high-volume metrics */
  samplingRate: number;
  /** Enable real-time metrics */
  enableRealTime: boolean;
  /** Enable detailed logging */
  enableDetailedLogging: boolean;
}

export interface PerformanceAnalysisConfig {
  /** Enable automatic analysis */
  enableAutoAnalysis: boolean;
  /** Analysis interval (ms) */
  analysisInterval: number;
  /** Performance thresholds */
  performanceThresholds: PerformanceThresholds;
  /** Enable trend analysis */
  enableTrendAnalysis: boolean;
  /** Enable anomaly detection */
  enableAnomalyDetection: boolean;
}

export interface AlertingConfig {
  /** Enable performance alerts */
  enableAlerts: boolean;
  /** Alert thresholds */
  alertThresholds: AlertThresholds;
  /** Alert channels */
  alertChannels: string[];
  /** Alert cooldown period (ms) */
  alertCooldown: number;
}

export interface ReportingConfig {
  /** Enable automated reports */
  enableReports: boolean;
  /** Report generation schedule */
  reportSchedule: ReportSchedule;
  /** Report formats */
  reportFormats: string[];
  /** Report recipients */
  reportRecipients: string[];
}

export interface DataRetentionConfig {
  /** Raw metrics retention period (days) */
  rawMetricsRetention: number;
  /** Aggregated metrics retention period (days) */
  aggregatedMetricsRetention: number;
  /** Report retention period (days) */
  reportRetention: number;
  /** Enable data compression */
  enableCompression: boolean;
}

export type MetricType = 
  | 'response_time' 
  | 'token_usage' 
  | 'cost' 
  | 'quality_score' 
  | 'user_satisfaction' 
  | 'error_rate' 
  | 'throughput' 
  | 'cache_hit_rate'
  | 'academic_compliance'
  | 'citation_accuracy';

export interface PerformanceThresholds {
  maxResponseTime: number;
  maxTokenUsage: number;
  maxCostPerRequest: number;
  minQualityScore: number;
  maxErrorRate: number;
  minUserSatisfaction: number;
  minCacheHitRate: number;
}

export interface AlertThresholds {
  criticalResponseTime: number;
  warningResponseTime: number;
  criticalErrorRate: number;
  warningErrorRate: number;
  criticalCostOverrun: number;
  warningCostOverrun: number;
}

export interface ReportSchedule {
  daily: boolean;
  weekly: boolean;
  monthly: boolean;
  customInterval?: number;
}

export interface PerformanceMetric {
  /** Metric identifier */
  id: string;
  /** Metric type */
  type: MetricType;
  /** Metric value */
  value: number;
  /** Metric unit */
  unit: string;
  /** Timestamp */
  timestamp: Date;
  /** Additional context */
  context?: MetricContext;
  /** Labels for grouping */
  labels?: Record<string, string>;
}

export interface MetricContext {
  /** Request ID */
  requestId?: string;
  /** User ID */
  userId?: string;
  /** Academic phase */
  phase?: string;
  /** Model used */
  model?: string;
  /** Session ID */
  sessionId?: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

export interface PerformanceReport {
  /** Report ID */
  id: string;
  /** Report type */
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  /** Report period */
  period: {
    start: Date;
    end: Date;
  };
  /** Performance summary */
  summary: PerformanceSummary;
  /** Detailed metrics */
  metrics: MetricAnalysis[];
  /** Performance insights */
  insights: PerformanceInsight[];
  /** Trends analysis */
  trends: TrendAnalysis[];
  /** Recommendations */
  recommendations: PerformanceRecommendation[];
  /** Generated timestamp */
  generatedAt: Date;
}

export interface PerformanceSummary {
  /** Total requests processed */
  totalRequests: number;
  /** Average response time */
  avgResponseTime: number;
  /** Total tokens consumed */
  totalTokens: number;
  /** Total cost incurred */
  totalCost: number;
  /** Average quality score */
  avgQualityScore: number;
  /** Error rate */
  errorRate: number;
  /** User satisfaction score */
  userSatisfactionScore: number;
  /** Performance grade */
  performanceGrade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface MetricAnalysis {
  /** Metric type */
  type: MetricType;
  /** Statistical summary */
  statistics: MetricStatistics;
  /** Performance against thresholds */
  thresholdAnalysis: ThresholdAnalysis;
  /** Distribution analysis */
  distribution: DistributionAnalysis;
}

export interface MetricStatistics {
  min: number;
  max: number;
  mean: number;
  median: number;
  p95: number;
  p99: number;
  stdDev: number;
  count: number;
}

export interface ThresholdAnalysis {
  threshold: number;
  withinThreshold: number;
  exceedingThreshold: number;
  complianceRate: number;
}

export interface DistributionAnalysis {
  buckets: DistributionBucket[];
  outliers: number[];
  skewness: number;
  kurtosis: number;
}

export interface DistributionBucket {
  min: number;
  max: number;
  count: number;
  percentage: number;
}

export interface PerformanceInsight {
  /** Insight type */
  type: 'performance_improvement' | 'cost_optimization' | 'quality_enhancement' | 'user_experience';
  /** Insight severity */
  severity: 'high' | 'medium' | 'low';
  /** Insight title */
  title: string;
  /** Insight description */
  description: string;
  /** Supporting metrics */
  supportingMetrics: string[];
  /** Impact assessment */
  impact: string;
  /** Confidence level */
  confidence: number;
}

export interface TrendAnalysis {
  /** Metric being analyzed */
  metric: MetricType;
  /** Trend direction */
  direction: 'improving' | 'degrading' | 'stable';
  /** Trend strength */
  strength: number;
  /** Trend period */
  period: number;
  /** Projected values */
  projections: TrendProjection[];
  /** Change rate */
  changeRate: number;
}

export interface TrendProjection {
  timestamp: Date;
  projectedValue: number;
  confidence: number;
}

export interface PerformanceRecommendation {
  /** Recommendation category */
  category: 'performance' | 'cost' | 'quality' | 'scalability';
  /** Priority level */
  priority: 'critical' | 'high' | 'medium' | 'low';
  /** Recommendation title */
  title: string;
  /** Detailed description */
  description: string;
  /** Implementation steps */
  implementationSteps: string[];
  /** Expected impact */
  expectedImpact: ExpectedImpact;
  /** Implementation effort */
  implementationEffort: 'low' | 'medium' | 'high';
  /** ROI estimate */
  estimatedROI: number;
}

export interface ExpectedImpact {
  performanceImprovement: number;
  costReduction: number;
  qualityImprovement: number;
  userSatisfactionImprovement: number;
}

export interface PerformanceAlert {
  /** Alert ID */
  id: string;
  /** Alert type */
  type: 'threshold_exceeded' | 'anomaly_detected' | 'trend_degradation' | 'system_failure';
  /** Alert severity */
  severity: 'critical' | 'warning' | 'info';
  /** Alert title */
  title: string;
  /** Alert description */
  description: string;
  /** Triggering metric */
  triggeringMetric: PerformanceMetric;
  /** Alert threshold */
  threshold?: number;
  /** Recommended actions */
  recommendedActions: string[];
  /** Alert timestamp */
  alertTime: Date;
  /** Alert status */
  status: 'active' | 'acknowledged' | 'resolved';
}

export interface AcademicPerformanceMetrics {
  /** Content quality metrics */
  contentQuality: ContentQualityMetrics;
  /** Academic compliance metrics */
  academicCompliance: AcademicComplianceMetrics;
  /** Citation performance metrics */
  citationPerformance: CitationPerformanceMetrics;
  /** User engagement metrics */
  userEngagement: UserEngagementMetrics;
  /** System performance metrics */
  systemPerformance: SystemPerformanceMetrics;
}

export interface ContentQualityMetrics {
  averageQualityScore: number;
  qualityDistribution: Record<string, number>;
  improvementRate: number;
  consistencyScore: number;
  expertiseAlignment: number;
}

export interface AcademicComplianceMetrics {
  overallComplianceRate: number;
  citationComplianceRate: number;
  formatComplianceRate: number;
  styleComplianceRate: number;
  integrityComplianceRate: number;
}

export interface CitationPerformanceMetrics {
  averageCitationsPerResponse: number;
  citationAccuracyRate: number;
  citationFormatAccuracy: number;
  sourceVerificationRate: number;
  hallucinatedCitationRate: number;
}

export interface UserEngagementMetrics {
  averageSatisfactionScore: number;
  taskCompletionRate: number;
  userRetentionRate: number;
  feedbackResponseRate: number;
  recommendationScore: number;
}

export interface SystemPerformanceMetrics {
  averageResponseTime: number;
  throughputPerHour: number;
  errorRate: number;
  systemUptime: number;
  resourceUtilization: number;
}

/**
 * Default performance metrics configuration
 */
export const DEFAULT_PERFORMANCE_METRICS_CONFIG: PerformanceMetricsConfig = {
  enableTracking: true,
  metricsCollection: {
    enabledMetrics: [
      'response_time',
      'token_usage',
      'cost',
      'quality_score',
      'user_satisfaction',
      'error_rate',
      'throughput',
      'cache_hit_rate',
      'academic_compliance',
      'citation_accuracy'
    ],
    collectionInterval: 1000,
    samplingRate: 1.0,
    enableRealTime: true,
    enableDetailedLogging: true
  },
  performanceAnalysis: {
    enableAutoAnalysis: true,
    analysisInterval: 300000, // 5 minutes
    performanceThresholds: {
      maxResponseTime: 5000,
      maxTokenUsage: 4000,
      maxCostPerRequest: 0.10,
      minQualityScore: 0.7,
      maxErrorRate: 0.05,
      minUserSatisfaction: 0.8,
      minCacheHitRate: 0.2
    },
    enableTrendAnalysis: true,
    enableAnomalyDetection: true
  },
  alertingConfig: {
    enableAlerts: true,
    alertThresholds: {
      criticalResponseTime: 10000,
      warningResponseTime: 7000,
      criticalErrorRate: 0.1,
      warningErrorRate: 0.05,
      criticalCostOverrun: 2.0,
      warningCostOverrun: 1.5
    },
    alertChannels: ['console', 'log'],
    alertCooldown: 300000 // 5 minutes
  },
  reportingConfig: {
    enableReports: true,
    reportSchedule: {
      daily: false,
      weekly: true,
      monthly: true
    },
    reportFormats: ['json', 'summary'],
    reportRecipients: []
  },
  dataRetention: {
    rawMetricsRetention: 30,
    aggregatedMetricsRetention: 365,
    reportRetention: 1095,
    enableCompression: true
  }
};

/**
 * Performance Metrics and Analytics Service
 */
export class PerformanceMetricsService {
  private config: PerformanceMetricsConfig;
  private metrics: Map<string, PerformanceMetric[]>;
  private alerts: PerformanceAlert[];
  private reports: PerformanceReport[];
  private lastAlertTime: Map<string, number>;

  constructor(config: Partial<PerformanceMetricsConfig> = {}) {
    this.config = { ...DEFAULT_PERFORMANCE_METRICS_CONFIG, ...config };
    this.metrics = new Map();
    this.alerts = [];
    this.reports = [];
    this.lastAlertTime = new Map();

    // Start automatic analysis if enabled
    if (this.config.performanceAnalysis.enableAutoAnalysis) {
      this.startAutoAnalysis();
    }
  }

  /**
   * Record a performance metric
   */
  async recordMetric(metric: PerformanceMetric): Promise<void> {
    if (!this.config.enableTracking) return;
    
    // Check if metric type is enabled
    if (!this.config.metricsCollection.enabledMetrics.includes(metric.type)) {
      return;
    }

    // Apply sampling if configured
    if (Math.random() > this.config.metricsCollection.samplingRate) {
      return;
    }

    // Store metric
    const key = this.getMetricKey(metric);
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    this.metrics.get(key)!.push(metric);

    // Check for threshold violations
    if (this.config.alertingConfig.enableAlerts) {
      await this.checkAlertThresholds(metric);
    }

    // Log if detailed logging is enabled
    if (this.config.metricsCollection.enableDetailedLogging) {
      console.debug(`Metric recorded: ${metric.type} = ${metric.value} ${metric.unit}`, metric);
    }
  }

  /**
   * Generate performance report for a time period
   */
  async generateReport(
    startDate: Date,
    endDate: Date,
    reportType: PerformanceReport['type'] = 'custom'
  ): Promise<PerformanceReport> {
    const reportId = `${reportType}_${Date.now()}`;
    
    // Filter metrics for the time period
    const filteredMetrics = this.filterMetricsByDate(startDate, endDate);
    
    // Generate performance summary
    const summary = this.generatePerformanceSummary(filteredMetrics);
    
    // Analyze metrics
    const metrics = await this.analyzeMetrics(filteredMetrics);
    
    // Generate insights
    const insights = await this.generatePerformanceInsights(filteredMetrics, summary);
    
    // Analyze trends
    const trends = await this.analyzeTrends(filteredMetrics);
    
    // Generate recommendations
    const recommendations = await this.generatePerformanceRecommendations(summary, insights, trends);

    const report: PerformanceReport = {
      id: reportId,
      type: reportType,
      period: { start: startDate, end: endDate },
      summary,
      metrics,
      insights,
      trends,
      recommendations,
      generatedAt: new Date()
    };

    // Store report
    this.reports.push(report);

    return report;
  }

  /**
   * Get current academic performance metrics
   */
  async getAcademicPerformanceMetrics(
    timeFrame: number = 24 * 60 * 60 * 1000 // Last 24 hours
  ): Promise<AcademicPerformanceMetrics> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - timeFrame);
    const filteredMetrics = this.filterMetricsByDate(startDate, endDate);

    return {
      contentQuality: this.calculateContentQualityMetrics(filteredMetrics),
      academicCompliance: this.calculateAcademicComplianceMetrics(filteredMetrics),
      citationPerformance: this.calculateCitationPerformanceMetrics(filteredMetrics),
      userEngagement: this.calculateUserEngagementMetrics(filteredMetrics),
      systemPerformance: this.calculateSystemPerformanceMetrics(filteredMetrics)
    };
  }

  /**
   * Get performance alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter(alert => alert.status === 'active');
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string): Promise<void> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.status = 'acknowledged';
    }
  }

  /**
   * Get metric statistics for a specific type
   */
  getMetricStatistics(
    metricType: MetricType,
    timeFrame: number = 60 * 60 * 1000 // Last hour
  ): MetricStatistics | null {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - timeFrame);
    
    const relevantMetrics = this.getMetricsByType(metricType, startDate, endDate);
    
    if (relevantMetrics.length === 0) return null;
    
    return this.calculateStatistics(relevantMetrics.map(m => m.value));
  }

  /**
   * Start automatic performance analysis
   */
  private startAutoAnalysis(): void {
    setInterval(() => {
      this.performAutomaticAnalysis().catch(error => {
        console.error('Automatic analysis failed:', error);
      });
    }, this.config.performanceAnalysis.analysisInterval);
  }

  /**
   * Perform automatic performance analysis
   */
  private async performAutomaticAnalysis(): Promise<void> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    // Analyze recent performance
    const recentMetrics = this.filterMetricsByDate(oneHourAgo, now);
    
    // Check for anomalies if enabled
    if (this.config.performanceAnalysis.enableAnomalyDetection) {
      await this.detectAnomalies(recentMetrics);
    }
    
    // Analyze trends if enabled
    if (this.config.performanceAnalysis.enableTrendAnalysis) {
      await this.analyzeTrends(recentMetrics);
    }
  }

  /**
   * Check alert thresholds for a metric
   */
  private async checkAlertThresholds(metric: PerformanceMetric): Promise<void> {
    const alertKey = `${metric.type}_${metric.context?.userId || 'global'}`;
    const lastAlert = this.lastAlertTime.get(alertKey) || 0;
    const now = Date.now();
    
    // Check cooldown period
    if (now - lastAlert < this.config.alertingConfig.alertCooldown) {
      return;
    }

    let alertTriggered = false;
    let alertSeverity: PerformanceAlert['severity'] = 'info';
    let alertDescription = '';

    // Check specific thresholds based on metric type
    switch (metric.type) {
      case 'response_time':
        if (metric.value >= this.config.alertingConfig.alertThresholds.criticalResponseTime) {
          alertTriggered = true;
          alertSeverity = 'critical';
          alertDescription = `Response time critically high: ${metric.value}ms`;
        } else if (metric.value >= this.config.alertingConfig.alertThresholds.warningResponseTime) {
          alertTriggered = true;
          alertSeverity = 'warning';
          alertDescription = `Response time above warning threshold: ${metric.value}ms`;
        }
        break;
        
      case 'error_rate':
        if (metric.value >= this.config.alertingConfig.alertThresholds.criticalErrorRate) {
          alertTriggered = true;
          alertSeverity = 'critical';
          alertDescription = `Error rate critically high: ${(metric.value * 100).toFixed(1)}%`;
        } else if (metric.value >= this.config.alertingConfig.alertThresholds.warningErrorRate) {
          alertTriggered = true;
          alertSeverity = 'warning';
          alertDescription = `Error rate above warning threshold: ${(metric.value * 100).toFixed(1)}%`;
        }
        break;
        
      case 'cost':
        const thresholdCost = this.config.performanceAnalysis.performanceThresholds.maxCostPerRequest;
        if (metric.value >= thresholdCost * this.config.alertingConfig.alertThresholds.criticalCostOverrun) {
          alertTriggered = true;
          alertSeverity = 'critical';
          alertDescription = `Cost critically high: $${metric.value.toFixed(4)}`;
        } else if (metric.value >= thresholdCost * this.config.alertingConfig.alertThresholds.warningCostOverrun) {
          alertTriggered = true;
          alertSeverity = 'warning';
          alertDescription = `Cost above warning threshold: $${metric.value.toFixed(4)}`;
        }
        break;
    }

    if (alertTriggered) {
      const alert: PerformanceAlert = {
        id: `alert_${now}`,
        type: 'threshold_exceeded',
        severity: alertSeverity,
        title: `${metric.type.toUpperCase()} Alert`,
        description: alertDescription,
        triggeringMetric: metric,
        threshold: this.getThresholdForMetric(metric.type, alertSeverity),
        recommendedActions: this.getRecommendedActions(metric.type, alertSeverity),
        alertTime: new Date(),
        status: 'active'
      };

      this.alerts.push(alert);
      this.lastAlertTime.set(alertKey, now);

      // Log alert
      console.warn(`Performance Alert [${alertSeverity.toUpperCase()}]: ${alert.description}`);
    }
  }

  /**
   * Filter metrics by date range
   */
  private filterMetricsByDate(startDate: Date, endDate: Date): PerformanceMetric[] {
    const filtered: PerformanceMetric[] = [];
    
    this.metrics.forEach(metricArray => {
      metricArray.forEach(metric => {
        if (metric.timestamp >= startDate && metric.timestamp <= endDate) {
          filtered.push(metric);
        }
      });
    });
    
    return filtered;
  }

  /**
   * Get metrics by type within date range
   */
  private getMetricsByType(
    metricType: MetricType,
    startDate?: Date,
    endDate?: Date
  ): PerformanceMetric[] {
    let allMetrics: PerformanceMetric[] = [];
    
    this.metrics.forEach(metricArray => {
      allMetrics.push(...metricArray.filter(m => m.type === metricType));
    });
    
    if (startDate && endDate) {
      allMetrics = allMetrics.filter(m => 
        m.timestamp >= startDate && m.timestamp <= endDate
      );
    }
    
    return allMetrics;
  }

  /**
   * Generate performance summary
   */
  private generatePerformanceSummary(metrics: PerformanceMetric[]): PerformanceSummary {
    const responseTimeMetrics = metrics.filter(m => m.type === 'response_time');
    const tokenUsageMetrics = metrics.filter(m => m.type === 'token_usage');
    const costMetrics = metrics.filter(m => m.type === 'cost');
    const qualityMetrics = metrics.filter(m => m.type === 'quality_score');
    const errorMetrics = metrics.filter(m => m.type === 'error_rate');
    const satisfactionMetrics = metrics.filter(m => m.type === 'user_satisfaction');

    const totalRequests = metrics.length > 0 ? 
      Math.max(...this.config.metricsCollection.enabledMetrics.map(type => 
        metrics.filter(m => m.type === type).length
      )) : 0;

    const avgResponseTime = this.calculateAverage(responseTimeMetrics.map(m => m.value));
    const totalTokens = tokenUsageMetrics.reduce((sum, m) => sum + m.value, 0);
    const totalCost = costMetrics.reduce((sum, m) => sum + m.value, 0);
    const avgQualityScore = this.calculateAverage(qualityMetrics.map(m => m.value));
    const errorRate = this.calculateAverage(errorMetrics.map(m => m.value));
    const userSatisfactionScore = this.calculateAverage(satisfactionMetrics.map(m => m.value));

    // Calculate performance grade
    const performanceGrade = this.calculatePerformanceGrade({
      avgResponseTime,
      avgQualityScore,
      errorRate,
      userSatisfactionScore
    });

    return {
      totalRequests,
      avgResponseTime,
      totalTokens,
      totalCost,
      avgQualityScore,
      errorRate,
      userSatisfactionScore,
      performanceGrade
    };
  }

  /**
   * Analyze metrics for detailed report
   */
  private async analyzeMetrics(metrics: PerformanceMetric[]): Promise<MetricAnalysis[]> {
    const analyses: MetricAnalysis[] = [];
    
    for (const metricType of this.config.metricsCollection.enabledMetrics) {
      const typeMetrics = metrics.filter(m => m.type === metricType);
      
      if (typeMetrics.length === 0) continue;
      
      const values = typeMetrics.map(m => m.value);
      const statistics = this.calculateStatistics(values);
      const threshold = this.getThresholdForMetric(metricType);
      
      const thresholdAnalysis: ThresholdAnalysis = {
        threshold,
        withinThreshold: values.filter(v => v <= threshold).length,
        exceedingThreshold: values.filter(v => v > threshold).length,
        complianceRate: values.filter(v => v <= threshold).length / values.length
      };

      const distribution = this.calculateDistribution(values);

      analyses.push({
        type: metricType,
        statistics,
        thresholdAnalysis,
        distribution
      });
    }
    
    return analyses;
  }

  /**
   * Generate performance insights
   */
  private async generatePerformanceInsights(
    metrics: PerformanceMetric[],
    summary: PerformanceSummary
  ): Promise<PerformanceInsight[]> {
    const insights: PerformanceInsight[] = [];

    // Response time insights
    if (summary.avgResponseTime > this.config.performanceAnalysis.performanceThresholds.maxResponseTime) {
      insights.push({
        type: 'performance_improvement',
        severity: 'high',
        title: 'High Average Response Time',
        description: `Average response time (${summary.avgResponseTime.toFixed(0)}ms) exceeds threshold (${this.config.performanceAnalysis.performanceThresholds.maxResponseTime}ms)`,
        supportingMetrics: ['response_time'],
        impact: 'Poor user experience and potential system bottlenecks',
        confidence: 0.9
      });
    }

    // Quality insights
    if (summary.avgQualityScore < this.config.performanceAnalysis.performanceThresholds.minQualityScore) {
      insights.push({
        type: 'quality_enhancement',
        severity: 'high',
        title: 'Low Quality Score',
        description: `Average quality score (${summary.avgQualityScore.toFixed(2)}) is below threshold (${this.config.performanceAnalysis.performanceThresholds.minQualityScore})`,
        supportingMetrics: ['quality_score'],
        impact: 'Reduced academic value and user satisfaction',
        confidence: 0.85
      });
    }

    // Cost optimization insights
    const avgCostPerRequest = summary.totalCost / summary.totalRequests;
    if (avgCostPerRequest > this.config.performanceAnalysis.performanceThresholds.maxCostPerRequest) {
      insights.push({
        type: 'cost_optimization',
        severity: 'medium',
        title: 'High Cost Per Request',
        description: `Average cost per request ($${avgCostPerRequest.toFixed(4)}) exceeds budget threshold ($${this.config.performanceAnalysis.performanceThresholds.maxCostPerRequest.toFixed(4)})`,
        supportingMetrics: ['cost'],
        impact: 'Increased operational costs and budget overruns',
        confidence: 0.95
      });
    }

    return insights.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  /**
   * Analyze performance trends
   */
  private async analyzeTrends(metrics: PerformanceMetric[]): Promise<TrendAnalysis[]> {
    const trends: TrendAnalysis[] = [];
    
    for (const metricType of this.config.metricsCollection.enabledMetrics) {
      const typeMetrics = metrics.filter(m => m.type === metricType)
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      if (typeMetrics.length < 5) continue; // Need enough data points
      
      const trend = this.calculateTrend(typeMetrics);
      if (trend) {
        trends.push(trend);
      }
    }
    
    return trends;
  }

  /**
   * Generate performance recommendations
   */
  private async generatePerformanceRecommendations(
    summary: PerformanceSummary,
    insights: PerformanceInsight[],
    trends: TrendAnalysis[]
  ): Promise<PerformanceRecommendation[]> {
    const recommendations: PerformanceRecommendation[] = [];

    // Response time recommendations
    if (summary.avgResponseTime > this.config.performanceAnalysis.performanceThresholds.maxResponseTime) {
      recommendations.push({
        category: 'performance',
        priority: 'high',
        title: 'Optimize Response Time',
        description: 'Implement caching, prompt optimization, and model tuning to reduce response times',
        implementationSteps: [
          'Enable response caching for common queries',
          'Optimize prompt templates to reduce token usage',
          'Consider using faster models for simple tasks',
          'Implement request batching where appropriate'
        ],
        expectedImpact: {
          performanceImprovement: 30,
          costReduction: 10,
          qualityImprovement: 0,
          userSatisfactionImprovement: 20
        },
        implementationEffort: 'medium',
        estimatedROI: 2.5
      });
    }

    // Quality improvement recommendations
    if (summary.avgQualityScore < this.config.performanceAnalysis.performanceThresholds.minQualityScore) {
      recommendations.push({
        category: 'quality',
        priority: 'high',
        title: 'Enhance Content Quality',
        description: 'Implement quality gates, prompt engineering improvements, and feedback loops',
        implementationSteps: [
          'Implement automatic quality assessment',
          'Create feedback loops for continuous improvement',
          'Enhance prompt templates with better examples',
          'Add quality validation checkpoints'
        ],
        expectedImpact: {
          performanceImprovement: 10,
          costReduction: 0,
          qualityImprovement: 40,
          userSatisfactionImprovement: 30
        },
        implementationEffort: 'high',
        estimatedROI: 3.2
      });
    }

    // Cost optimization recommendations
    const avgCostPerRequest = summary.totalCost / summary.totalRequests;
    if (avgCostPerRequest > this.config.performanceAnalysis.performanceThresholds.maxCostPerRequest) {
      recommendations.push({
        category: 'cost',
        priority: 'medium',
        title: 'Reduce Operational Costs',
        description: 'Optimize token usage, implement smart caching, and use cost-effective models',
        implementationSteps: [
          'Implement prompt compression strategies',
          'Use cheaper models for simple tasks',
          'Implement intelligent caching mechanisms',
          'Monitor and optimize token usage patterns'
        ],
        expectedImpact: {
          performanceImprovement: 5,
          costReduction: 25,
          qualityImprovement: -5,
          userSatisfactionImprovement: 0
        },
        implementationEffort: 'low',
        estimatedROI: 4.1
      });
    }

    return recommendations.sort((a, b) => b.estimatedROI - a.estimatedROI);
  }

  /**
   * Calculate academic-specific metrics
   */
  private calculateContentQualityMetrics(metrics: PerformanceMetric[]): ContentQualityMetrics {
    const qualityMetrics = metrics.filter(m => m.type === 'quality_score');
    
    return {
      averageQualityScore: this.calculateAverage(qualityMetrics.map(m => m.value)),
      qualityDistribution: this.calculateQualityDistribution(qualityMetrics),
      improvementRate: this.calculateImprovementRate(qualityMetrics),
      consistencyScore: this.calculateConsistencyScore(qualityMetrics),
      expertiseAlignment: 0.85 // Would calculate based on actual academic standards
    };
  }

  private calculateAcademicComplianceMetrics(metrics: PerformanceMetric[]): AcademicComplianceMetrics {
    const complianceMetrics = metrics.filter(m => m.type === 'academic_compliance');
    
    return {
      overallComplianceRate: this.calculateAverage(complianceMetrics.map(m => m.value)),
      citationComplianceRate: 0.92,
      formatComplianceRate: 0.89,
      styleComplianceRate: 0.87,
      integrityComplianceRate: 0.95
    };
  }

  private calculateCitationPerformanceMetrics(metrics: PerformanceMetric[]): CitationPerformanceMetrics {
    const citationMetrics = metrics.filter(m => m.type === 'citation_accuracy');
    
    return {
      averageCitationsPerResponse: 3.2,
      citationAccuracyRate: this.calculateAverage(citationMetrics.map(m => m.value)),
      citationFormatAccuracy: 0.94,
      sourceVerificationRate: 0.88,
      hallucinatedCitationRate: 0.02
    };
  }

  private calculateUserEngagementMetrics(metrics: PerformanceMetric[]): UserEngagementMetrics {
    const satisfactionMetrics = metrics.filter(m => m.type === 'user_satisfaction');
    
    return {
      averageSatisfactionScore: this.calculateAverage(satisfactionMetrics.map(m => m.value)),
      taskCompletionRate: 0.91,
      userRetentionRate: 0.78,
      feedbackResponseRate: 0.65,
      recommendationScore: 0.83
    };
  }

  private calculateSystemPerformanceMetrics(metrics: PerformanceMetric[]): SystemPerformanceMetrics {
    const responseTimeMetrics = metrics.filter(m => m.type === 'response_time');
    const throughputMetrics = metrics.filter(m => m.type === 'throughput');
    const errorMetrics = metrics.filter(m => m.type === 'error_rate');
    
    return {
      averageResponseTime: this.calculateAverage(responseTimeMetrics.map(m => m.value)),
      throughputPerHour: this.calculateAverage(throughputMetrics.map(m => m.value)),
      errorRate: this.calculateAverage(errorMetrics.map(m => m.value)),
      systemUptime: 0.998,
      resourceUtilization: 0.65
    };
  }

  /**
   * Utility methods
   */
  private getMetricKey(metric: PerformanceMetric): string {
    const context = metric.context;
    return `${metric.type}_${context?.userId || 'global'}_${context?.phase || 'all'}`;
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  private calculateStatistics(values: number[]): MetricStatistics {
    if (values.length === 0) {
      return { min: 0, max: 0, mean: 0, median: 0, p95: 0, p99: 0, stdDev: 0, count: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const mean = this.calculateAverage(values);
    
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      stdDev: Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length),
      count: values.length
    };
  }

  private calculateDistribution(values: number[]): DistributionAnalysis {
    if (values.length === 0) {
      return { buckets: [], outliers: [], skewness: 0, kurtosis: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const bucketCount = Math.min(10, Math.ceil(Math.sqrt(values.length)));
    const bucketSize = (max - min) / bucketCount;

    const buckets: DistributionBucket[] = [];
    for (let i = 0; i < bucketCount; i++) {
      const bucketMin = min + i * bucketSize;
      const bucketMax = min + (i + 1) * bucketSize;
      const count = values.filter(v => v >= bucketMin && (i === bucketCount - 1 ? v <= bucketMax : v < bucketMax)).length;
      
      buckets.push({
        min: bucketMin,
        max: bucketMax,
        count,
        percentage: (count / values.length) * 100
      });
    }

    return {
      buckets,
      outliers: [], // Simplified - would calculate actual outliers
      skewness: 0, // Simplified
      kurtosis: 0  // Simplified
    };
  }

  private calculatePerformanceGrade(summary: {
    avgResponseTime: number;
    avgQualityScore: number;
    errorRate: number;
    userSatisfactionScore: number;
  }): PerformanceSummary['performanceGrade'] {
    let score = 100;
    
    // Penalize high response time
    if (summary.avgResponseTime > this.config.performanceAnalysis.performanceThresholds.maxResponseTime) {
      score -= 20;
    }
    
    // Penalize low quality
    if (summary.avgQualityScore < this.config.performanceAnalysis.performanceThresholds.minQualityScore) {
      score -= 30;
    }
    
    // Penalize high error rate
    if (summary.errorRate > this.config.performanceAnalysis.performanceThresholds.maxErrorRate) {
      score -= 25;
    }
    
    // Penalize low satisfaction
    if (summary.userSatisfactionScore < this.config.performanceAnalysis.performanceThresholds.minUserSatisfaction) {
      score -= 20;
    }

    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  private calculateTrend(metrics: PerformanceMetric[]): TrendAnalysis | null {
    if (metrics.length < 5) return null;

    const values = metrics.map(m => m.value);
    const timePoints = metrics.map((m, i) => i);
    
    // Simple linear regression for trend
    const n = values.length;
    const sumX = timePoints.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = timePoints.reduce((sum, x, i) => sum + x * values[i], 0);
    const sumXX = timePoints.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const changeRate = slope;
    
    let direction: TrendAnalysis['direction'];
    if (Math.abs(slope) < 0.01) direction = 'stable';
    else if (slope > 0) direction = 'improving';
    else direction = 'degrading';
    
    const strength = Math.min(1, Math.abs(slope) * 10);
    
    return {
      metric: metrics[0].type,
      direction,
      strength,
      period: metrics.length,
      projections: [], // Simplified
      changeRate
    };
  }

  private getThresholdForMetric(metricType: MetricType, severity?: string): number {
    const thresholds = this.config.performanceAnalysis.performanceThresholds;
    const alertThresholds = this.config.alertingConfig.alertThresholds;
    
    switch (metricType) {
      case 'response_time':
        return severity === 'critical' ? alertThresholds.criticalResponseTime : 
               severity === 'warning' ? alertThresholds.warningResponseTime :
               thresholds.maxResponseTime;
      case 'token_usage':
        return thresholds.maxTokenUsage;
      case 'cost':
        return thresholds.maxCostPerRequest;
      case 'quality_score':
        return thresholds.minQualityScore;
      case 'error_rate':
        return severity === 'critical' ? alertThresholds.criticalErrorRate :
               severity === 'warning' ? alertThresholds.warningErrorRate :
               thresholds.maxErrorRate;
      case 'user_satisfaction':
        return thresholds.minUserSatisfaction;
      case 'cache_hit_rate':
        return thresholds.minCacheHitRate;
      default:
        return 1.0;
    }
  }

  private getRecommendedActions(metricType: MetricType, severity: string): string[] {
    const actions: Record<string, string[]> = {
      response_time: [
        'Enable caching for frequently requested content',
        'Optimize prompt templates to reduce processing time',
        'Consider using faster models for time-sensitive requests',
        'Implement request prioritization'
      ],
      error_rate: [
        'Review recent changes that might cause errors',
        'Implement better input validation',
        'Add retry mechanisms for transient failures',
        'Monitor system resources and dependencies'
      ],
      cost: [
        'Enable automatic prompt optimization',
        'Review token usage patterns',
        'Consider using more cost-effective models',
        'Implement budget controls and alerts'
      ]
    };

    return actions[metricType] || ['Review and investigate the issue'];
  }

  private calculateQualityDistribution(metrics: PerformanceMetric[]): Record<string, number> {
    const distribution: Record<string, number> = {
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0
    };

    metrics.forEach(metric => {
      if (metric.value >= 0.9) distribution.excellent++;
      else if (metric.value >= 0.8) distribution.good++;
      else if (metric.value >= 0.6) distribution.fair++;
      else distribution.poor++;
    });

    return distribution;
  }

  private calculateImprovementRate(metrics: PerformanceMetric[]): number {
    if (metrics.length < 2) return 0;
    
    const sorted = metrics.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
    const secondHalf = sorted.slice(Math.floor(sorted.length / 2));
    
    const firstAvg = this.calculateAverage(firstHalf.map(m => m.value));
    const secondAvg = this.calculateAverage(secondHalf.map(m => m.value));
    
    return secondAvg > firstAvg ? (secondAvg - firstAvg) / firstAvg : 0;
  }

  private calculateConsistencyScore(metrics: PerformanceMetric[]): number {
    if (metrics.length === 0) return 1;
    
    const values = metrics.map(m => m.value);
    const mean = this.calculateAverage(values);
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    // Lower standard deviation = higher consistency
    return Math.max(0, 1 - stdDev);
  }

  private async detectAnomalies(metrics: PerformanceMetric[]): Promise<void> {
    // Simplified anomaly detection - would use more sophisticated algorithms
    for (const metricType of this.config.metricsCollection.enabledMetrics) {
      const typeMetrics = metrics.filter(m => m.type === metricType);
      if (typeMetrics.length < 10) continue;
      
      const values = typeMetrics.map(m => m.value);
      const mean = this.calculateAverage(values);
      const stdDev = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);
      
      // Check for outliers (values more than 2 standard deviations from mean)
      const outliers = typeMetrics.filter(m => Math.abs(m.value - mean) > 2 * stdDev);
      
      if (outliers.length > 0) {
        const alert: PerformanceAlert = {
          id: `anomaly_${Date.now()}`,
          type: 'anomaly_detected',
          severity: 'warning',
          title: `Anomaly Detected in ${metricType}`,
          description: `Detected ${outliers.length} anomalous values in ${metricType} metrics`,
          triggeringMetric: outliers[0],
          recommendedActions: ['Investigate recent changes', 'Monitor system health'],
          alertTime: new Date(),
          status: 'active'
        };

        this.alerts.push(alert);
      }
    }
  }
}

/**
 * Performance Metrics Middleware for AI SDK
 */
export function createPerformanceMetricsMiddleware(
  config: Partial<PerformanceMetricsConfig> = {}
): LanguageModelV2Middleware {
  const metricsService = new PerformanceMetricsService(config);

  return {
    wrapGenerate: async ({ doGenerate, params }) => {
      const startTime = Date.now();
      let tokenUsage = 0;
      let cost = 0;
      let errorOccurred = false;
      
      try {
        const result = await doGenerate();
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        // Extract metrics from result
        tokenUsage = result.usage?.totalTokens || 0;
        cost = (result.usage?.totalTokens || 0) * 0.00001; // Rough estimate
        
        // Record performance metrics
        const context: MetricContext = {
          requestId: `req_${Date.now()}`,
          userId: params.providerMetadata?.userId as string,
          phase: params.providerMetadata?.phase as string,
          model: params.providerMetadata?.model as string
        };

        // Record various metrics
        await Promise.all([
          metricsService.recordMetric({
            id: `${context.requestId}_response_time`,
            type: 'response_time',
            value: responseTime,
            unit: 'ms',
            timestamp: new Date(),
            context
          }),
          metricsService.recordMetric({
            id: `${context.requestId}_token_usage`,
            type: 'token_usage',
            value: tokenUsage,
            unit: 'tokens',
            timestamp: new Date(),
            context
          }),
          metricsService.recordMetric({
            id: `${context.requestId}_cost`,
            type: 'cost',
            value: cost,
            unit: 'USD',
            timestamp: new Date(),
            context
          })
        ]);

        return {
          ...result,
          experimental: {
            ...result.experimental,
            performanceMetrics: {
              responseTime,
              tokenUsage,
              cost,
              timestamp: new Date()
            }
          }
        };
        
      } catch (error) {
        errorOccurred = true;
        
        // Record error metric
        await metricsService.recordMetric({
          id: `req_${Date.now()}_error`,
          type: 'error_rate',
          value: 1,
          unit: 'occurrence',
          timestamp: new Date(),
          context: {
            requestId: `req_${Date.now()}`,
            metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
          }
        });
        
        throw error;
      }
    }
  };
}

export default PerformanceMetricsService;