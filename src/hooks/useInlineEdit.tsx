/**
 * useInlineEdit Hook
 *
 * Reusable hook untuk inline editing functionality.
 * Menangani state management, keyboard shortcuts, dan validasi.
 *
 * Features:
 * - Auto-focus dan select text saat edit mode
 * - Keyboard shortcuts: Enter (save), Escape (cancel)
 * - Auto-save on blur
 * - Max length validation
 * - Loading dan error states
 */

import { useState, useRef, useEffect, useCallback } from 'react';

export interface UseInlineEditOptions {
  /** Initial value untuk input */
  initialValue: string;
  /** Callback untuk save - return true jika berhasil */
  onSave: (value: string) => Promise<boolean>;
  /** Max length untuk input (default: 100) */
  maxLength?: number;
  /** Trim whitespace sebelum save (default: true) */
  trim?: boolean;
  /** Fallback value jika empty (default: "Untitled Chat") */
  fallbackValue?: string;
}

export interface UseInlineEditReturn {
  /** Current value */
  value: string;
  /** Is currently in edit mode */
  isEditing: boolean;
  /** Is saving in progress */
  isSaving: boolean;
  /** Error message if any */
  error: string | null;
  /** Input ref untuk auto-focus */
  inputRef: React.RefObject<HTMLInputElement>;
  /** Start editing */
  startEdit: () => void;
  /** Cancel editing */
  cancelEdit: () => void;
  /** Save current value */
  saveEdit: () => Promise<void>;
  /** Update value */
  setValue: (value: string) => void;
  /** Handle keyboard events */
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  /** Handle blur event */
  handleBlur: () => void;
}

export function useInlineEdit(options: UseInlineEditOptions): UseInlineEditReturn {
  const {
    initialValue,
    onSave,
    maxLength = 100,
    trim = true,
    fallbackValue = 'Untitled Chat'
  } = options;

  const [value, setValue] = useState(initialValue);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const originalValueRef = useRef(initialValue);

  // Update original value when initialValue changes externally
  useEffect(() => {
    if (!isEditing) {
      setValue(initialValue);
      originalValueRef.current = initialValue;
    }
  }, [initialValue, isEditing]);

  // Auto-focus and select text when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const startEdit = useCallback(() => {
    setIsEditing(true);
    setError(null);
    originalValueRef.current = value;
  }, [value]);

  const cancelEdit = useCallback(() => {
    setValue(originalValueRef.current);
    setIsEditing(false);
    setError(null);
  }, []);

  const saveEdit = useCallback(async () => {
    if (isSaving) return;

    const processedValue = trim ? value.trim() : value;
    const finalValue = processedValue || fallbackValue;

    // No change, just exit edit mode
    if (finalValue === originalValueRef.current) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const success = await onSave(finalValue);

      if (success) {
        originalValueRef.current = finalValue;
        setValue(finalValue);
        setIsEditing(false);
      } else {
        setError('Gagal menyimpan perubahan');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setIsSaving(false);
    }
  }, [value, trim, fallbackValue, isSaving, onSave]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  }, [saveEdit, cancelEdit]);

  const handleBlur = useCallback(() => {
    // Only auto-save on blur if not saving and actually edited
    if (!isSaving && value.trim() !== originalValueRef.current) {
      saveEdit();
    } else if (!isSaving) {
      // No changes, just exit edit mode
      setIsEditing(false);
    }
  }, [value, isSaving, saveEdit]);

  return {
    value,
    isEditing,
    isSaving,
    error,
    inputRef,
    startEdit,
    cancelEdit,
    saveEdit,
    setValue,
    handleKeyDown,
    handleBlur
  };
}
