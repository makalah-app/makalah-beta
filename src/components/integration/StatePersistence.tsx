'use client';

/**
 * StatePersistence - System untuk maintaining conversation context during testing sessions
 * 
 * PURPOSE:
 * - Maintain conversation context across browser sessions
 * - Persist chat state, messages, dan testing configurations
 * - Enable session recovery dan state restoration
 * - Provide efficient state synchronization dengan localStorage/sessionStorage
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AcademicUIMessage } from '../chat/ChatContainer';

interface PersistedChatSession {
  id: string;
  name: string;
  messages: AcademicUIMessage[];
  currentPhase: number;
  createdAt: number;
  updatedAt: number;
  metadata?: {
    model?: string;
    totalTokens?: number;
    artifacts?: string[];
    approvals?: string[];
    testMode?: boolean;
  };
}

interface PersistedTestConfig {
  id: string;
  name: string;
  config: any;
  lastUsed: number;
}

interface StatePersistenceContextType {
  // Chat session management
  currentSession: PersistedChatSession | null;
  savedSessions: PersistedChatSession[];
  
  // Session operations
  createSession: (name: string, initialData?: Partial<PersistedChatSession>) => string;
  loadSession: (sessionId: string) => PersistedChatSession | null;
  saveSession: (session: PersistedChatSession) => void;
  deleteSession: (sessionId: string) => void;
  updateSession: (sessionId: string, updates: Partial<PersistedChatSession>) => void;
  
  // Message management
  addMessage: (sessionId: string, message: AcademicUIMessage) => void;
  updateMessage: (sessionId: string, messageId: string, updates: Partial<AcademicUIMessage>) => void;
  removeMessage: (sessionId: string, messageId: string) => void;
  clearMessages: (sessionId: string) => void;
  
  // Test configuration persistence
  saveTestConfig: (name: string, config: any) => string;
  loadTestConfig: (configId: string) => any;
  getRecentTestConfigs: () => PersistedTestConfig[];
  deleteTestConfig: (configId: string) => void;
  
  // State synchronization
  syncToStorage: () => void;
  loadFromStorage: () => void;
  clearAllData: () => void;
  
  // Storage status
  storageUsage: number;
  isStorageAvailable: boolean;
}

interface StatePersistenceProviderProps {
  children: ReactNode;
  storagePrefix?: string;
  maxSessions?: number;
  autoSave?: boolean;
  compressionEnabled?: boolean;
}

const StatePersistenceContext = createContext<StatePersistenceContextType | undefined>(undefined);

export const StatePersistenceProvider: React.FC<StatePersistenceProviderProps> = ({
  children,
  storagePrefix = 'makalah-ai',
  maxSessions = 50,
  autoSave = true,
  compressionEnabled = false,
}) => {
  const [currentSession, setCurrentSession] = useState<PersistedChatSession | null>(null);
  const [savedSessions, setSavedSessions] = useState<PersistedChatSession[]>([]);
  const [testConfigs, setTestConfigs] = useState<PersistedTestConfig[]>([]);
  const [storageUsage, setStorageUsage] = useState(0);
  const [isStorageAvailable, setIsStorageAvailable] = useState(true);

  // Storage keys
  const SESSIONS_KEY = `${storagePrefix}-sessions`;
  const CONFIGS_KEY = `${storagePrefix}-test-configs`;
  const CURRENT_SESSION_KEY = `${storagePrefix}-current-session`;

  // Check if storage is available
  const checkStorageAvailability = useCallback(() => {
    try {
      const testKey = `${storagePrefix}-test`;
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      setIsStorageAvailable(true);
      return true;
    } catch (error) {
      console.warn('[StatePersistence] localStorage not available:', error);
      setIsStorageAvailable(false);
      return false;
    }
  }, [storagePrefix]);

  // Calculate storage usage
  const calculateStorageUsage = useCallback(() => {
    if (!isStorageAvailable) return 0;
    
    try {
      let totalSize = 0;
      for (const key in localStorage) {
        if (key.startsWith(storagePrefix)) {
          totalSize += (localStorage[key]?.length || 0) + key.length;
        }
      }
      setStorageUsage(totalSize);
      return totalSize;
    } catch (error) {
      console.error('[StatePersistence] Error calculating storage usage:', error);
      return 0;
    }
  }, [storagePrefix, isStorageAvailable]);

  // Compress data (simple JSON compression)
  const compressData = useCallback((data: any): string => {
    const jsonString = JSON.stringify(data);
    if (compressionEnabled) {
      // Simple compression - remove spaces and optimize structure
      return jsonString.replace(/\s+/g, '');
    }
    return jsonString;
  }, [compressionEnabled]);

  // Decompress data
  const decompressData = useCallback((compressed: string): any => {
    try {
      return JSON.parse(compressed);
    } catch (error) {
      console.error('[StatePersistence] Error decompressing data:', error);
      return null;
    }
  }, []);

  // Save to localStorage
  const saveToStorage = useCallback((key: string, data: any) => {
    if (!isStorageAvailable) return false;
    
    try {
      const compressed = compressData(data);
      localStorage.setItem(key, compressed);
      calculateStorageUsage();
      return true;
    } catch (error) {
      console.error('[StatePersistence] Error saving to storage:', error);
      return false;
    }
  }, [isStorageAvailable, compressData, calculateStorageUsage]);

  // Load from localStorage
  const loadFromStorage = useCallback((key: string): any => {
    if (!isStorageAvailable) return null;
    
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        return decompressData(stored);
      }
      return null;
    } catch (error) {
      console.error('[StatePersistence] Error loading from storage:', error);
      return null;
    }
  }, [isStorageAvailable, decompressData]);

  // Generate unique ID
  const generateId = useCallback(() => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Create new session
  const createSession = useCallback((
    name: string,
    initialData: Partial<PersistedChatSession> = {}
  ): string => {
    const sessionId = generateId();
    const newSession: PersistedChatSession = {
      id: sessionId,
      name,
      messages: [],
      currentPhase: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...initialData,
    };

    setSavedSessions(prev => {
      const updated = [newSession, ...prev];
      // Limit number of sessions
      const limited = updated.slice(0, maxSessions);
      if (autoSave) {
        saveToStorage(SESSIONS_KEY, limited);
      }
      return limited;
    });

    setCurrentSession(newSession);
    if (autoSave) {
      saveToStorage(CURRENT_SESSION_KEY, sessionId);
    }

    return sessionId;
  }, [generateId, maxSessions, autoSave, saveToStorage, SESSIONS_KEY, CURRENT_SESSION_KEY]);

  // Load session
  const loadSession = useCallback((sessionId: string): PersistedChatSession | null => {
    const session = savedSessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSession(session);
      if (autoSave) {
        saveToStorage(CURRENT_SESSION_KEY, sessionId);
      }
      return session;
    }
    return null;
  }, [savedSessions, autoSave, saveToStorage, CURRENT_SESSION_KEY]);

  // Save session
  const saveSession = useCallback((session: PersistedChatSession) => {
    session.updatedAt = Date.now();
    
    setSavedSessions(prev => {
      const updated = prev.map(s => s.id === session.id ? session : s);
      if (autoSave) {
        saveToStorage(SESSIONS_KEY, updated);
      }
      return updated;
    });

    if (currentSession?.id === session.id) {
      setCurrentSession(session);
    }
  }, [currentSession, autoSave, saveToStorage, SESSIONS_KEY]);

  // Update session
  const updateSession = useCallback((
    sessionId: string,
    updates: Partial<PersistedChatSession>
  ) => {
    setSavedSessions(prev => {
      const updated = prev.map(session => 
        session.id === sessionId 
          ? { ...session, ...updates, updatedAt: Date.now() }
          : session
      );
      if (autoSave) {
        saveToStorage(SESSIONS_KEY, updated);
      }
      return updated;
    });

    if (currentSession?.id === sessionId) {
      setCurrentSession(prev => 
        prev ? { ...prev, ...updates, updatedAt: Date.now() } : null
      );
    }
  }, [currentSession, autoSave, saveToStorage, SESSIONS_KEY]);

  // Delete session
  const deleteSession = useCallback((sessionId: string) => {
    setSavedSessions(prev => {
      const updated = prev.filter(s => s.id !== sessionId);
      if (autoSave) {
        saveToStorage(SESSIONS_KEY, updated);
      }
      return updated;
    });

    if (currentSession?.id === sessionId) {
      setCurrentSession(null);
      if (autoSave) {
        localStorage.removeItem(CURRENT_SESSION_KEY);
      }
    }
  }, [currentSession, autoSave, saveToStorage, SESSIONS_KEY, CURRENT_SESSION_KEY]);

  // Message management
  const addMessage = useCallback((sessionId: string, message: AcademicUIMessage) => {
    updateSession(sessionId, {
      messages: [...(savedSessions.find(s => s.id === sessionId)?.messages || []), message],
    });
  }, [updateSession, savedSessions]);

  const updateMessage = useCallback((
    sessionId: string,
    messageId: string,
    updates: Partial<AcademicUIMessage>
  ) => {
    const session = savedSessions.find(s => s.id === sessionId);
    if (session) {
      const updatedMessages = session.messages.map(msg => 
        msg.id === messageId ? { ...msg, ...updates } : msg
      );
      updateSession(sessionId, { messages: updatedMessages });
    }
  }, [savedSessions, updateSession]);

  const removeMessage = useCallback((sessionId: string, messageId: string) => {
    const session = savedSessions.find(s => s.id === sessionId);
    if (session) {
      const updatedMessages = session.messages.filter(msg => msg.id !== messageId);
      updateSession(sessionId, { messages: updatedMessages });
    }
  }, [savedSessions, updateSession]);

  const clearMessages = useCallback((sessionId: string) => {
    updateSession(sessionId, { messages: [] });
  }, [updateSession]);

  // Test config management
  const saveTestConfig = useCallback((name: string, config: any): string => {
    const configId = generateId();
    const testConfig: PersistedTestConfig = {
      id: configId,
      name,
      config,
      lastUsed: Date.now(),
    };

    setTestConfigs(prev => {
      const updated = [testConfig, ...prev.slice(0, 19)]; // Keep 20 most recent
      if (autoSave) {
        saveToStorage(CONFIGS_KEY, updated);
      }
      return updated;
    });

    return configId;
  }, [generateId, autoSave, saveToStorage, CONFIGS_KEY]);

  const loadTestConfig = useCallback((configId: string): any => {
    const config = testConfigs.find(c => c.id === configId);
    if (config) {
      // Update last used time
      setTestConfigs(prev => 
        prev.map(c => 
          c.id === configId ? { ...c, lastUsed: Date.now() } : c
        )
      );
      return config.config;
    }
    return null;
  }, [testConfigs]);

  const getRecentTestConfigs = useCallback((): PersistedTestConfig[] => {
    return testConfigs.sort((a, b) => b.lastUsed - a.lastUsed).slice(0, 10);
  }, [testConfigs]);

  const deleteTestConfig = useCallback((configId: string) => {
    setTestConfigs(prev => {
      const updated = prev.filter(c => c.id !== configId);
      if (autoSave) {
        saveToStorage(CONFIGS_KEY, updated);
      }
      return updated;
    });
  }, [autoSave, saveToStorage, CONFIGS_KEY]);

  // Global operations
  const syncToStorage = useCallback(() => {
    if (autoSave) return; // Already auto-saving
    
    saveToStorage(SESSIONS_KEY, savedSessions);
    saveToStorage(CONFIGS_KEY, testConfigs);
    if (currentSession) {
      saveToStorage(CURRENT_SESSION_KEY, currentSession.id);
    }
  }, [autoSave, savedSessions, testConfigs, currentSession, saveToStorage, SESSIONS_KEY, CONFIGS_KEY, CURRENT_SESSION_KEY]);

  const loadFromStorageAll = useCallback(() => {
    const sessions = loadFromStorage(SESSIONS_KEY);
    if (sessions) {
      setSavedSessions(sessions);
    }

    const configs = loadFromStorage(CONFIGS_KEY);
    if (configs) {
      setTestConfigs(configs);
    }

    const currentSessionId = loadFromStorage(CURRENT_SESSION_KEY);
    if (currentSessionId && sessions) {
      const session = sessions.find((s: PersistedChatSession) => s.id === currentSessionId);
      if (session) {
        setCurrentSession(session);
      }
    }
  }, [loadFromStorage, SESSIONS_KEY, CONFIGS_KEY, CURRENT_SESSION_KEY]);

  const clearAllData = useCallback(() => {
    setSavedSessions([]);
    setTestConfigs([]);
    setCurrentSession(null);
    
    if (isStorageAvailable) {
      try {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith(storagePrefix)) {
            localStorage.removeItem(key);
          }
        });
        calculateStorageUsage();
      } catch (error) {
        console.error('[StatePersistence] Error clearing storage:', error);
      }
    }
  }, [isStorageAvailable, storagePrefix, calculateStorageUsage]);

  // Initialize
  useEffect(() => {
    checkStorageAvailability();
    loadFromStorageAll();
    calculateStorageUsage();
  }, [checkStorageAvailability, loadFromStorageAll, calculateStorageUsage]);

  const contextValue: StatePersistenceContextType = {
    // State
    currentSession,
    savedSessions,
    
    // Session operations
    createSession,
    loadSession,
    saveSession,
    deleteSession,
    updateSession,
    
    // Message operations
    addMessage,
    updateMessage,
    removeMessage,
    clearMessages,
    
    // Test config operations
    saveTestConfig,
    loadTestConfig,
    getRecentTestConfigs,
    deleteTestConfig,
    
    // Global operations
    syncToStorage,
    loadFromStorage: loadFromStorageAll,
    clearAllData,
    
    // Status
    storageUsage,
    isStorageAvailable,
  };

  return (
    <StatePersistenceContext.Provider value={contextValue}>
      {children}
    </StatePersistenceContext.Provider>
  );
};

// Hook untuk accessing state persistence
export const useStatePersistence = (): StatePersistenceContextType => {
  const context = useContext(StatePersistenceContext);
  if (!context) {
    throw new Error('useStatePersistence must be used within a StatePersistenceProvider');
  }
  return context;
};

// Component untuk displaying storage status
export const StorageStatusIndicator: React.FC<{ className?: string }> = ({ 
  className = '' 
}) => {
  const { storageUsage, isStorageAvailable, savedSessions, clearAllData } = useStatePersistence();

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isStorageAvailable) {
    return (
      <div className={`storage-status text-red-600 text-sm ${className}`}>
        ⚠️ Storage not available
      </div>
    );
  }

  return (
    <div className={`storage-status bg-gray-50 border border-gray-200 rounded-lg p-3 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-gray-700 text-sm">Storage Status</h4>
        <span className="text-xs text-gray-500">{formatBytes(storageUsage)}</span>
      </div>
      
      <div className="storage-info text-xs text-gray-600">
        <div>Sessions: {savedSessions.length}</div>
        <div>Status: {isStorageAvailable ? 'Available' : 'Unavailable'}</div>
      </div>
      
      {storageUsage > 1024 * 1024 && ( // Show clear button if > 1MB
        <button
          onClick={clearAllData}
          className="btn-secondary text-xs px-2 py-1 mt-2 hover:bg-gray-100"
        >
          Clear All Data
        </button>
      )}
    </div>
  );
};

export default StatePersistenceProvider;