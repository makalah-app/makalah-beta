'use client';

/**
 * Accessibility - WCAG 2.1 AA compliance features untuk testing interface
 * 
 * DESIGN COMPLIANCE:
 * - WCAG 2.1 AA accessibility standards compliance
 * - Focus management dan keyboard navigation support
 * - Screen reader announcements dan ARIA attributes
 * - Color contrast validation dan high contrast mode support
 * - Keyboard shortcuts untuk testing interface efficiency
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface AccessibilityState {
  // Visual accessibility
  highContrastMode: boolean;
  reducedMotion: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  
  // Navigation accessibility
  skipToContent: boolean;
  keyboardNavigation: boolean;
  focusVisible: boolean;
  
  // Screen reader
  announcements: string[];
  liveRegion: 'polite' | 'assertive' | 'off';
  
  // Audio accessibility
  soundEnabled: boolean;
  audioFeedback: boolean;
}

interface AccessibilityContextType {
  state: AccessibilityState;
  
  // Visual settings
  toggleHighContrast: () => void;
  toggleReducedMotion: () => void;
  setFontSize: (size: AccessibilityState['fontSize']) => void;
  
  // Navigation
  enableSkipToContent: () => void;
  focusElement: (elementId: string) => void;
  trapFocus: (containerId: string) => void;
  releaseFocusTrap: () => void;
  
  // Screen reader
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
  clearAnnouncements: () => void;
  setLiveRegion: (level: AccessibilityState['liveRegion']) => void;
  
  // Audio
  toggleSound: () => void;
  playFeedback: (type: 'success' | 'error' | 'warning' | 'info') => void;
  
  // Keyboard shortcuts
  registerShortcut: (key: string, callback: () => void, description: string) => void;
  unregisterShortcut: (key: string) => void;
  getShortcuts: () => Array<{ key: string; description: string }>;
}

interface AccessibilityProviderProps {
  children: ReactNode;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const [state, setState] = useState<AccessibilityState>({
    highContrastMode: false,
    reducedMotion: false,
    fontSize: 'medium',
    skipToContent: false,
    keyboardNavigation: true,
    focusVisible: true,
    announcements: [],
    liveRegion: 'polite',
    soundEnabled: true,
    audioFeedback: true,
  });

  const [shortcuts, setShortcuts] = useState<Map<string, { callback: () => void; description: string }>>(new Map());
  const [focusTrap, setFocusTrap] = useState<string | null>(null);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    setState(prev => ({
      ...prev,
      announcements: [...prev.announcements, message],
      liveRegion: priority,
    }));

    // Clear announcement after 5 seconds
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        announcements: prev.announcements.filter(a => a !== message),
      }));
    }, 5000);
  }, []);

  const toggleHighContrast = useCallback(() => {
    setState(prev => ({ ...prev, highContrastMode: !prev.highContrastMode }));
    announce(state.highContrastMode ? 'High contrast disabled' : 'High contrast enabled');
  }, [announce, state.highContrastMode]);

  const toggleReducedMotion = useCallback(() => {
    setState(prev => ({ ...prev, reducedMotion: !prev.reducedMotion }));
    announce(state.reducedMotion ? 'Animations enabled' : 'Animations reduced');
  }, [announce, state.reducedMotion]);

  const setFontSize = useCallback((size: AccessibilityState['fontSize']) => {
    setState(prev => ({ ...prev, fontSize: size }));
    announce(`Font size changed to ${size}`);
  }, [announce]);

  const enableSkipToContent = useCallback(() => {
    setState(prev => ({ ...prev, skipToContent: true }));
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.focus();
      mainContent.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const focusElement = useCallback((elementId: string) => {
    const element = document.getElementById(elementId) as HTMLElement;
    if (element) {
      element.focus();
      element.scrollIntoView({ behavior: state.reducedMotion ? 'auto' : 'smooth', block: 'center' });
    }
  }, [state.reducedMotion]);

  const trapFocus = useCallback((containerId: string) => {
    setFocusTrap(containerId);
  }, []);

  const releaseFocusTrap = useCallback(() => {
    setFocusTrap(null);
  }, []);

  const clearAnnouncements = useCallback(() => {
    setState(prev => ({ ...prev, announcements: [] }));
  }, []);

  const setLiveRegion = useCallback((level: AccessibilityState['liveRegion']) => {
    setState(prev => ({ ...prev, liveRegion: level }));
  }, []);

  const toggleSound = useCallback(() => {
    setState(prev => ({ ...prev, soundEnabled: !prev.soundEnabled, audioFeedback: !prev.soundEnabled }));
    announce(state.soundEnabled ? 'Sound disabled' : 'Sound enabled');
  }, [announce, state.soundEnabled]);

  // Detect user preferences on mount
  useEffect(() => {
    const detectPreferences = () => {
      // Check for reduced motion preference
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      
      // Check for high contrast preference
      const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
      
      // Check saved preferences
      const savedPrefs = localStorage.getItem('accessibility-preferences');
      const preferences = savedPrefs ? JSON.parse(savedPrefs) : {};
      
      setState(prev => ({
        ...prev,
        reducedMotion: prefersReducedMotion || preferences.reducedMotion || false,
        highContrastMode: prefersHighContrast || preferences.highContrastMode || false,
        fontSize: preferences.fontSize || 'medium',
        soundEnabled: preferences.soundEnabled !== false,
        audioFeedback: preferences.audioFeedback !== false,
      }));
    };

    detectPreferences();

    // Listen for preference changes
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = detectPreferences;
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Save preferences to localStorage
  useEffect(() => {
    const preferences = {
      highContrastMode: state.highContrastMode,
      reducedMotion: state.reducedMotion,
      fontSize: state.fontSize,
      soundEnabled: state.soundEnabled,
      audioFeedback: state.audioFeedback,
    };
    localStorage.setItem('accessibility-preferences', JSON.stringify(preferences));
  }, [state.highContrastMode, state.reducedMotion, state.fontSize, state.soundEnabled, state.audioFeedback]);

  // Apply CSS classes based on accessibility state
  useEffect(() => {
    const root = document.documentElement;
    
    // High contrast mode
    if (state.highContrastMode) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    
    // Reduced motion
    if (state.reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }
    
    // Font size
    root.classList.remove('font-small', 'font-medium', 'font-large', 'font-extra-large');
    root.classList.add(`font-${state.fontSize}`);
    
    // Focus visible
    if (state.focusVisible) {
      root.classList.add('focus-visible');
    } else {
      root.classList.remove('focus-visible');
    }
  }, [state.highContrastMode, state.reducedMotion, state.fontSize, state.focusVisible]);

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if user is typing in input
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement ||
          event.target instanceof HTMLSelectElement) {
        return;
      }

      const key = event.key.toLowerCase();
      const modifier = event.ctrlKey || event.metaKey;
      const shortcutKey = modifier ? `ctrl+${key}` : key;

      const shortcut = shortcuts.get(shortcutKey);
      if (shortcut) {
        event.preventDefault();
        shortcut.callback();
      }

      // Built-in shortcuts
      if (modifier) {
        switch (key) {
          case '1':
            event.preventDefault();
            toggleHighContrast();
            break;
          case '2':
            event.preventDefault();
            toggleReducedMotion();
            break;
          case '3':
            event.preventDefault();
            setFontSize(state.fontSize === 'large' ? 'medium' : 'large');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, state.fontSize]);

  // Focus trap management
  useEffect(() => {
    if (!focusTrap) return;

    const container = document.getElementById(focusTrap);
    if (!container) return;

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    return () => container.removeEventListener('keydown', handleTabKey);
  }, [focusTrap]);


  const playFeedback = useCallback((type: 'success' | 'error' | 'warning' | 'info') => {
    if (!state.soundEnabled || !state.audioFeedback) return;

    // Create audio feedback using Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Different frequencies for different feedback types
      const frequencies = {
        success: 800,
        error: 400,
        warning: 600,
        info: 700,
      };

      oscillator.frequency.setValueAtTime(frequencies[type], audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.1);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      // Audio feedback not available - browser may not support Web Audio API
    }
  }, [state.soundEnabled, state.audioFeedback]);

  // Keyboard shortcuts
  const registerShortcut = useCallback((key: string, callback: () => void, description: string) => {
    setShortcuts(prev => new Map(prev.set(key, { callback, description })));
  }, []);

  const unregisterShortcut = useCallback((key: string) => {
    setShortcuts(prev => {
      const newMap = new Map(prev);
      newMap.delete(key);
      return newMap;
    });
  }, []);

  const getShortcuts = useCallback(() => {
    return Array.from(shortcuts.entries()).map(([key, { description }]) => ({
      key: key.replace('ctrl+', 'Ctrl+').toUpperCase(),
      description,
    }));
  }, [shortcuts]);

  const contextValue: AccessibilityContextType = {
    state,
    toggleHighContrast,
    toggleReducedMotion,
    setFontSize,
    enableSkipToContent,
    focusElement,
    trapFocus,
    releaseFocusTrap,
    announce,
    clearAnnouncements,
    setLiveRegion,
    toggleSound,
    playFeedback,
    registerShortcut,
    unregisterShortcut,
    getShortcuts,
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}
      
      {/* Live region for screen reader announcements */}
      <div
        aria-live={state.liveRegion}
        aria-atomic="true"
        className="sr-only"
        id="accessibility-live-region"
      >
        {state.announcements[state.announcements.length - 1]}
      </div>
      
      {/* Skip to content link */}
      <a
        href="#main-content"
        className="skip-to-content sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-primary-600 focus:text-white focus:px-4 focus:py-2 focus:rounded"
        onClick={(e) => {
          e.preventDefault();
          enableSkipToContent();
        }}
      >
        Skip to main content
      </a>
    </AccessibilityContext.Provider>
  );
};

// Hook untuk accessing accessibility context
export const useAccessibility = (): AccessibilityContextType => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

// Accessibility Settings Panel
export const AccessibilitySettings: React.FC<{ className?: string }> = ({ className = '' }) => {
  const {
    state,
    toggleHighContrast,
    toggleReducedMotion,
    setFontSize,
    toggleSound,
    getShortcuts,
  } = useAccessibility();

  const shortcuts = getShortcuts();

  return (
    <div className={`accessibility-settings bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
        Accessibility Settings
      </h3>
      
      {/* Visual Settings */}
      <div className="setting-group mb-6">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Visual</h4>
        
        <div className="setting-item flex items-center justify-between py-2">
          <label htmlFor="high-contrast" className="text-sm text-gray-600 dark:text-gray-400">
            High Contrast Mode
          </label>
          <button
            id="high-contrast"
            onClick={toggleHighContrast}
            className={`toggle-button w-12 h-6 rounded-full transition-colors ${
              state.highContrastMode ? 'bg-primary-600' : 'bg-gray-300'
            }`}
            aria-pressed={state.highContrastMode}
          >
            <span className={`block w-4 h-4 bg-white rounded-full transition-transform ${
              state.highContrastMode ? 'translate-x-7' : 'translate-x-1'
            }`} />
          </button>
        </div>
        
        <div className="setting-item flex items-center justify-between py-2">
          <label htmlFor="reduced-motion" className="text-sm text-gray-600 dark:text-gray-400">
            Reduce Animations
          </label>
          <button
            id="reduced-motion"
            onClick={toggleReducedMotion}
            className={`toggle-button w-12 h-6 rounded-full transition-colors ${
              state.reducedMotion ? 'bg-primary-600' : 'bg-gray-300'
            }`}
            aria-pressed={state.reducedMotion}
          >
            <span className={`block w-4 h-4 bg-white rounded-full transition-transform ${
              state.reducedMotion ? 'translate-x-7' : 'translate-x-1'
            }`} />
          </button>
        </div>
        
        <div className="setting-item py-2">
          <label htmlFor="font-size" className="text-sm text-gray-600 dark:text-gray-400 block mb-1">
            Font Size
          </label>
          <select
            id="font-size"
            value={state.fontSize}
            onChange={(e) => setFontSize(e.target.value as AccessibilityState['fontSize'])}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary-500"
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
            <option value="extra-large">Extra Large</option>
          </select>
        </div>
      </div>
      
      {/* Audio Settings */}
      <div className="setting-group mb-6">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Audio</h4>
        
        <div className="setting-item flex items-center justify-between py-2">
          <label htmlFor="sound-enabled" className="text-sm text-gray-600 dark:text-gray-400">
            Sound Effects
          </label>
          <button
            id="sound-enabled"
            onClick={toggleSound}
            className={`toggle-button w-12 h-6 rounded-full transition-colors ${
              state.soundEnabled ? 'bg-primary-600' : 'bg-gray-300'
            }`}
            aria-pressed={state.soundEnabled}
          >
            <span className={`block w-4 h-4 bg-white rounded-full transition-transform ${
              state.soundEnabled ? 'translate-x-7' : 'translate-x-1'
            }`} />
          </button>
        </div>
      </div>
      
      {/* Keyboard Shortcuts */}
      {shortcuts.length > 0 && (
        <div className="setting-group">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Keyboard Shortcuts</h4>
          <div className="shortcuts-list space-y-1">
            {shortcuts.map(({ key, description }) => (
              <div key={key} className="shortcut-item flex justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">{description}</span>
                <kbd className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-800 dark:text-gray-200">
                  {key}
                </kbd>
              </div>
            ))}
            <div className="shortcut-item flex justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400">Toggle High Contrast</span>
              <kbd className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-800 dark:text-gray-200">
                CTRL+1
              </kbd>
            </div>
            <div className="shortcut-item flex justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400">Toggle Reduced Motion</span>
              <kbd className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-800 dark:text-gray-200">
                CTRL+2
              </kbd>
            </div>
            <div className="shortcut-item flex justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400">Toggle Font Size</span>
              <kbd className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-800 dark:text-gray-200">
                CTRL+3
              </kbd>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Focus management utilities
export const FocusGuard: React.FC<{ children: ReactNode; trapFocus?: boolean }> = ({ 
  children, 
  trapFocus = false 
}) => {
  const { trapFocus: enableTrap, releaseFocusTrap } = useAccessibility();
  const containerId = `focus-container-${Math.random().toString(36).substr(2, 9)}`;

  useEffect(() => {
    if (trapFocus) {
      enableTrap(containerId);
      return () => releaseFocusTrap();
    }
  }, [trapFocus, containerId, enableTrap, releaseFocusTrap]);

  return (
    <div id={containerId} className="focus-container">
      {children}
    </div>
  );
};

// Screen reader only content
export const ScreenReaderOnly: React.FC<{ children: ReactNode; when?: boolean }> = ({ 
  children, 
  when = true 
}) => {
  if (!when) return null;
  
  return (
    <span className="sr-only">
      {children}
    </span>
  );
};

// Accessible button component
export const AccessibleButton: React.FC<{
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  className?: string;
  variant?: 'primary' | 'secondary' | 'danger';
}> = ({ 
  children, 
  onClick, 
  disabled = false, 
  ariaLabel, 
  ariaDescribedBy,
  className = '',
  variant = 'primary'
}) => {
  const { playFeedback, announce } = useAccessibility();

  const handleClick = () => {
    if (disabled) return;
    
    onClick();
    playFeedback('success');
    
    if (ariaLabel) {
      announce(`${ariaLabel} activated`, 'polite');
    }
  };

  const variantClasses = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      className={`
        px-4 py-2 rounded font-medium transition-colors
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {children}
    </button>
  );
};

export default AccessibilityProvider;
