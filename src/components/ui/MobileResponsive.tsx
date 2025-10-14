'use client';

/**
 * MobileResponsive - Mobile-optimized components untuk testing across different device contexts
 * 
 * DESIGN COMPLIANCE:
 * - Mobile-first responsive design approach sesuai chat-page-styleguide.md
 * - Touch-friendly interface elements dengan proper touch targets (44px minimum)
 * - Viewport management dan orientation handling
 * - Gesture support untuk swipe navigation dan pull-to-refresh
 * - Device-specific optimizations untuk iOS dan Android
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop';
  os: 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'unknown';
  orientation: 'portrait' | 'landscape';
  screenSize: {
    width: number;
    height: number;
  };
  viewportSize: {
    width: number;
    height: number;
  };
  touchSupport: boolean;
  online: boolean;
}

interface TouchGestures {
  swipeLeft: () => void;
  swipeRight: () => void;
  swipeUp: () => void;
  swipeDown: () => void;
  longPress: () => void;
  doubleTap: () => void;
}

interface MobileResponsiveContextType {
  // Device information
  device: DeviceInfo;
  isLoading: boolean;
  
  // Viewport management
  safeArea: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  
  // Gesture handling
  registerGestures: (elementId: string, gestures: Partial<TouchGestures>) => void;
  unregisterGestures: (elementId: string) => void;
  
  // Mobile optimizations
  enablePullToRefresh: (onRefresh: () => Promise<void>) => void;
  disablePullToRefresh: () => void;
  preventZoom: (prevent: boolean) => void;
  enableFullscreen: () => void;
  exitFullscreen: () => void;
  
  // Keyboard handling
  isVirtualKeyboardOpen: boolean;
  keyboardHeight: number;
  
  // Network status
  connectionType: 'wifi' | '4g' | '3g' | '2g' | 'slow-2g' | 'offline' | 'unknown';
  isSlowConnection: boolean;
}

interface MobileResponsiveProviderProps {
  children: ReactNode;
}

const MobileResponsiveContext = createContext<MobileResponsiveContextType | undefined>(undefined);

export const MobileResponsiveProvider: React.FC<MobileResponsiveProviderProps> = ({ children }) => {
  const [device, setDevice] = useState<DeviceInfo>({
    type: 'desktop',
    os: 'unknown',
    orientation: 'portrait',
    screenSize: { width: 0, height: 0 },
    viewportSize: { width: 0, height: 0 },
    touchSupport: false,
    online: true,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [safeArea, setSafeArea] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });

  const [gestureListeners, setGestureListeners] = useState<Map<string, Partial<TouchGestures>>>(new Map());
  const [pullToRefreshCallback, setPullToRefreshCallback] = useState<(() => Promise<void>) | null>(null);
  const [isVirtualKeyboardOpen, setIsVirtualKeyboardOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [connectionType, setConnectionType] = useState<MobileResponsiveContextType['connectionType']>('unknown');

  // Detect device information
  const detectDevice = useCallback(() => {
    if (typeof window === 'undefined') return;

    const userAgent = navigator.userAgent.toLowerCase();
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Device type detection
    let deviceType: DeviceInfo['type'] = 'desktop';
    if (screenWidth <= 768 || /mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
      deviceType = 'mobile';
    } else if (screenWidth <= 1024 || /ipad|tablet|kindle|playbook|silk/i.test(userAgent)) {
      deviceType = 'tablet';
    }

    // OS detection
    let os: DeviceInfo['os'] = 'unknown';
    if (/iphone|ipad|ipod/i.test(userAgent)) {
      os = 'ios';
    } else if (/android/i.test(userAgent)) {
      os = 'android';
    } else if (/windows/i.test(userAgent)) {
      os = 'windows';
    } else if (/macintosh|mac os x/i.test(userAgent)) {
      os = 'macos';
    } else if (/linux/i.test(userAgent)) {
      os = 'linux';
    }

    // Orientation detection
    const orientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';

    // Touch support
    const touchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Network status
    const online = navigator.onLine;

    setDevice({
      type: deviceType,
      os,
      orientation,
      screenSize: { width: screenWidth, height: screenHeight },
      viewportSize: { width: viewportWidth, height: viewportHeight },
      touchSupport,
      online,
    });
  }, []);

  // Detect safe area (for devices with notches)
  const detectSafeArea = useCallback(() => {
    if (typeof window === 'undefined') return;

    const computedStyle = getComputedStyle(document.documentElement);
    const safeAreaInsetTop = computedStyle.getPropertyValue('--safe-area-inset-top');
    const safeAreaInsetBottom = computedStyle.getPropertyValue('--safe-area-inset-bottom');
    const safeAreaInsetLeft = computedStyle.getPropertyValue('--safe-area-inset-left');
    const safeAreaInsetRight = computedStyle.getPropertyValue('--safe-area-inset-right');

    setSafeArea({
      top: safeAreaInsetTop ? parseInt(safeAreaInsetTop) : 0,
      bottom: safeAreaInsetBottom ? parseInt(safeAreaInsetBottom) : 0,
      left: safeAreaInsetLeft ? parseInt(safeAreaInsetLeft) : 0,
      right: safeAreaInsetRight ? parseInt(safeAreaInsetRight) : 0,
    });
  }, []);

  // Detect network connection type
  const detectConnection = useCallback(() => {
    if (typeof window === 'undefined' || !('connection' in navigator)) return;

    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (!connection) return;

    const effectiveType = connection.effectiveType;
    setConnectionType(effectiveType || 'unknown');
  }, []);

  // Virtual keyboard detection
  const detectVirtualKeyboard = useCallback(() => {
    if (typeof window === 'undefined') return;

    const initialViewportHeight = window.visualViewport?.height || window.innerHeight;
    
    const checkKeyboard = () => {
      const currentViewportHeight = window.visualViewport?.height || window.innerHeight;
      const heightDifference = initialViewportHeight - currentViewportHeight;
      
      // If height difference is significant (> 150px), keyboard is likely open
      const keyboardOpen = heightDifference > 150;
      setIsVirtualKeyboardOpen(keyboardOpen);
      setKeyboardHeight(keyboardOpen ? heightDifference : 0);
      
      // Update viewport height CSS variable for layout adjustments
      document.documentElement.style.setProperty('--viewport-height', `${currentViewportHeight}px`);
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', checkKeyboard);
      return () => window.visualViewport?.removeEventListener('resize', checkKeyboard);
    } else {
      window.addEventListener('resize', checkKeyboard);
      return () => window.removeEventListener('resize', checkKeyboard);
    }
  }, []);

  // Initialize device detection
  useEffect(() => {
    detectDevice();
    detectSafeArea();
    detectConnection();
    
    const cleanup = detectVirtualKeyboard();
    setIsLoading(false);

    // Listen for changes
    const handleResize = () => {
      detectDevice();
      detectSafeArea();
    };
    
    const handleOrientationChange = () => {
      // Delay to ensure accurate measurements
      setTimeout(() => {
        detectDevice();
        detectSafeArea();
      }, 100);
    };

    const handleOnlineStatusChange = () => {
      setDevice(prev => ({ ...prev, online: navigator.onLine }));
    };

    const handleConnectionChange = () => {
      detectConnection();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('online', handleOnlineStatusChange);
    window.addEventListener('offline', handleOnlineStatusChange);

    if ('connection' in navigator) {
      (navigator as any).connection?.addEventListener('change', handleConnectionChange);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('online', handleOnlineStatusChange);
      window.removeEventListener('offline', handleOnlineStatusChange);
      
      if ('connection' in navigator) {
        (navigator as any).connection?.removeEventListener('change', handleConnectionChange);
      }
      
      cleanup?.();
    };
  }, [detectDevice, detectSafeArea, detectConnection, detectVirtualKeyboard]);

  // Gesture handling
  const registerGestures = useCallback((elementId: string, gestures: Partial<TouchGestures>) => {
    setGestureListeners(prev => new Map(prev.set(elementId, gestures)));
    
    const element = document.getElementById(elementId);
    if (!element || !device.touchSupport) return;

    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let lastTap = 0;
    let longPressTimer: NodeJS.Timeout | null = null;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      startTime = Date.now();

      // Long press detection
      if (gestures.longPress) {
        longPressTimer = setTimeout(() => {
          gestures.longPress?.();
        }, 500);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Cancel long press if user moves finger
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }

      const touch = e.changedTouches[0];
      const endX = touch.clientX;
      const endY = touch.clientY;
      const endTime = Date.now();

      const deltaX = endX - startX;
      const deltaY = endY - startY;
      const deltaTime = endTime - startTime;

      // Swipe detection (minimum 50px distance, maximum 500ms duration)
      const minSwipeDistance = 50;
      const maxSwipeTime = 500;

      if (Math.abs(deltaX) > minSwipeDistance && deltaTime < maxSwipeTime) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          // Horizontal swipe
          if (deltaX > 0 && gestures.swipeRight) {
            gestures.swipeRight();
          } else if (deltaX < 0 && gestures.swipeLeft) {
            gestures.swipeLeft();
          }
        }
      } else if (Math.abs(deltaY) > minSwipeDistance && deltaTime < maxSwipeTime) {
        // Vertical swipe
        if (deltaY > 0 && gestures.swipeDown) {
          gestures.swipeDown();
        } else if (deltaY < 0 && gestures.swipeUp) {
          gestures.swipeUp();
        }
      }

      // Double tap detection
      const currentTime = Date.now();
      if (currentTime - lastTap < 300 && gestures.doubleTap) {
        gestures.doubleTap();
      }
      lastTap = currentTime;
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    // Store cleanup function
    const cleanup = () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };

    return cleanup;
  }, [device.touchSupport]);

  const unregisterGestures = useCallback((elementId: string) => {
    setGestureListeners(prev => {
      const newMap = new Map(prev);
      newMap.delete(elementId);
      return newMap;
    });
  }, []);

  // Pull to refresh
  const enablePullToRefresh = useCallback((onRefresh: () => Promise<void>) => {
    setPullToRefreshCallback(() => onRefresh);
    
    // Disable default pull-to-refresh behavior
    document.body.style.overscrollBehavior = 'none';
    
    let startY = 0;
    let currentY = 0;
    let isRefreshing = false;
    
    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
      }
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (window.scrollY === 0 && !isRefreshing) {
        currentY = e.touches[0].clientY;
        const diff = currentY - startY;
        
        if (diff > 0 && diff < 200) {
          e.preventDefault();
          // Add visual feedback here if needed
        }
      }
    };
    
    const handleTouchEnd = async () => {
      const diff = currentY - startY;
      
      if (diff > 100 && window.scrollY === 0 && !isRefreshing) {
        isRefreshing = true;
        try {
          await onRefresh();
        } finally {
          isRefreshing = false;
        }
      }
    };
    
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
  }, []);

  const disablePullToRefresh = useCallback(() => {
    setPullToRefreshCallback(null);
    document.body.style.overscrollBehavior = '';
  }, []);

  // Zoom prevention
  const preventZoom = useCallback((prevent: boolean) => {
    const viewport = document.querySelector('meta[name=viewport]') as HTMLMetaElement;
    if (viewport) {
      if (prevent) {
        viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      } else {
        viewport.content = 'width=device-width, initial-scale=1.0';
      }
    }
  }, []);

  // Fullscreen management
  const enableFullscreen = useCallback(() => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    } else if ((document.documentElement as any).webkitRequestFullscreen) {
      (document.documentElement as any).webkitRequestFullscreen();
    } else if ((document.documentElement as any).msRequestFullscreen) {
      (document.documentElement as any).msRequestFullscreen();
    }
  }, []);

  const exitFullscreen = useCallback(() => {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if ((document as any).webkitExitFullscreen) {
      (document as any).webkitExitFullscreen();
    } else if ((document as any).msExitFullscreen) {
      (document as any).msExitFullscreen();
    }
  }, []);

  const isSlowConnection = connectionType === 'slow-2g' || connectionType === '2g' || connectionType === 'offline';

  const contextValue: MobileResponsiveContextType = {
    device,
    isLoading,
    safeArea,
    registerGestures,
    unregisterGestures,
    enablePullToRefresh,
    disablePullToRefresh,
    preventZoom,
    enableFullscreen,
    exitFullscreen,
    isVirtualKeyboardOpen,
    keyboardHeight,
    connectionType,
    isSlowConnection,
  };

  return (
    <MobileResponsiveContext.Provider value={contextValue}>
      {children}
    </MobileResponsiveContext.Provider>
  );
};

// Hook untuk accessing mobile responsive context
export const useMobileResponsive = (): MobileResponsiveContextType => {
  const context = useContext(MobileResponsiveContext);
  if (!context) {
    throw new Error('useMobileResponsive must be used within a MobileResponsiveProvider');
  }
  return context;
};

// Mobile-optimized components

// Touch-friendly button dengan proper touch targets
export const TouchButton: React.FC<{
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}> = ({ children, onClick, disabled = false, size = 'medium', className = '' }) => {
  const { device } = useMobileResponsive();

  const sizeClasses = {
    small: device.touchSupport ? 'min-h-[44px] px-4 py-2' : 'px-3 py-1',
    medium: device.touchSupport ? 'min-h-[44px] px-6 py-3' : 'px-4 py-2',
    large: device.touchSupport ? 'min-h-[48px] px-8 py-4' : 'px-6 py-3',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${sizeClasses[size]}
        bg-primary-600 text-white rounded font-medium
        active:bg-primary-700 transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        ${device.touchSupport ? 'touch-manipulation' : ''}
        ${className}
      `}
    >
      {children}
    </button>
  );
};

// Swipe-enabled container
export const SwipeContainer: React.FC<{
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  className?: string;
}> = ({ children, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, className = '' }) => {
  const { registerGestures, unregisterGestures } = useMobileResponsive();
  const containerId = `swipe-container-${Math.random().toString(36).substr(2, 9)}`;

  useEffect(() => {
    registerGestures(containerId, {
      swipeLeft: onSwipeLeft,
      swipeRight: onSwipeRight,
      swipeUp: onSwipeUp,
      swipeDown: onSwipeDown,
    });

    return () => unregisterGestures(containerId);
  }, [containerId, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, registerGestures, unregisterGestures]);

  return (
    <div id={containerId} className={`touch-container ${className}`}>
      {children}
    </div>
  );
};

// Device-aware layout
export const ResponsiveLayout: React.FC<{
  children: ReactNode;
  mobileLayout?: ReactNode;
  tabletLayout?: ReactNode;
  className?: string;
}> = ({ children, mobileLayout, tabletLayout, className = '' }) => {
  const { device } = useMobileResponsive();

  if (device.type === 'mobile' && mobileLayout) {
    return <div className={`mobile-layout ${className}`}>{mobileLayout}</div>;
  }

  if (device.type === 'tablet' && tabletLayout) {
    return <div className={`tablet-layout ${className}`}>{tabletLayout}</div>;
  }

  return <div className={`desktop-layout ${className}`}>{children}</div>;
};

// Safe area wrapper
export const SafeAreaWrapper: React.FC<{
  children: ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  const { safeArea } = useMobileResponsive();

  return (
    <div
      className={`safe-area-wrapper ${className}`}
      style={{
        paddingTop: safeArea.top,
        paddingBottom: safeArea.bottom,
        paddingLeft: safeArea.left,
        paddingRight: safeArea.right,
      }}
    >
      {children}
    </div>
  );
};

// Virtual keyboard aware input
export const KeyboardAwareInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}> = ({ value, onChange, placeholder, className = '' }) => {
  const { isVirtualKeyboardOpen, keyboardHeight } = useMobileResponsive();

  return (
    <div
      className={`keyboard-aware-input ${className}`}
      style={{
        marginBottom: isVirtualKeyboardOpen ? keyboardHeight : 0,
        transition: 'margin-bottom 0.3s ease',
      }}
    >
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full p-3 border border-gray-300 rounded resize-none focus:ring-2 focus:ring-primary-500"
        rows={3}
      />
    </div>
  );
};

// Connection-aware content loader
export const ConnectionAwareLoader: React.FC<{
  children: ReactNode;
  loadingContent?: ReactNode;
  slowConnectionContent?: ReactNode;
}> = ({ children, loadingContent, slowConnectionContent }) => {
  const { device, isSlowConnection, isLoading } = useMobileResponsive();

  if (isLoading) {
    return <div>{loadingContent || <div>Loading...</div>}</div>;
  }

  if (!device.online) {
    return (
      <div className="offline-message text-center p-4 bg-red-50 border border-red-200 rounded">
        <p className="text-red-600">You are currently offline</p>
      </div>
    );
  }

  if (isSlowConnection && slowConnectionContent) {
    return <div>{slowConnectionContent}</div>;
  }

  return <div>{children}</div>;
};

// Device info display (for debugging)
export const DeviceInfo: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { device, safeArea, isVirtualKeyboardOpen, keyboardHeight, connectionType } = useMobileResponsive();

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className={`device-info bg-gray-100 border border-gray-300 rounded p-2 text-xs ${className}`}>
      <div><strong>Device:</strong> {device.type} ({device.os})</div>
      <div><strong>Screen:</strong> {device.screenSize.width}x{device.screenSize.height}</div>
      <div><strong>Viewport:</strong> {device.viewportSize.width}x{device.viewportSize.height}</div>
      <div><strong>Orientation:</strong> {device.orientation}</div>
      <div><strong>Touch:</strong> {device.touchSupport ? 'Yes' : 'No'}</div>
      <div><strong>Online:</strong> {device.online ? 'Yes' : 'No'}</div>
      <div><strong>Connection:</strong> {connectionType}</div>
      <div><strong>Safe Area:</strong> {safeArea.top}/{safeArea.right}/{safeArea.bottom}/{safeArea.left}</div>
      <div><strong>Virtual KB:</strong> {isVirtualKeyboardOpen ? `Open (${keyboardHeight}px)` : 'Closed'}</div>
    </div>
  );
};

export default MobileResponsiveProvider;
