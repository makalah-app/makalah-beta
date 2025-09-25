/**
 * Authentication Form Validation Utilities
 * 
 * Provides validation functions for login and registration forms
 * without external dependencies. Used for client-side form validation
 * with academic context requirements.
 * 
 * Features:
 * - Email validation with academic domain support
 * - Password strength validation for academic accounts
 * - Registration form validation with institutional requirements
 * - Error message generation with internationalization support
 * - Input sanitization for security
 */

// Validation Types
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

export interface LoginFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegistrationFormData {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  institution?: string;
  role: 'researcher' | 'student';
  acceptTerms: boolean;
}

export interface PasswordResetRequestFormData {
  email: string;
}

export interface PasswordResetFormData {
  password: string;
  confirmPassword: string;
}

export interface FormValidationConfig {
  enableAcademicDomains: boolean;
  requireInstitution: boolean;
  minPasswordLength: number;
  requireSpecialChars: boolean;
  academicDomains: string[];
}

// Default Configuration
const DEFAULT_CONFIG: FormValidationConfig = {
  enableAcademicDomains: true,
  requireInstitution: false,
  minPasswordLength: 8,
  requireSpecialChars: true,
  academicDomains: [
    '.edu', '.ac.id', '.ac.uk', '.edu.au', 
    '.edu.my', '.edu.sg', '.ac.in', '.edu.ph'
  ]
};

/**
 * Email Validation
 */
export function validateEmail(email: string, config: Partial<FormValidationConfig> = {}): ValidationResult {
  const validationConfig = { ...DEFAULT_CONFIG, ...config };
  
  if (!email || email.trim().length === 0) {
    return {
      isValid: false,
      error: 'Email diperlukan'
    };
  }

  const trimmedEmail = email.trim().toLowerCase();
  
  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return {
      isValid: false,
      error: 'Format email tidak valid'
    };
  }

  // Academic domain validation (optional)
  if (validationConfig.enableAcademicDomains) {
    const hasAcademicDomain = validationConfig.academicDomains.some(
      domain => trimmedEmail.includes(domain)
    );
    
    if (!hasAcademicDomain) {
      return {
        isValid: true, // Still valid, but with warning
        warnings: ['Disarankan menggunakan email institusi akademik (.edu, .ac.id, dll)']
      };
    }
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /\+.*@/, // Plus addressing
    /\.{2,}/, // Multiple consecutive dots
    /^[0-9]+@/ // Starting with numbers only
  ];
  
  if (suspiciousPatterns.some(pattern => pattern.test(trimmedEmail))) {
    return {
      isValid: true,
      warnings: ['Format email tidak biasa terdeteksi']
    };
  }

  return { isValid: true };
}

/**
 * Password Validation
 */
export function validatePassword(password: string, config: Partial<FormValidationConfig> = {}): ValidationResult {
  const validationConfig = { ...DEFAULT_CONFIG, ...config };
  
  if (!password || password.length === 0) {
    return {
      isValid: false,
      error: 'Password diperlukan'
    };
  }

  // Length validation
  if (password.length < validationConfig.minPasswordLength) {
    return {
      isValid: false,
      error: `Password minimal ${validationConfig.minPasswordLength} karakter`
    };
  }

  // Strength validation
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(password);

  const warnings: string[] = [];

  if (!hasUpperCase) {
    warnings.push('Tambahkan huruf kapital untuk keamanan lebih baik');
  }
  
  if (!hasLowerCase) {
    warnings.push('Tambahkan huruf kecil untuk keamanan lebih baik');
  }
  
  if (!hasNumbers) {
    warnings.push('Tambahkan angka untuk keamanan lebih baik');
  }

  if (validationConfig.requireSpecialChars && !hasSpecialChars) {
    return {
      isValid: false,
      error: 'Password harus mengandung karakter khusus (!@#$%^&* dll)'
    };
  }

  // Check for common weak passwords
  const commonWeakPasswords = [
    'password', '123456', '12345678', 'qwerty', 'abc123',
    'password123', '123456789', 'letmein', 'welcome'
  ];
  
  if (commonWeakPasswords.includes(password.toLowerCase())) {
    return {
      isValid: false,
      error: 'Password terlalu umum, gunakan kombinasi yang lebih unik'
    };
  }

  // Check for sequential patterns
  const hasSequential = /123|abc|qwerty/i.test(password);
  if (hasSequential) {
    warnings.push('Hindari pola berurutan untuk keamanan lebih baik');
  }

  return {
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Password Confirmation Validation
 */
export function validatePasswordConfirmation(password: string, confirmPassword: string): ValidationResult {
  if (!confirmPassword || confirmPassword.length === 0) {
    return {
      isValid: false,
      error: 'Konfirmasi password diperlukan'
    };
  }

  if (password !== confirmPassword) {
    return {
      isValid: false,
      error: 'Password dan konfirmasi password tidak sama'
    };
  }

  return { isValid: true };
}

/**
 * Full Name Validation
 */
export function validateFullName(fullName: string): ValidationResult {
  if (!fullName || fullName.trim().length === 0) {
    return {
      isValid: false,
      error: 'Nama lengkap diperlukan'
    };
  }

  const trimmedName = fullName.trim();
  
  if (trimmedName.length < 2) {
    return {
      isValid: false,
      error: 'Nama minimal 2 karakter'
    };
  }

  if (trimmedName.length > 100) {
    return {
      isValid: false,
      error: 'Nama maksimal 100 karakter'
    };
  }

  // Check for invalid characters
  const invalidChars = /[<>{}[\]\\\/^~|`@#$%&*+=]/.test(trimmedName);
  if (invalidChars) {
    return {
      isValid: false,
      error: 'Nama mengandung karakter yang tidak diizinkan'
    };
  }

  // Check for numbers (usually not in names)
  const hasNumbers = /\d/.test(trimmedName);
  if (hasNumbers) {
    return {
      isValid: true,
      warnings: ['Nama mengandung angka, pastikan ini benar']
    };
  }

  return { isValid: true };
}

/**
 * Institution Validation
 */
export function validateInstitution(institution: string, required: boolean = false): ValidationResult {
  if (!institution || institution.trim().length === 0) {
    if (required) {
      return {
        isValid: false,
        error: 'Institusi diperlukan'
      };
    }
    return { isValid: true };
  }

  const trimmedInstitution = institution.trim();
  
  if (trimmedInstitution.length < 2) {
    return {
      isValid: false,
      error: 'Nama institusi minimal 2 karakter'
    };
  }

  if (trimmedInstitution.length > 200) {
    return {
      isValid: false,
      error: 'Nama institusi maksimal 200 karakter'
    };
  }

  return { isValid: true };
}

/**
 * Role Validation
 */
export function validateRole(role: string): ValidationResult {
  const validRoles = ['researcher', 'student', 'admin'];
  
  if (!role || role.trim().length === 0) {
    return {
      isValid: false,
      error: 'Role diperlukan'
    };
  }

  if (!validRoles.includes(role.toLowerCase())) {
    return {
      isValid: false,
      error: 'Role tidak valid. Pilih: researcher, student, atau admin'
    };
  }

  return { isValid: true };
}

/**
 * Login Form Validation
 */
export function validateLoginForm(formData: LoginFormData, config: Partial<FormValidationConfig> = {}): {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string[]>;
} {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string[]> = {};

  // Use more lenient validation for login (disable special chars requirement)
  const loginConfig = { 
    ...config, 
    requireSpecialChars: false,  // LOGIN should not require special chars
    enableAcademicDomains: false // LOGIN should not warn about academic domains
  };

  // Validate email
  const emailValidation = validateEmail(formData.email, loginConfig);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.error!;
  } else if (emailValidation.warnings) {
    warnings.email = emailValidation.warnings;
  }

  // Validate password - only basic validation for login
  const passwordValidation = validatePassword(formData.password, loginConfig);
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.error!;
  } else if (passwordValidation.warnings) {
    warnings.password = passwordValidation.warnings;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings
  };
}

/**
 * Registration Form Validation
 */
export function validateRegistrationForm(formData: RegistrationFormData, config: Partial<FormValidationConfig> = {}): {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string[]>;
} {
  const validationConfig = { ...DEFAULT_CONFIG, ...config };
  const errors: Record<string, string> = {};
  const warnings: Record<string, string[]> = {};

  // Validate email
  const emailValidation = validateEmail(formData.email, config);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.error!;
  } else if (emailValidation.warnings) {
    warnings.email = emailValidation.warnings;
  }

  // Validate password
  const passwordValidation = validatePassword(formData.password, config);
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.error!;
  } else if (passwordValidation.warnings) {
    warnings.password = passwordValidation.warnings;
  }

  // Validate password confirmation
  const confirmPasswordValidation = validatePasswordConfirmation(formData.password, formData.confirmPassword);
  if (!confirmPasswordValidation.isValid) {
    errors.confirmPassword = confirmPasswordValidation.error!;
  }

  // Validate full name
  const fullNameValidation = validateFullName(formData.fullName);
  if (!fullNameValidation.isValid) {
    errors.fullName = fullNameValidation.error!;
  } else if (fullNameValidation.warnings) {
    warnings.fullName = fullNameValidation.warnings;
  }

  // Validate institution
  const institutionValidation = validateInstitution(formData.institution || '', validationConfig.requireInstitution);
  if (!institutionValidation.isValid) {
    errors.institution = institutionValidation.error!;
  }

  // Validate role
  const roleValidation = validateRole(formData.role);
  if (!roleValidation.isValid) {
    errors.role = roleValidation.error!;
  }

  // Validate terms acceptance
  if (!formData.acceptTerms) {
    errors.acceptTerms = 'Anda harus menyetujui syarat dan ketentuan';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings
  };
}

/**
 * Sanitize Input
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/data:/gi, '') // Remove data: protocol
    .substring(0, 1000); // Limit length
}

/**
 * Generate Password Strength Score
 */
export function calculatePasswordStrength(password: string): {
  score: number; // 0-100
  level: 'weak' | 'fair' | 'good' | 'strong';
  feedback: string[];
} {
  if (!password) {
    return { score: 0, level: 'weak', feedback: ['Password diperlukan'] };
  }

  let score = 0;
  const feedback: string[] = [];

  // Length scoring
  if (password.length >= 8) score += 25;
  else feedback.push('Minimal 8 karakter');

  if (password.length >= 12) score += 10;

  // Character variety scoring
  if (/[a-z]/.test(password)) score += 15;
  else feedback.push('Tambahkan huruf kecil');

  if (/[A-Z]/.test(password)) score += 15;
  else feedback.push('Tambahkan huruf kapital');

  if (/\d/.test(password)) score += 15;
  else feedback.push('Tambahkan angka');

  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(password)) score += 20;
  else feedback.push('Tambahkan karakter khusus');

  // Complexity bonus
  const uniqueChars = new Set(password.split('')).size;
  if (uniqueChars > password.length * 0.7) score += 10;

  // Determine level
  let level: 'weak' | 'fair' | 'good' | 'strong';
  if (score < 30) level = 'weak';
  else if (score < 60) level = 'fair';
  else if (score < 80) level = 'good';
  else level = 'strong';

  return { score: Math.min(score, 100), level, feedback };
}

/**
 * Password Reset Request Form Validation
 */
export function validatePasswordResetRequestForm(formData: PasswordResetRequestFormData, config: Partial<FormValidationConfig> = {}): {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string[]>;
} {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string[]> = {};

  // Use lenient config for password reset
  const resetConfig = { 
    ...config, 
    enableAcademicDomains: false // Don't warn about academic domains for reset
  };

  // Validate email
  const emailValidation = validateEmail(formData.email, resetConfig);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.error!;
  } else if (emailValidation.warnings) {
    warnings.email = emailValidation.warnings;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings
  };
}

/**
 * Password Reset Form Validation
 */
export function validatePasswordResetForm(formData: PasswordResetFormData, config: Partial<FormValidationConfig> = {}): {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string[]>;
} {
  const validationConfig = { ...DEFAULT_CONFIG, ...config };
  const errors: Record<string, string> = {};
  const warnings: Record<string, string[]> = {};

  // Validate password
  const passwordValidation = validatePassword(formData.password, validationConfig);
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.error!;
  } else if (passwordValidation.warnings) {
    warnings.password = passwordValidation.warnings;
  }

  // Validate password confirmation
  const confirmPasswordValidation = validatePasswordConfirmation(formData.password, formData.confirmPassword);
  if (!confirmPasswordValidation.isValid) {
    errors.confirmPassword = confirmPasswordValidation.error!;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings
  };
}

const formValidation = {
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
  validateFullName,
  validateInstitution,
  validateRole,
  validateLoginForm,
  validateRegistrationForm,
  validatePasswordResetRequestForm,
  validatePasswordResetForm,
  sanitizeInput,
  calculatePasswordStrength
};

export default formValidation;
