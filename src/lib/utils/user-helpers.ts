/**
 * User Helper Functions
 *
 * Shared utilities for user display logic across components
 */

import type { User } from '@/hooks/useAuth';

/**
 * Get user initials for avatar display
 */
export const getUserInitials = (user: User | null): string => {
  if (!user || !user.name) return 'U';
  const names = user.name.split(' ');
  if (names.length >= 2) {
    return `${names[0][0]}${names[1][0]}`.toUpperCase();
  }
  return names[0][0].toUpperCase();
};

/**
 * Get user display name (first name only)
 */
export const getUserDisplayName = (user: User | null): string => {
  if (!user || !user.name) return 'User';
  return user.name.split(' ')[0]; // First word only
};

/**
 * Get user role for display with Indonesian translation
 */
export const getUserRole = (user: User | null): string => {
  if (!user || !user.role) return 'Pengguna';
  const roleMap: Record<string, string> = {
    'admin': 'Admin',
    'researcher': 'Peneliti',
    'student': 'Mahasiswa'
  };
  return roleMap[user.role] || 'Pengguna';
};