/**
 * Session Management Caching Layer for Makalah AI
 * Implements Redis-based session caching with TTL strategies and security
 * 
 * Task 10 - Performance Optimization with Redis Caching
 * Integrates with RLS policies from Task 08 and user authentication system
 */

import { redisManager, cacheUtils, TTL_STRATEGIES, REDIS_PREFIXES } from '../config/redis-config';

/**
 * User session data structure
 */
export interface UserSession {
  userId: string;
  sessionId: string;
  email: string;
  role: 'admin' | 'user';
  lastActivity: Date;
  preferences: {
    theme?: 'light' | 'dark';
    language?: string;
    academicDiscipline?: string;
  };
  permissions: string[];
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    loginTime: Date;
    refreshCount: number;
  };
}

/**
 * Session activity tracking
 */
export interface SessionActivity {
  action: 'login' | 'logout' | 'workflow_start' | 'workflow_progress' | 'api_call' | 'heartbeat';
  timestamp: Date;
  userId: string;
  sessionId: string;
  details?: Record<string, any>;
}

/**
 * Session statistics for monitoring
 */
export interface SessionStats {
  totalActiveSessions: number;
  userSessions: Record<string, number>;
  recentActivity: SessionActivity[];
  cacheHitRate: number;
  avgSessionDuration: number;
}

/**
 * Session Management with Redis Caching
 */
export class SessionManager {
  private static instance: SessionManager;
  private metrics = {
    hits: 0,
    misses: 0,
    creates: 0,
    updates: 0,
    deletes: 0,
  };

  private constructor() {}

  /**
   * Get singleton session manager instance
   */
  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Create new user session in cache
   */
  public async createSession(session: UserSession): Promise<boolean> {
    try {
      const sessionKey = cacheUtils.formatKey('SESSION', session.sessionId);
      const userSessionKey = cacheUtils.formatKey('USER', `${session.userId}:session`);
      
      // Store session data
      const sessionStored = await cacheUtils.set(
        sessionKey,
        session,
        TTL_STRATEGIES.SESSION
      );

      // Store user -> session mapping
      const mappingStored = await cacheUtils.set(
        userSessionKey,
        session.sessionId,
        TTL_STRATEGIES.SESSION
      );

      if (sessionStored && mappingStored) {
        // Track session creation activity
        await this.trackActivity({
          action: 'login',
          timestamp: new Date(),
          userId: session.userId,
          sessionId: session.sessionId,
          details: {
            role: session.role,
            email: session.email,
          }
        });

        this.metrics.creates++;
        // Session created - silent handling for production
        return true;
      }

      return false;
    } catch (error) {
      // Failed to create session - silent handling for production
      return false;
    }
  }

  /**
   * Get user session from cache
   */
  public async getSession(sessionId: string): Promise<UserSession | null> {
    try {
      const sessionKey = cacheUtils.formatKey('SESSION', sessionId);
      const session = await cacheUtils.get<UserSession>(sessionKey);

      if (session) {
        this.metrics.hits++;
        
        // Update last activity timestamp
        session.lastActivity = new Date();
        await this.updateSession(session);

        return session;
      }

      this.metrics.misses++;
      return null;
    } catch (error) {
      // Failed to get session - silent handling for production
      this.metrics.misses++;
      return null;
    }
  }

  /**
   * Get session by user ID
   */
  public async getSessionByUserId(userId: string): Promise<UserSession | null> {
    try {
      const userSessionKey = cacheUtils.formatKey('USER', `${userId}:session`);
      const sessionId = await cacheUtils.get<string>(userSessionKey);

      if (sessionId) {
        return await this.getSession(sessionId);
      }

      return null;
    } catch (error) {
      // Failed to get session by user ID - silent handling for production
      return null;
    }
  }

  /**
   * Update existing session in cache
   */
  public async updateSession(session: UserSession): Promise<boolean> {
    try {
      const sessionKey = cacheUtils.formatKey('SESSION', session.sessionId);
      
      // Update session with current timestamp
      session.lastActivity = new Date();
      session.metadata.refreshCount++;

      const updated = await cacheUtils.set(
        sessionKey,
        session,
        TTL_STRATEGIES.SESSION
      );

      if (updated) {
        this.metrics.updates++;
        return true;
      }

      return false;
    } catch (error) {
      // Failed to update session - silent handling for production
      return false;
    }
  }

  /**
   * Delete user session from cache
   */
  public async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        return false;
      }

      const sessionKey = cacheUtils.formatKey('SESSION', sessionId);
      const userSessionKey = cacheUtils.formatKey('USER', `${session.userId}:session`);

      // Delete both session and user mapping
      const sessionDeleted = await cacheUtils.del(sessionKey);
      const mappingDeleted = await cacheUtils.del(userSessionKey);

      if (sessionDeleted || mappingDeleted) {
        // Track logout activity
        await this.trackActivity({
          action: 'logout',
          timestamp: new Date(),
          userId: session.userId,
          sessionId: sessionId,
        });

        this.metrics.deletes++;
        // Session deleted - silent handling for production
        return true;
      }

      return false;
    } catch (error) {
      // Failed to delete session - silent handling for production
      return false;
    }
  }

  /**
   * Extend session TTL (keep alive)
   */
  public async extendSession(sessionId: string, additionalSeconds: number = 3600): Promise<boolean> {
    try {
      const sessionKey = cacheUtils.formatKey('SESSION', sessionId);
      const session = await this.getSession(sessionId);

      if (!session) {
        return false;
      }

      // Extend session TTL
      const extended = await redisManager.extendCacheTTL(sessionKey, additionalSeconds);

      if (extended) {
        // Also extend user mapping TTL
        const userSessionKey = cacheUtils.formatKey('USER', `${session.userId}:session`);
        await redisManager.extendCacheTTL(userSessionKey, additionalSeconds);

        // Track heartbeat activity
        await this.trackActivity({
          action: 'heartbeat',
          timestamp: new Date(),
          userId: session.userId,
          sessionId: sessionId,
          details: {
            extendedBy: additionalSeconds,
          }
        });

        return true;
      }

      return false;
    } catch (error) {
      // Failed to extend session - silent handling for production
      return false;
    }
  }

  /**
   * Track session activity for monitoring
   */
  private async trackActivity(activity: SessionActivity): Promise<void> {
    try {
      const activityKey = cacheUtils.formatKey('SESSION', `activity:${activity.sessionId}:${Date.now()}`);
      await cacheUtils.set(activityKey, activity, 86400); // Store for 24 hours
    } catch (error) {
      // Failed to track session activity - silent handling for production
    }
  }

  /**
   * Get session statistics for monitoring
   */
  public async getSessionStats(): Promise<SessionStats> {
    try {
      // Get all active session keys
      const sessionPattern = `${REDIS_PREFIXES.SESSION}*`;
      const sessionKeys = await redisManager.getClient().keys(sessionPattern);

      const activeSessions = sessionKeys.length;
      const userSessions: Record<string, number> = {};

      // Count sessions per user
      for (const key of sessionKeys) {
        try {
          const session = await redisManager.getCache<UserSession>(key);
          if (session && session.userId) {
            userSessions[session.userId] = (userSessions[session.userId] || 0) + 1;
          }
        } catch (error) {
          // Skip invalid session data
        }
      }

      // Get recent activity
      const activityPattern = `${REDIS_PREFIXES.SESSION}activity:*`;
      const activityKeys = await redisManager.getClient().keys(activityPattern);
      const recentActivity: SessionActivity[] = [];

      for (const key of activityKeys.slice(0, 20)) { // Get last 20 activities
        try {
          const activity = await redisManager.getCache<SessionActivity>(key);
          if (activity) {
            recentActivity.push(activity);
          }
        } catch (error) {
          // Skip invalid activity data
        }
      }

      // Calculate cache hit rate
      const totalRequests = this.metrics.hits + this.metrics.misses;
      const cacheHitRate = totalRequests > 0 ? (this.metrics.hits / totalRequests) * 100 : 0;

      return {
        totalActiveSessions: activeSessions,
        userSessions,
        recentActivity: recentActivity.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
        cacheHitRate: Math.round(cacheHitRate * 100) / 100,
        avgSessionDuration: 0, // TODO: Calculate from activity data
      };
    } catch (error) {
      // Failed to get session stats - silent handling for production
      return {
        totalActiveSessions: 0,
        userSessions: {},
        recentActivity: [],
        cacheHitRate: 0,
        avgSessionDuration: 0,
      };
    }
  }

  /**
   * Clean up expired sessions (maintenance task)
   */
  public async cleanupExpiredSessions(): Promise<number> {
    try {
      const sessionPattern = `${REDIS_PREFIXES.SESSION}*`;
      const sessionKeys = await redisManager.getClient().keys(sessionPattern);
      let cleanedCount = 0;

      for (const key of sessionKeys) {
        const ttl = await redisManager.getCacheTTL(key);
        
        // Remove sessions with no TTL or invalid data
        if (ttl === null || ttl <= 0) {
          const session = await redisManager.getCache<UserSession>(key);
          if (session && session.userId) {
            const userSessionKey = cacheUtils.formatKey('USER', `${session.userId}:session`);
            await cacheUtils.del(userSessionKey);
          }
          
          await cacheUtils.del(key);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        // Cleaned up expired sessions - silent handling for production
      }

      return cleanedCount;
    } catch (error) {
      // Failed to cleanup expired sessions - silent handling for production
      return 0;
    }
  }

  /**
   * Get session manager metrics
   */
  public getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Reset session manager metrics
   */
  public resetMetrics() {
    this.metrics = {
      hits: 0,
      misses: 0,
      creates: 0,
      updates: 0,
      deletes: 0,
    };
  }
}

/**
 * Export singleton session manager
 */
export const sessionManager = SessionManager.getInstance();

/**
 * Session utilities for common operations
 */
export const sessionUtils = {
  create: (session: UserSession) => sessionManager.createSession(session),
  get: (sessionId: string) => sessionManager.getSession(sessionId),
  getByUserId: (userId: string) => sessionManager.getSessionByUserId(userId),
  update: (session: UserSession) => sessionManager.updateSession(session),
  delete: (sessionId: string) => sessionManager.deleteSession(sessionId),
  extend: (sessionId: string, seconds?: number) => sessionManager.extendSession(sessionId, seconds),
  stats: () => sessionManager.getSessionStats(),
  cleanup: () => sessionManager.cleanupExpiredSessions(),
  metrics: () => sessionManager.getMetrics(),
};