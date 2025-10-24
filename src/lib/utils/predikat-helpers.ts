/**
 * Predikat Field Helper Utilities
 *
 * Provides consistent data flow between form state and database values
 * Eliminates race conditions and form state inconsistencies
 */

export const PREDIKAT_CONFIG = {
  VALUES: {
    NONE: 'NONE',
    MAHASISWA: 'MAHASISWA',
    PENELITI: 'PENELITI'
  },
  LABELS: {
    NONE: 'Tidak ada',
    MAHASISWA: 'Mahasiswa',
    PENELITI: 'Peneliti'
  }
} as const;

export type PredikatFormValue = keyof typeof PREDIKAT_CONFIG.VALUES;
export type PredikatDbValue = string | null;

/**
 * Convert database value to form value
 */
export const predikatToFormValue = (dbValue: PredikatDbValue): PredikatFormValue => {
  return dbValue && ['MAHASISWA', 'PENELITI'].includes(dbValue)
    ? dbValue as PredikatFormValue
    : 'NONE';
};

/**
 * Convert form value to database value
 */
export const predikatToDbValue = (formValue: PredikatFormValue): PredikatDbValue => {
  return formValue === 'NONE' ? null : formValue;
};

/**
 * Get display label for predikat value
 */
export const getPredikatLabel = (formValue: PredikatFormValue): string => {
  return PREDIKAT_CONFIG.LABELS[formValue];
};

/**
 * Validate predikat form value
 */
export const isValidPredikatValue = (value: string): value is PredikatFormValue => {
  return value === 'NONE' || value === 'MAHASISWA' || value === 'PENELITI';
};