/**
 * Session Health Monitoring System
 *
 * Implements comprehensive session health checks, performance metrics,
 * anomaly detection, and proactive session healing
 *
 * FOLLOW: global_policy.xml principles
 * - Simple, maintainable solutions
 * - Production-ready error handling
 * - No over-engineering
 */

import { debugLog } from '../utils/debug-log';
import { supabaseClient } from '../database/supabase-client';

// Health score thresholds
export const HEALTH_THRESHOLDS = {
  CRITICAL: 0.2,      // Below 20% health = critical
  WARNING: 0.5,       // Below 50% health = warning
  HEALTHY: 0.8        // Above 80% health = healthy
};

// Session health metrics
export interface SessionHealthMetrics {
  sessionAge: number;           // Age of session in seconds
  tokenValidity: boolean;       // JWT token still valid
  refreshSuccess: number;       // Last refresh success rate (0-1)
  authState: 'valid' | 'expired' | 'refreshing' | 'error';
  networkLatency: number;      // Last network request latency in ms
  clientActivity: number;       // Time since last client activity in seconds
  errorRate: number;          // Error rate per minute
  healthScore: number;         // Overall health score (0-1)
}

// Session anomaly types
export interface SessionAnomaly {
  type: 'sudden_expiry' | 'refresh_loop' | 'state_inconsistency' | 'performance_degradation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  context?: Record<string, unknown>;
}

// Health monitoring configuration
interface HealthCheckConfig {
  enableProactiveHealing: boolean;
  maxRetryAttempts: number;
  healthCheckInterval: number;
  anomalyThreshold: {
    maxSessionAge: number;      // seconds
    minRefreshSuccess: number;   // rate
    maxErrorRate: number;        // errors per minute
    maxNetworkLatency: number;   // ms
  };
}

// Constants for health calculations
const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
const DEFAULT_MAX_SESSION_AGE = 3600; // 1 hour
const DEFAULT_MIN_REFRESH_SUCCESS = 0.7; // 70% success rate
const DEFAULT_MAX_ERROR_RATE = 2; // 2 errors per minute
const DEFAULT_MAX_NETWORK_LATENCY = 2000; // 2 seconds

// Session age thresholds
const RECENT_SESSION_THRESHOLD = 10; // seconds
const MAX_CONCURRENT_SESSIONS = 3;
const HIGH_LATENCY_FALLBACK = 9999; // ms

// Health scoring factors
const THIRTY_MINUTES_IN_SECONDS = 1800;
const ONE_HOUR_IN_SECONDS = 3600;
const ONE_SECOND_IN_MS = 1000;
const TWO_SECONDS_IN_MS = 2000;

const DEFAULT_CONFIG: HealthCheckConfig = {
  enableProactiveHealing: true,
  maxRetryAttempts: DEFAULT_RETRY_ATTEMPTS,
  healthCheckInterval: DEFAULT_HEALTH_CHECK_INTERVAL,
  anomalyThreshold: {
    maxSessionAge: DEFAULT_MAX_SESSION_AGE,
    minRefreshSuccess: DEFAULT_MIN_REFRESH_SUCCESS,
    maxErrorRate: DEFAULT_MAX_ERROR_RATE,
    maxNetworkLatency: DEFAULT_MAX_NETWORK_LATENCY,
  }
};

/**
 * Session Health Monitor Class
 *
 * Provides comprehensive session health monitoring and proactive healing
 */
class SessionHealthMonitor {
  private config: HealthCheckConfig;
  private metrics: SessionHealthMetrics;
  private anomalies: SessionAnomaly[] = [];
  private healthCheckTimer?: NodeJS.Timeout;
  private retryCount: number = 0;

  constructor(config: Partial<HealthCheckConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.metrics = this.initializeMetrics();
  }

  /**
   * Initialize health metrics
   */
  private initializeMetrics(): SessionHealthMetrics {
    return {
      sessionAge: 0,
      tokenValidity: false,
      refreshSuccess: 1,
      authState: 'valid',
      networkLatency: 0,
      clientActivity: Date.now(),
      errorRate: 0,
      healthScore: HEALTH_THRESHOLDS.HEALTHY
    };
  }

  /**
   * Perform comprehensive session health check
   */
  async checkSessionHealth(sessionId?: string): Promise<{
    healthy: boolean;
    metrics: SessionHealthMetrics;
    issues: string[];
    anomalies: SessionAnomaly[];
  }> {
    const startTime = Date.now();

    try {
      debugLog('health:check', 'start', { sessionId });

      // Check session age and validity
      const ageCheck = await this.checkSessionAge(sessionId);
      const tokenCheck = await this.checkTokenValidity();
      const networkCheck = await this.checkNetworkHealth();

      // Combine all health factors
      this.metrics = {
        sessionAge: ageCheck.age,
        tokenValidity: tokenCheck.valid,
        refreshSuccess: this.calculateRefreshSuccess(),
        authState: this.determineAuthState(ageCheck, tokenCheck),
        networkLatency: networkCheck.latency,
        clientActivity: this.calculateClientActivity(),
        errorRate: this.calculateErrorRate(),
        healthScore: this.calculateHealthScore()
      };

      // Detect anomalies
      const anomalies = await this.detectAnomalies(this.metrics);
      this.anomalies = anomalies;

      // Generate health issues
      const issues = this.generateHealthIssues(this.metrics, anomalies);

      // Log results
      debugLog('health:check', 'complete', {
        healthy: this.metrics.healthScore >= HEALTH_THRESHOLDS.WARNING,
        healthScore: this.metrics.healthScore,
        metrics: this.metrics,
        issues: issues.length,
        anomalies: anomalies.length,
        duration: Date.now() - startTime
      });

  
      // Auto-heal if enabled
      if (this.config.enableProactiveHealing && issues.length > 0) {
        await this.performAutoHealing(issues);
      }

      return {
        healthy: this.metrics.healthScore >= HEALTH_THRESHOLDS.WARNING,
        metrics: this.metrics,
        issues,
        anomalies
      };

    } catch (error) {
      const errorDuration = Date.now() - startTime;
      debugLog('health:error', 'exception', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: errorDuration
      });

      return {
        healthy: false,
        metrics: this.metrics,
        issues: ['Health check failed'],
        anomalies: [],
      };
    }
  }

  /**
   * Check session age and detect potential issues
   */
  private async checkSessionAge(sessionId?: string): Promise<{ age: number; issues: string[] }> {
    if (!sessionId) {
      return { age: 0, issues: ['No session ID provided'] };
    }

    try {
      // Get session from Supabase to validate age
      const { data: { session }, error } = await supabaseClient.auth.getSession();

      if (error || !session) {
        return { age: 0, issues: ['Failed to get session for age check'] };
      }

      const sessionAge = Math.floor((Date.now() - (session.expires_at || 0) * 1000) / 1000);
      const issues: string[] = [];

      // Check for suspiciously old session
      if (sessionAge > this.config.anomalyThreshold.maxSessionAge) {
        issues.push(`Session too old: ${sessionAge}s`);
      }

      // Check for recently created session (potential race condition)
      if (sessionAge < RECENT_SESSION_THRESHOLD) {
        const recentSessions = await this.getRecentSessionCount();
        if (recentSessions > MAX_CONCURRENT_SESSIONS) {
          issues.push('Multiple concurrent sessions detected');
        }
      }

      return { age: sessionAge, issues };

    } catch (error) {
      return { age: 0, issues: ['Session age check failed'] };
    }
  }

  /**
   * Check JWT token validity
   */
  private async checkTokenValidity(): Promise<{ valid: boolean; issues: string[] }> {
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      const issues: string[] = [];

      if (!session || !session.access_token) {
        issues.push('No valid access token found');
        return { valid: false, issues };
      }

      // Basic JWT validation (expiration check)
      const tokenParts = session.access_token.split('.');
      if (tokenParts.length === 3) {
        try {
          const payload = JSON.parse(atob(tokenParts[1]));
          const now = Math.floor(Date.now() / 1000);

          if (payload.exp && payload.exp < now) {
            issues.push('Token has expired');
            return { valid: false, issues };
          }
        } catch {
          issues.push('Invalid JWT format');
        }
      } else {
        issues.push('Invalid JWT structure');
      }

      return { valid: issues.length === 0, issues };

    } catch (error) {
      return { valid: false, issues: ['Token validation failed'] };
    }
  }

  /**
   * Check network health and latency
   */
  private async checkNetworkHealth(): Promise<{ latency: number; issues: string[] }> {
    const startTime = Date.now();
    const issues: string[] = [];

    try {
      // Make a lightweight request to check connectivity
      await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache'
      });

      const latency = Date.now() - startTime;

      if (latency > this.config.anomalyThreshold.maxNetworkLatency) {
        issues.push(`High network latency: ${latency}ms`);
      }

      return { latency, issues };

    } catch (error) {
      issues.push('Network health check failed');
      return { latency: HIGH_LATENCY_FALLBACK, issues };
    }
  }

  /**
   * Get recent session count to detect race conditions
   */
  private async getRecentSessionCount(): Promise<number> {
    try {
      const recentEvents = await this.getRecentAuthEvents();
      return recentEvents.filter(event =>
        event.event === 'SIGNED_IN' ||
        event.event === 'TOKEN_REFRESHED'
      ).length;
    } catch {
      return 0;
    }
  }

  /**
   * Get recent authentication events
   */
  private async getRecentAuthEvents(): Promise<Array<{ event: string; timestamp: number }>> {
    // This would integrate with auth error monitoring system
    // For now, return simulated data
    return [
      { event: 'SIGNED_IN', timestamp: Date.now() - 300000 },
      { event: 'TOKEN_REFRESHED', timestamp: Date.now() - 120000 }
    ];
  }

  /**
   * Calculate session refresh success rate
   */
  private calculateRefreshSuccess(): number {
    // Implementation would track recent refresh attempts vs successes
    return 0.85; // Simulated 85% success rate for demo purposes
  }

  /**
   * Determine current authentication state
   */
  private determineAuthState(
    ageCheck: { age: number; issues: string[] },
    tokenCheck: { valid: boolean; issues: string[] }
  ): 'valid' | 'expired' | 'refreshing' | 'error' {
    if (!tokenCheck.valid || ageCheck.age > this.config.anomalyThreshold.maxSessionAge) {
      return 'expired';
    }
    if (ageCheck.age < RECENT_SESSION_THRESHOLD) {
      return 'refreshing';
    }
    if (tokenCheck.issues && tokenCheck.issues.length > 0) {
      return 'error';
    }
    return 'valid';
  }

  /**
   * Calculate client activity score
   */
  private calculateClientActivity(): number {
    // Time since last activity in seconds
    const lastActivity = this.metrics.clientActivity;
    const now = Date.now();
    return (now - lastActivity) / 1000;
  }

  /**
   * Calculate recent error rate
   */
  private calculateErrorRate(): number {
    // Implementation would use auth error monitor
    return 0.1; // Simulated low error rate for demo purposes
  }

  /**
   * Calculate overall health score
   */
  private calculateHealthScore(): number {
    let score = 1.0; // Start at 100%

    // Session age factor (older = less healthy)
    if (this.metrics.sessionAge > THIRTY_MINUTES_IN_SECONDS) score -= 0.2;      // -20% for >30min
    if (this.metrics.sessionAge > ONE_HOUR_IN_SECONDS) score -= 0.3;      // -30% for >1hr

    // Token validity factor
    if (!this.metrics.tokenValidity) score -= 0.4;          // -40%

    // Refresh success factor
    score *= this.metrics.refreshSuccess;                        // Scale by success rate

    // Network latency factor
    if (this.metrics.networkLatency > ONE_SECOND_IN_MS) score -= 0.1;     // -10% for >1s
    if (this.metrics.networkLatency > TWO_SECONDS_IN_MS) score -= 0.2;     // -20% for >2s

    // Error rate factor
    score *= Math.max(0.5, 1 - (this.metrics.errorRate * 0.1)); // Decrease by error rate

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Detect session anomalies
   */
  private async detectAnomalies(metrics: SessionHealthMetrics): Promise<SessionAnomaly[]> {
    const anomalies: SessionAnomaly[] = [];

    // Detect refresh loop anomaly
    if (this.metrics.authState === 'refreshing' && this.retryCount > this.config.maxRetryAttempts) {
      anomalies.push({
        type: 'refresh_loop',
        severity: 'high',
        message: 'Multiple session refresh attempts detected',
        timestamp: Date.now(),
        context: { retryCount: this.retryCount }
      });
    }

    // Detect state inconsistency
    if (metrics.authState === 'error' && metrics.tokenValidity) {
      anomalies.push({
        type: 'state_inconsistency',
        severity: 'medium',
        message: 'Auth state is error but token appears valid',
        timestamp: Date.now()
      });
    }

    // Detect performance degradation
    if (metrics.networkLatency > this.config.anomalyThreshold.maxNetworkLatency) {
      anomalies.push({
        type: 'performance_degradation',
        severity: 'medium',
        message: `High network latency: ${metrics.networkLatency}ms`,
        timestamp: Date.now(),
        context: { latency: metrics.networkLatency }
      });
    }

    return anomalies;
  }

  /**
   * Generate health issues list
   */
  private generateHealthIssues(metrics: SessionHealthMetrics, anomalies: SessionAnomaly[]): string[] {
    const issues: string[] = [];

    // Session age issues
    if (metrics.sessionAge > this.config.anomalyThreshold.maxSessionAge) {
      issues.push(`Session age exceeded threshold: ${metrics.sessionAge}s`);
    }

    // Token validity issues
    if (!metrics.tokenValidity) {
      issues.push('Invalid or expired session token');
    }

    // Health score issues
    if (metrics.healthScore < HEALTH_THRESHOLDS.CRITICAL) {
      issues.push('Critical session health issues detected');
    } else if (metrics.healthScore < HEALTH_THRESHOLDS.WARNING) {
      issues.push('Session health degraded');
    }

    // Anomaly-related issues
    anomalies.forEach(anomaly => {
      issues.push(`Session anomaly: ${anomaly.type} (${anomaly.severity})`);
    });

    return issues;
  }

  /**
   * Perform automatic session healing
   */
  private async performAutoHealing(issues: string[]): Promise<void> {
    if (this.retryCount >= this.config.maxRetryAttempts) {
      debugLog('health:autoheal', 'max-attempts-reached', {
        attempts: this.retryCount,
        issues: issues.length
      });
      return;
    }

    this.retryCount++;
    debugLog('health:autoheal', 'attempt', {
      attempt: this.retryCount,
      issues: issues.length
    });

    try {
      // Attempt session refresh for healing
      const { data, error } = await supabaseClient.auth.refreshSession();

      if (error) {
        debugLog('health:autoheal', 'refresh-failed', {
          error: error.message,
          attempt: this.retryCount
        });
      } else {
        debugLog('health:autoheal', 'refresh-success', {
          attempt: this.retryCount,
          newExpiresAt: data.session?.expires_at
        });
        this.retryCount = 0; // Reset on success
      }

    } catch (error) {
      debugLog('health:autoheal', 'exception', {
        error: error instanceof Error ? error.message : 'Unknown error',
        attempt: this.retryCount
      });
    }
  }

  /**
   * Start periodic health monitoring
   */
  startMonitoring(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(async () => {
      await this.checkSessionHealth();
    }, this.config.healthCheckInterval);

    debugLog('health:monitor', 'started', {
      interval: this.config.healthCheckInterval
    });
  }

  /**
   * Stop health monitoring
   */
  stopMonitoring(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }

    debugLog('health:monitor', 'stopped');
  }

  /**
   * Get current health metrics
   */
  getMetrics(): SessionHealthMetrics {
    return { ...this.metrics };
  }

  /**
   * Get recent anomalies
   */
  getAnomalies(limit: number = 5): SessionAnomaly[] {
    return this.anomalies
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }
}

// Export singleton instance
export const sessionHealthMonitor = new SessionHealthMonitor();

// Convenience exports
export const checkSessionHealth = (sessionId?: string) =>
  sessionHealthMonitor.checkSessionHealth(sessionId);

export const startHealthMonitoring = () =>
  sessionHealthMonitor.startMonitoring();

export const stopHealthMonitoring = () =>
  sessionHealthMonitor.stopMonitoring();

export const getSessionHealthMetrics = () =>
  sessionHealthMonitor.getMetrics();

export const getSessionAnomalies = (limit?: number) =>
  sessionHealthMonitor.getAnomalies(limit);