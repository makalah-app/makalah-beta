"use client";

/**
 * ThemeToggle - Reusable theme switch component
 *
 * DESIGN COMPLIANCE:
 * - Industrial Academic design dengan sharp corners
 * - Konsisten dengan existing header theme toggle
 * - Menggunakan next-themes hook untuk state management
 * - AISDK Elements naming patterns
 * - Fixed hydration mismatch dengan proper mounted state
 */

import React, { useState, useEffect } from 'react';
import { useTheme } from './ThemeProvider';
import { cn } from '../../lib/utils';

interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className
}) => {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Show loading state until mounted
  if (!mounted) {
    return (
      <button
        className={cn('header-theme-toggle', className)}
        disabled
        aria-label="Loading theme toggle"
        tabIndex={0}
      />
    );
  }

  const currentTheme = resolvedTheme ?? theme ?? 'light';
  const isLight = currentTheme === 'light';

  const handleToggle = () => {
    setTheme(isLight ? 'dark' : 'light');
  };

  return (
    <button
      onClick={handleToggle}
      className={cn(
        'header-theme-toggle',
        className
      )}
      role="switch"
      aria-checked={isLight}
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      tabIndex={0}
    />
  );
};

export default ThemeToggle;
