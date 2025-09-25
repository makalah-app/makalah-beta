'use client';

/**
 * DebugPanel - Debug panel showing response metadata, token usage, dan performance metrics
 * 
 * PURPOSE:
 * - Show response metadata, token usage, dan performance metrics
 * - Enable debugging AI integration issues dengan detailed information
 * - Provide insights into streaming performance dan system behavior
 * - Track conversation flow dan message processing
 */

import React, { useState, useEffect } from 'react';
import { AcademicUIMessage } from '../chat/ChatContainer';

interface DebugMetrics {
  totalMessages: number;
  totalTokens: number;
  avgResponseTime: number;
  streamingEvents: number;
  errors: number;
  phases: Record<number, number>;
  artifacts: number;
  approvals: number;
}

interface DebugEvent {
  id: string;
  timestamp: number;
  type: 'message' | 'stream' | 'error' | 'approval' | 'artifact';
  data: any;
  metadata?: Record<string, any>;
}

interface DebugPanelProps {
  messages: AcademicUIMessage[];
  chatStatus: 'ready' | 'submitted' | 'streaming' | 'error';
  className?: string;
  isVisible?: boolean;
  onToggleVisibility?: () => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({
  messages,
  chatStatus,
  className = '',
  isVisible = false,
  onToggleVisibility,
}) => {
  const [debugEvents, setDebugEvents] = useState<DebugEvent[]>([]);
  const [selectedTab, setSelectedTab] = useState<'metrics' | 'events' | 'messages' | 'performance'>('metrics');
  const [autoScroll, setAutoScroll] = useState(true);

  // Calculate debug metrics from messages
  const calculateMetrics = (): DebugMetrics => {
    const metrics: DebugMetrics = {
      totalMessages: messages.length,
      totalTokens: 0,
      avgResponseTime: 0,
      streamingEvents: debugEvents.length,
      errors: 0,
      phases: {},
      artifacts: 0,
      approvals: 0,
    };

    let totalResponseTime = 0;
    let responseCount = 0;

    messages.forEach(message => {
      // Count tokens
      if (message.metadata?.tokens) {
        metrics.totalTokens += message.metadata.tokens;
      }

      // Count phases
      if (message.metadata?.phase) {
        metrics.phases[message.metadata.phase] = (metrics.phases[message.metadata.phase] || 0) + 1;
      }

      // Count artifacts
      const artifactParts = message.parts.filter(part => part.type === 'data-artifact');
      metrics.artifacts += artifactParts.length;

      // Count approvals
      const approvalParts = message.parts.filter(part => part.type === 'data-approval');
      metrics.approvals += approvalParts.length;

      // Calculate response times (mock calculation)
      if (message.role === 'assistant' && message.metadata?.timestamp) {
        responseCount++;
        // Mock response time calculation
        totalResponseTime += 2000; // Placeholder
      }
    });

    if (responseCount > 0) {
      metrics.avgResponseTime = totalResponseTime / responseCount;
    }

    // Count errors from debug events
    metrics.errors = debugEvents.filter(event => event.type === 'error').length;

    return metrics;
  };

  const metrics = calculateMetrics();

  // Add debug event (would be called from parent components)
  const addDebugEvent = (event: Omit<DebugEvent, 'id' | 'timestamp'>) => {
    const debugEvent: DebugEvent = {
      ...event,
      id: `debug-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    
    setDebugEvents(prev => [debugEvent, ...prev.slice(0, 999)]); // Keep last 1000 events
  };

  // Format bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format duration
  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`debug-panel fixed bottom-0 right-0 w-96 h-80 bg-gray-900 text-gray-100 border-t border-gray-700 z-50 ${className}`}>
      {/* Debug Panel Header */}
      <div className="debug-header bg-gray-800 px-4 py-2 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-green-400">🐛</span>
          <h4 className="font-semibold text-sm">Debug Panel</h4>
          <div className={`status-dot w-2 h-2 rounded-full ${
            chatStatus === 'ready' ? 'bg-green-400' :
            chatStatus === 'streaming' ? 'bg-blue-400 animate-pulse' :
            chatStatus === 'error' ? 'bg-red-400' :
            'bg-yellow-400'
          }`}></div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDebugEvents([])}
            className="text-xs text-gray-400 hover:text-gray-200"
            title="Clear events"
          >
            🗑️
          </button>
          
          <button
            onClick={onToggleVisibility}
            className="text-gray-400 hover:text-gray-200"
            title="Close debug panel"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Debug Tabs */}
      <div className="debug-tabs flex bg-gray-800 border-b border-gray-700">
        {['metrics', 'events', 'messages', 'performance'].map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab as any)}
            className={`tab px-3 py-2 text-xs capitalize ${
              selectedTab === tab ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Debug Content */}
      <div className="debug-content flex-1 overflow-auto p-3">
        {/* Metrics Tab */}
        {selectedTab === 'metrics' && (
          <div className="metrics-view space-y-3">
            <div className="metric-group">
              <h5 className="text-xs font-semibold text-gray-400 mb-2">Conversation Stats</h5>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="metric-item">
                  <span className="text-gray-400">Messages:</span>
                  <span className="text-white ml-1">{metrics.totalMessages}</span>
                </div>
                <div className="metric-item">
                  <span className="text-gray-400">Tokens:</span>
                  <span className="text-white ml-1">{metrics.totalTokens.toLocaleString()}</span>
                </div>
                <div className="metric-item">
                  <span className="text-gray-400">Artifacts:</span>
                  <span className="text-white ml-1">{metrics.artifacts}</span>
                </div>
                <div className="metric-item">
                  <span className="text-gray-400">Approvals:</span>
                  <span className="text-white ml-1">{metrics.approvals}</span>
                </div>
              </div>
            </div>

            <div className="metric-group">
              <h5 className="text-xs font-semibold text-gray-400 mb-2">Performance</h5>
              <div className="text-xs space-y-1">
                <div>
                  <span className="text-gray-400">Avg Response:</span>
                  <span className="text-white ml-1">{formatDuration(metrics.avgResponseTime)}</span>
                </div>
                <div>
                  <span className="text-gray-400">Events:</span>
                  <span className="text-white ml-1">{metrics.streamingEvents}</span>
                </div>
                <div>
                  <span className="text-gray-400">Errors:</span>
                  <span className={`ml-1 ${metrics.errors > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {metrics.errors}
                  </span>
                </div>
              </div>
            </div>

            <div className="metric-group">
              <h5 className="text-xs font-semibold text-gray-400 mb-2">Phase Distribution</h5>
              <div className="text-xs">
                {Object.entries(metrics.phases).map(([phase, count]) => (
                  <div key={phase} className="flex justify-between">
                    <span className="text-gray-400">Fase {phase}:</span>
                    <span className="text-white">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Events Tab */}
        {selectedTab === 'events' && (
          <div className="events-view">
            <div className="events-header mb-2 flex items-center justify-between">
              <span className="text-xs text-gray-400">Recent Events ({debugEvents.length})</span>
              <label className="flex items-center gap-1 text-xs text-gray-400">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="w-3 h-3"
                />
                Auto-scroll
              </label>
            </div>
            <div className="events-list space-y-1 text-xs">
              {debugEvents.slice(0, 50).map((event) => (
                <div key={event.id} className="event-item bg-gray-800 p-2 rounded">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`event-type px-1 rounded text-xs ${
                          event.type === 'error' ? 'bg-red-600' :
                          event.type === 'message' ? 'bg-blue-600' :
                          event.type === 'stream' ? 'bg-green-600' :
                          'bg-gray-600'
                        }`}>
                          {event.type}
                        </span>
                        <span className="text-gray-400">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-gray-200 mt-1 truncate">
                        {JSON.stringify(event.data).substring(0, 100)}...
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Messages Tab */}
        {selectedTab === 'messages' && (
          <div className="messages-view text-xs">
            {messages.slice(-10).map((message, index) => (
              <div key={message.id} className="message-debug bg-gray-800 p-2 rounded mb-2">
                <div className="flex justify-between items-start mb-1">
                  <span className={`role px-1 rounded text-xs ${
                    message.role === 'user' ? 'bg-blue-600' :
                    message.role === 'assistant' ? 'bg-green-600' :
                    'bg-gray-600'
                  }`}>
                    {message.role}
                  </span>
                  <span className="text-gray-400">
                    Parts: {message.parts.length}
                  </span>
                </div>
                {message.metadata && (
                  <details className="metadata-details">
                    <summary className="cursor-pointer text-gray-400">Metadata</summary>
                    <pre className="text-xs text-gray-300 mt-1 overflow-x-auto">
                      {JSON.stringify(message.metadata, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Performance Tab */}
        {selectedTab === 'performance' && (
          <div className="performance-view text-xs">
            <div className="performance-metrics space-y-2">
              <div className="metric-card bg-gray-800 p-2 rounded">
                <h6 className="text-gray-400 mb-1">Memory Usage</h6>
                <div>Estimated: ~{formatBytes(messages.length * 1024)}</div>
              </div>
              
              <div className="metric-card bg-gray-800 p-2 rounded">
                <h6 className="text-gray-400 mb-1">Component Performance</h6>
                <div>Render Count: {messages.length}</div>
                <div>Re-renders: ~{debugEvents.filter(e => e.type === 'message').length}</div>
              </div>
              
              <div className="metric-card bg-gray-800 p-2 rounded">
                <h6 className="text-gray-400 mb-1">Network Stats</h6>
                <div>Requests: {debugEvents.filter(e => e.type === 'stream').length}</div>
                <div>Status: {chatStatus}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DebugPanel;