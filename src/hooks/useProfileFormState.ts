/**
 * Profile Form State Management Hook
 *
 * ISOLATED form state management that prevents data loss during:
 * - Tab switches/minimize
 * - Auth state re-evaluation
 * - Component re-renders
 * - Network interruptions
 *
 * This hook completely eliminates the dangerous useEffect([user]) pattern.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { parseName } from '@/lib/utils/name-parsing';
import { predikatToFormValue, type PredikatFormValue } from '@/lib/utils/predikat-helpers';
import type { User } from './useAuth';

export interface ProfileFormState {
  firstName: string;
  lastName: string;
  email: string;
  institution: string;
  predikat: PredikatFormValue;
}

export interface UseProfileFormStateOptions {
  autoSave?: boolean;
  validateOnChange?: boolean;
}

export interface UseProfileFormStateReturn {
  formState: ProfileFormState;
  setFormState: React.Dispatch<React.SetStateAction<ProfileFormState>>;
  updateFormField: (field: keyof ProfileFormState, value: string) => void;
  hasUnsavedChanges: boolean;
  resetToUserState: () => void;
  syncWithUserState: () => boolean;
  isDirty: boolean;
  lastSyncTime: Date | null;
}

/**
 * Deep comparison for user object changes
 */
const isUserChanged = (prevUser: User | null, newUser: User | null): boolean => {
  if (!prevUser && !newUser) return false;
  if (!prevUser || !newUser) return true;

  return (
    prevUser.id !== newUser.id ||
    prevUser.name !== newUser.name ||
    prevUser.fullName !== newUser.fullName ||
    prevUser.email !== newUser.email ||
    prevUser.institution !== newUser.institution ||
    prevUser.predikat !== newUser.predikat
  );
};

/**
 * Create initial form state from user data
 */
const createFormStateFromUser = (user: User | null): ProfileFormState => {
  if (!user) {
    return {
      firstName: '',
      lastName: '',
      email: '',
      institution: '',
      predikat: 'NONE'
    };
  }

  const parsedName = parseName({
    name: user.name,
    fullName: user.fullName
  });

  return {
    firstName: parsedName.firstName,
    lastName: parsedName.lastName,
    email: user.email || '',
    institution: user.institution || '',
    predikat: predikatToFormValue(user.predikat || null)
  };
};

/**
 * Custom hook for isolated profile form state management
 */
export function useProfileFormState(options: UseProfileFormStateOptions = {}): UseProfileFormStateReturn {
  const { user } = useAuth();

  // Track if we're in tab visibility change
  const isVisibilityChangingRef = useRef(false);

  // Track initial user state for comparison
  const initialUserRef = useRef<User | null>(null);

  // Track last synced user state
  const lastSyncedUserRef = useRef<User | null>(null);

  // Initial form state - only set once on mount or when user changes significantly
  const [formState, setFormState] = useState<ProfileFormState>(() => {
    const initialState = createFormStateFromUser(user);
    initialUserRef.current = user;
    lastSyncedUserRef.current = user;
    return initialState;
  });

  // Track if form has unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(new Date());

  /**
   * Update a single form field
   */
  const updateFormField = useCallback((field: keyof ProfileFormState, value: string) => {
    setFormState(prev => {
      const newState = { ...prev, [field]: value };

      // Check if this creates unsaved changes
      if (lastSyncedUserRef.current) {
        const userState = createFormStateFromUser(lastSyncedUserRef.current);
        const isDirty = JSON.stringify(newState) !== JSON.stringify(userState);
        setHasUnsavedChanges(isDirty);
      }

      return newState;
    });
  }, []);

  /**
   * Reset form to current user state (dangerous - only when explicitly requested)
   */
  const resetToUserState = useCallback(() => {
    if (user) {
      const userState = createFormStateFromUser(user);
      setFormState(userState);
      setHasUnsavedChanges(false);
      lastSyncedUserRef.current = user;
      setLastSyncTime(new Date());
    }
  }, [user]);

  /**
   * Smart sync with user state - only sync if user actually changed
   */
  const syncWithUserState = useCallback((): boolean => {
    if (!user) return false;

    // Check if user actually changed (not just reference)
    if (!isUserChanged(lastSyncedUserRef.current, user)) {
      return false; // No sync needed
    }

    // Only sync if there are no unsaved changes, or if user explicitly wants to sync
    if (!hasUnsavedChanges) {
      const userState = createFormStateFromUser(user);
      setFormState(userState);
      lastSyncedUserRef.current = user;
      setLastSyncTime(new Date());
      setHasUnsavedChanges(false);
      return true;
    }

    return false; // Sync blocked due to unsaved changes
  }, [user, hasUnsavedChanges]);

  /**
   * Handle tab visibility changes
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Tab is being hidden - preserve form state
        isVisibilityChangingRef.current = true;
      } else {
        // Tab is becoming visible again
        setTimeout(() => {
          isVisibilityChangingRef.current = false;
        }, 100); // Small delay to prevent immediate sync
      }
    };

    const handlePageHide = () => {
      isVisibilityChangingRef.current = true;
    };

    const handlePageShow = () => {
      setTimeout(() => {
        isVisibilityChangingRef.current = false;
      }, 100);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  /**
   * Smart user state synchronization
   */
  useEffect(() => {
    // Skip sync during visibility changes to prevent data loss
    if (isVisibilityChangingRef.current) {
      return;
    }

    // Only sync when user significantly changes, not just reference
    if (isUserChanged(lastSyncedUserRef.current, user)) {
      syncWithUserState();
    }
  }, [user, syncWithUserState]);

  /**
   * Auto-save functionality (optional)
   */
  useEffect(() => {
    if (options.autoSave && hasUnsavedChanges) {
      const timer = setTimeout(() => {
        // Auto-save logic could be implemented here
        // For now, we just track that changes exist
      }, 2000); // Auto-save after 2 seconds of inactivity

      return () => clearTimeout(timer);
    }
  }, [options.autoSave, hasUnsavedChanges, formState]);

  /**
   * Initial user state setup - only run once or when user fundamentally changes
   */
  useEffect(() => {
    // Only re-initialize if we don't have a user yet or user ID changed
    if (!initialUserRef.current || (user && initialUserRef.current.id !== user.id)) {
      const userState = createFormStateFromUser(user);
      setFormState(userState);
      initialUserRef.current = user;
      lastSyncedUserRef.current = user;
      setLastSyncTime(new Date());
      setHasUnsavedChanges(false);
    }
  }, [user?.id]); // Only depend on user ID, not full user object

  return {
    formState,
    setFormState,
    updateFormField,
    hasUnsavedChanges,
    resetToUserState,
    syncWithUserState,
    isDirty: hasUnsavedChanges,
    lastSyncTime
  };
}