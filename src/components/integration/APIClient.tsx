'use client';

/**
 * APIClient - Client integration yang connects to AI SDK streaming endpoints dari Tasks 01-05
 * 
 * INTEGRATION:
 * - Connect to AI SDK streaming endpoints established dalam Tasks 01-05
 * - Handle academic workflow API calls dengan proper error handling
 * - Manage authentication dan request headers untuk AI services
 * - Integrate dengan existing AI provider configuration
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AcademicUIMessage } from '../chat/ChatContainer';

interface APIClientConfig {
  baseUrl: string;
  apiKey?: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  headers: Record<string, string>;
}

interface APIResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
  headers?: Record<string, string>;
}

interface StreamingOptions {
  onData?: (chunk: any) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
  signal?: AbortSignal;
}

interface APIClientContextType {
  config: APIClientConfig;
  updateConfig: (updates: Partial<APIClientConfig>) => void;
  
  // Core API methods
  sendMessage: (message: string, options?: RequestInit) => Promise<APIResponse<AcademicUIMessage>>;
  streamMessage: (message: string, options?: StreamingOptions) => Promise<ReadableStream>;
  
  // Academic workflow specific endpoints
  executePhaseTransition: (phase: number, data: any) => Promise<APIResponse>;
  searchSources: (query: string, filters?: any) => Promise<APIResponse>;
  
  // System endpoints
  getHealthStatus: () => Promise<APIResponse>;
  getMetrics: () => Promise<APIResponse>;
  
  // State management
  isOnline: boolean;
  lastError: Error | null;
  requestCount: number;
}

interface APIClientProviderProps {
  children: ReactNode;
  initialConfig?: Partial<APIClientConfig>;
}

const defaultConfig: APIClientConfig = {
  baseUrl: '/api',
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

const APIClientContext = createContext<APIClientContextType | undefined>(undefined);

export const APIClientProvider: React.FC<APIClientProviderProps> = ({
  children,
  initialConfig = {},
}) => {
  const [config, setConfig] = useState<APIClientConfig>({
    ...defaultConfig,
    ...initialConfig,
  });
  
  const [isOnline, setIsOnline] = useState(true);
  const [lastError, setLastError] = useState<Error | null>(null);
  const [requestCount, setRequestCount] = useState(0);

  // Update configuration
  const updateConfig = useCallback((updates: Partial<APIClientConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // Core request method dengan retry logic
  const makeRequest = useCallback(async <T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<APIResponse<T>> => {
    const url = `${config.baseUrl}${endpoint}`;
    let lastError: Error | null = null;
    
    setRequestCount(prev => prev + 1);

    for (let attempt = 0; attempt <= config.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout);

        const response = await fetch(url, {
          ...options,
          headers: {
            ...config.headers,
            ...options.headers,
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Check if response is ok
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Success - clear error state
        setLastError(null);
        setIsOnline(true);
        
        return {
          data,
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Handle network errors
        if (error instanceof TypeError || (error as any)?.name === 'AbortError') {
          setIsOnline(false);
        }
        
        // Don't retry on client errors (4xx)
        if ((error as any)?.message?.includes('HTTP 4')) {
          break;
        }
        
        // Wait before retrying
        if (attempt < config.retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, config.retryDelay * (attempt + 1)));
        }
      }
    }

    // All attempts failed
    setLastError(lastError);
    return {
      error: lastError?.message || 'Request failed',
      status: 0,
    };
  }, [config]);

  // Streaming request method
  const makeStreamingRequest = useCallback(async (
    endpoint: string,
    options: RequestInit & StreamingOptions = {}
  ): Promise<ReadableStream> => {
    const { onData, onError, onComplete, signal, ...requestOptions } = options;
    const url = `${config.baseUrl}${endpoint}`;
    
    setRequestCount(prev => prev + 1);

    try {
      const response = await fetch(url, {
        ...requestOptions,
        headers: {
          ...config.headers,
          'Accept': 'text/event-stream',
          ...requestOptions.headers,
        },
        signal: signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const stream = response.body;
      if (!stream) {
        throw new Error('No response stream available');
      }

      // Process SSE stream
      const reader = stream.getReader();
      const decoder = new TextDecoder();

      const processStream = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              onComplete?.();
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.substring(6));
                  onData?.(data);
                } catch (parseError) {
                  console.warn('Failed to parse SSE data:', line);
                }
              }
            }
          }
        } catch (error) {
          const streamError = error instanceof Error ? error : new Error('Stream processing error');
          setLastError(streamError);
          onError?.(streamError);
        } finally {
          reader.releaseLock();
        }
      };

      // Start processing in background
      processStream();
      
      setLastError(null);
      setIsOnline(true);
      
      return stream;

    } catch (error) {
      const streamError = error instanceof Error ? error : new Error('Streaming request failed');
      setLastError(streamError);
      onError?.(streamError);
      throw streamError;
    }
  }, [config]);

  // API Methods
  
  // Core chat methods
  const sendMessage = useCallback(async (
    message: string, 
    options: RequestInit = {}
  ): Promise<APIResponse<AcademicUIMessage>> => {
    return makeRequest<AcademicUIMessage>('/chat/academic', {
      method: 'POST',
      body: JSON.stringify({ message }),
      ...options,
    });
  }, [makeRequest]);

  const streamMessage = useCallback(async (
    message: string,
    options: StreamingOptions = {}
  ): Promise<ReadableStream> => {
    return makeStreamingRequest('/chat/academic/stream', {
      method: 'POST',
      body: JSON.stringify({ message }),
      ...options,
    });
  }, [makeStreamingRequest]);

  // Academic workflow methods
  const executePhaseTransition = useCallback(async (
    phase: number,
    data: any
  ): Promise<APIResponse> => {
    return makeRequest('/workflow/phase/transition', {
      method: 'POST',
      body: JSON.stringify({ phase, data }),
    });
  }, [makeRequest]);

  const searchSources = useCallback(async (
    query: string,
    filters: any = {}
  ): Promise<APIResponse> => {
    const queryParams = new URLSearchParams({
      q: query,
      ...filters,
    });
    
    return makeRequest(`/tools/search?${queryParams}`);
  }, [makeRequest]);

  // System methods
  const getHealthStatus = useCallback(async (): Promise<APIResponse> => {
    return makeRequest('/health');
  }, [makeRequest]);

  const getMetrics = useCallback(async (): Promise<APIResponse> => {
    return makeRequest('/metrics');
  }, [makeRequest]);

  const contextValue: APIClientContextType = {
    config,
    updateConfig,
    
    // Core methods
    sendMessage,
    streamMessage,
    
    // Academic workflow methods
    executePhaseTransition,
    searchSources,
    
    // System methods
    getHealthStatus,
    getMetrics,
    
    // State
    isOnline,
    lastError,
    requestCount,
  };

  return (
    <APIClientContext.Provider value={contextValue}>
      {children}
    </APIClientContext.Provider>
  );
};

// Hook untuk accessing API client
export const useAPIClient = (): APIClientContextType => {
  const context = useContext(APIClientContext);
  if (!context) {
    throw new Error('useAPIClient must be used within an APIClientProvider');
  }
  return context;
};

// Component untuk displaying API status
export const APIStatusIndicator: React.FC<{ className?: string }> = ({ 
  className = '' 
}) => {
  const { isOnline, lastError, requestCount } = useAPIClient();

  return (
    <div className={`api-status-indicator flex items-center gap-2 text-sm ${className}`}>
      <div className={`status-dot w-2 h-2 rounded-full ${
        isOnline ? 'bg-green-400' : 'bg-red-400'
      }`}></div>
      <span className="text-gray-600">
        {isOnline ? 'Online' : 'Offline'}
      </span>
      <span className="text-gray-400">
        ({requestCount} requests)
      </span>
      {lastError && (
        <span className="text-red-600 text-xs" title={lastError.message}>
          Error
        </span>
      )}
    </div>
  );
};

export default APIClientProvider;