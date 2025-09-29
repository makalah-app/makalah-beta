'use client';

/**
 * EventHandler - System untuk processing SSE events dari academic workflow engine
 * 
 * INTEGRATION:
 * - Handle SSE events dari academic workflow engine (Task 04-05)
 * - Process streaming academic events dengan proper event dispatch
 * - Integrate dengan existing SSE infrastructure dari Tasks 01-05
 * - Coordinate event-driven updates across UI components
 */

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

interface AcademicEvent {
  id: string;
  type: 'phase-transition' | 'tool-executed' | 'error' | 'system';
  data: any;
  timestamp: number;
  phase?: number;
  source?: string;
  metadata?: Record<string, any>;
}

interface EventSubscription {
  id: string;
  eventTypes: string[];
  callback: (event: AcademicEvent) => void;
  filter?: (event: AcademicEvent) => boolean;
}

interface EventHandlerContextType {
  // Event subscription management
  subscribe: (eventTypes: string | string[], callback: (event: AcademicEvent) => void, filter?: (event: AcademicEvent) => boolean) => string;
  unsubscribe: (subscriptionId: string) => void;
  
  // Event emission (untuk internal system)
  emit: (event: Omit<AcademicEvent, 'id' | 'timestamp'>) => void;
  
  // Event history dan metrics
  recentEvents: AcademicEvent[];
  eventCounts: Record<string, number>;
  
  // SSE connection management
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  reconnect: () => void;
  disconnect: () => void;
}

interface EventHandlerProviderProps {
  children: ReactNode;
  sseEndpoint?: string;
  maxEventHistory?: number;
  autoReconnect?: boolean;
}

const EventHandlerContext = createContext<EventHandlerContextType | undefined>(undefined);

export const EventHandlerProvider: React.FC<EventHandlerProviderProps> = ({
  children,
  sseEndpoint = '/api/events/stream',
  maxEventHistory = 1000,
  autoReconnect = true,
}) => {
  const [subscriptions, setSubscriptions] = useState<Map<string, EventSubscription>>(new Map());
  const [recentEvents, setRecentEvents] = useState<AcademicEvent[]>([]);
  const [eventCounts, setEventCounts] = useState<Record<string, number>>({});
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  // Generate unique subscription ID
  const generateSubscriptionId = useCallback(() => {
    return `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Add event to history dan update counts
  const addEventToHistory = useCallback((event: AcademicEvent) => {
    setRecentEvents(prev => {
      const updated = [event, ...prev];
      return updated.slice(0, maxEventHistory);
    });
    
    setEventCounts(prev => ({
      ...prev,
      [event.type]: (prev[event.type] || 0) + 1,
    }));
  }, [maxEventHistory]);

  // Emit event internally
  const emit = useCallback((eventData: Omit<AcademicEvent, 'id' | 'timestamp'>) => {
    const event: AcademicEvent = {
      ...eventData,
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    console.log('[EventHandler] Emitting event:', event);
    
    // Add to history
    addEventToHistory(event);
    
    // Dispatch to subscribers
    subscriptions.forEach((subscription) => {
      if (subscription.eventTypes.includes('*') || subscription.eventTypes.includes(event.type)) {
        if (!subscription.filter || subscription.filter(event)) {
          try {
            subscription.callback(event);
          } catch (error) {
            console.error('[EventHandler] Subscription callback error:', error);
          }
        }
      }
    });
  }, [subscriptions, addEventToHistory]);

  // Process incoming SSE event
  const processSSEEvent = useCallback((eventData: any) => {
    try {
      // Parse event berdasarkan SSE format
      let parsedData;
      if (typeof eventData === 'string') {
        parsedData = JSON.parse(eventData);
      } else {
        parsedData = eventData;
      }

      // Ensure event has required structure
      const event: AcademicEvent = {
        id: parsedData.id || `sse-${Date.now()}`,
        type: parsedData.type || 'system',
        data: parsedData.data || parsedData,
        timestamp: parsedData.timestamp || Date.now(),
        phase: parsedData.phase,
        source: parsedData.source || 'sse',
        metadata: parsedData.metadata,
      };

      console.log('[EventHandler] Processing SSE event:', event);
      
      // Add to history
      addEventToHistory(event);
      
      // Dispatch to subscribers
      subscriptions.forEach((subscription) => {
        if (subscription.eventTypes.includes('*') || subscription.eventTypes.includes(event.type)) {
          if (!subscription.filter || subscription.filter(event)) {
            try {
              subscription.callback(event);
            } catch (error) {
              console.error('[EventHandler] Subscription callback error:', error);
            }
          }
        }
      });

    } catch (error) {
      console.error('[EventHandler] Error processing SSE event:', error);
      emit({
        type: 'error',
        data: { message: 'Failed to process SSE event', error: (error as any)?.message },
        source: 'event-handler',
      });
    }
  }, [subscriptions, addEventToHistory, emit]);

  // Establish SSE connection
  const connect = useCallback(() => {
    if (eventSource) {
      eventSource.close();
    }

    setConnectionStatus('connecting');
    
    try {
      const newEventSource = new EventSource(sseEndpoint);
      
      newEventSource.onopen = () => {
        console.log('[EventHandler] SSE connection opened');
        setConnectionStatus('connected');
        
        emit({
          type: 'system',
          data: { message: 'SSE connection established' },
          source: 'event-handler',
        });
      };

      newEventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          processSSEEvent(data);
        } catch (error) {
          console.error('[EventHandler] Error parsing SSE message:', error);
        }
      };

      // Handle specific event types
      newEventSource.addEventListener('phase-transition', (event) => {
        processSSEEvent({
          type: 'phase-transition',
          data: JSON.parse(event.data),
          source: 'workflow-engine',
        });
      });



      newEventSource.addEventListener('tool-executed', (event) => {
        processSSEEvent({
          type: 'tool-executed',
          data: JSON.parse(event.data),
          source: 'tool-executor',
        });
      });

      newEventSource.onerror = (error) => {
        console.error('[EventHandler] SSE connection error:', error);
        setConnectionStatus('error');
        
        emit({
          type: 'error',
          data: { message: 'SSE connection error', error },
          source: 'event-handler',
        });

        // Auto-reconnect logic
        if (autoReconnect) {
          setTimeout(() => {
            if (connectionStatus !== 'connected') {
              console.log('[EventHandler] Attempting to reconnect...');
              connect();
            }
          }, 5000);
        }
      };

      setEventSource(newEventSource);
      
    } catch (error) {
      console.error('[EventHandler] Failed to establish SSE connection:', error);
      setConnectionStatus('error');
    }
  }, [autoReconnect, connectionStatus, emit, eventSource, processSSEEvent, sseEndpoint]);

  // Disconnect SSE
  const disconnect = useCallback(() => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
    }
    setConnectionStatus('disconnected');
  }, [eventSource]);

  // Reconnect SSE
  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => connect(), 1000);
  }, [disconnect, connect]);

  // Subscribe to events
  const subscribe = useCallback((
    eventTypes: string | string[],
    callback: (event: AcademicEvent) => void,
    filter?: (event: AcademicEvent) => boolean
  ): string => {
    const subscriptionId = generateSubscriptionId();
    const types = Array.isArray(eventTypes) ? eventTypes : [eventTypes];
    
    const subscription: EventSubscription = {
      id: subscriptionId,
      eventTypes: types,
      callback,
      filter,
    };

    setSubscriptions(prev => new Map(prev.set(subscriptionId, subscription)));
    
    console.log(`[EventHandler] Subscription created: ${subscriptionId} for events: ${types.join(', ')}`);
    
    return subscriptionId;
  }, [generateSubscriptionId]);

  // Unsubscribe from events
  const unsubscribe = useCallback((subscriptionId: string) => {
    setSubscriptions(prev => {
      const updated = new Map(prev);
      updated.delete(subscriptionId);
      return updated;
    });
    
    console.log(`[EventHandler] Subscription removed: ${subscriptionId}`);
  }, []);

  // Initialize connection saat component mount
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Monitor connection status changes
  useEffect(() => {
    console.log(`[EventHandler] Connection status changed: ${connectionStatus}`);
  }, [connectionStatus]);

  const contextValue: EventHandlerContextType = {
    subscribe,
    unsubscribe,
    emit,
    recentEvents,
    eventCounts,
    connectionStatus,
    reconnect,
    disconnect,
  };

  return (
    <EventHandlerContext.Provider value={contextValue}>
      {children}
    </EventHandlerContext.Provider>
  );
};

// Hook untuk accessing event handler
export const useEventHandler = (): EventHandlerContextType => {
  const context = useContext(EventHandlerContext);
  if (!context) {
    throw new Error('useEventHandler must be used within an EventHandlerProvider');
  }
  return context;
};

// Hook untuk subscribing to specific events (dengan cleanup)
export const useEventSubscription = (
  eventTypes: string | string[],
  callback: (event: AcademicEvent) => void,
  filter?: (event: AcademicEvent) => boolean,
  dependencies: any[] = []
): void => {
  const { subscribe, unsubscribe } = useEventHandler();

  useEffect(() => {
    const subscriptionId = subscribe(eventTypes, callback, filter);
    
    return () => {
      unsubscribe(subscriptionId);
    };
  }, [eventTypes, ...dependencies]); // eslint-disable-line react-hooks/exhaustive-deps
};

// Component untuk displaying event stream status
export const EventStreamStatus: React.FC<{ className?: string }> = ({ 
  className = '' 
}) => {
  const { connectionStatus, eventCounts, recentEvents, reconnect } = useEventHandler();

  const totalEvents = Object.values(eventCounts).reduce((sum, count) => sum + count, 0);
  const lastEvent = recentEvents[0];

  return (
    <div className={`event-stream-status bg-gray-50 border border-gray-200 rounded-lg p-3 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-gray-700 text-sm">Event Stream</h4>
        <div className="flex items-center gap-2">
          <div className={`status-dot w-2 h-2 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-400' :
            connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' :
            connectionStatus === 'error' ? 'bg-red-400' :
            'bg-gray-400'
          }`}></div>
          <span className="text-xs text-gray-600 capitalize">{connectionStatus}</span>
        </div>
      </div>
      
      <div className="event-stats text-xs text-gray-600 mb-2">
        <div>Total Events: {totalEvents}</div>
        {lastEvent && (
          <div>Last: {lastEvent.type} at {new Date(lastEvent.timestamp).toLocaleTimeString()}</div>
        )}
      </div>
      
      {connectionStatus === 'error' && (
        <button
          onClick={reconnect}
          className="btn-secondary text-xs px-2 py-1 hover:bg-gray-100"
        >
          Reconnect
        </button>
      )}
    </div>
  );
};

export default EventHandlerProvider;
