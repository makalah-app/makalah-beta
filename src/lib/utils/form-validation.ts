/**
 * Form Validation Utilities
 *
 * Provides robust validation and sanitization for profile form data
 * Prevents database constraint violations and ensures data quality
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData?: any;
}

export interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
  institution: string;
  predikat: string;
}

const MAX_NAME_LENGTH = 100;
const MAX_INSTITUTION_LENGTH = 255;

/**
 * Validate and sanitize profile form data
 */
export function validateProfileForm(data: ProfileFormData): ValidationResult {
  const errors: string[] = [];
  const sanitized: ProfileFormData = {
    firstName: '',
    lastName: '',
    email: '',
    institution: '',
    predikat: ''
  };

  // Validate firstName (required)
  const firstNameTrimmed = data.firstName?.trim() || '';
  if (!firstNameTrimmed) {
    errors.push('Nama depan wajib diisi');
  } else if (firstNameTrimmed.length > MAX_NAME_LENGTH) {
    errors.push(`Nama depan maksimal ${MAX_NAME_LENGTH} karakter`);
  } else {
    sanitized.firstName = firstNameTrimmed;
  }

  // Validate lastName (optional but with constraints)
  const lastNameTrimmed = data.lastName?.trim() || '';
  if (lastNameTrimmed.length > MAX_NAME_LENGTH) {
    errors.push(`Nama belakang maksimal ${MAX_NAME_LENGTH} karakter`);
  } else {
    sanitized.lastName = lastNameTrimmed;
  }

  // Validate email format
  const emailTrimmed = data.email?.trim() || '';
  if (!emailTrimmed) {
    errors.push('Email wajib diisi');
  } else if (!isValidEmail(emailTrimmed)) {
    errors.push('Format email tidak valid');
  } else {
    sanitized.email = emailTrimmed;
  }

  // Validate institution
  const institutionTrimmed = data.institution?.trim() || '';
  if (institutionTrimmed.length > MAX_INSTITUTION_LENGTH) {
    errors.push(`Nama institusi maksimal ${MAX_INSTITUTION_LENGTH} karakter`);
  } else {
    sanitized.institution = institutionTrimmed;
  }

  // Validate predikat
  const predikatTrimmed = data.predikat?.trim() || '';
  if (!['NONE', 'MAHASISWA', 'PENELITI'].includes(predikatTrimmed)) {
    errors.push('Predikat tidak valid');
  } else {
    sanitized.predikat = predikatTrimmed;
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: sanitized
  };
}

/**
 * Basic email validation
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Generate full name from first and last name
 */
export function generateFullName(firstName: string, lastName: string): string {
  const trimmedFirst = firstName.trim();
  const trimmedLast = lastName.trim();

  if (!trimmedFirst) return trimmedLast;
  if (!trimmedLast) return trimmedFirst;

  return `${trimmedFirst} ${trimmedLast}`;
}

/**
 * Validate name constraints
 */
export function validateNameConstraints(name: string, fieldName: string): string | null {
  const trimmed = name.trim();

  if (!trimmed) {
    return `${fieldName} tidak boleh kosong`;
  }

  if (trimmed.length > MAX_NAME_LENGTH) {
    return `${fieldName} maksimal ${MAX_NAME_LENGTH} karakter`;
  }

  // Check for invalid characters
  const invalidChars = /[<>"/\\|&;:]/;
  if (invalidChars.test(trimmed)) {
    return `${fieldName} mengandung karakter tidak valid`;
  }

  return null;
}

/**
 * Sanitize and validate form submission data
 */
export function prepareSubmissionData(formData: ProfileFormData) {
  const validation = validateProfileForm(formData);

  if (!validation.isValid) {
    throw new Error(validation.errors.join(', '));
  }

  const { sanitizedData } = validation;

  return {
    fullName: generateFullName(sanitizedData.firstName, sanitizedData.lastName),
    firstName: sanitizedData.firstName,
    lastName: sanitizedData.lastName,
    institution: sanitizedData.institution,
    predikat: sanitizedData.predikat === 'NONE' ? null : sanitizedData.predikat
  };
}