/**
 * Registration Form Component
 * 
 * Provides user registration interface with comprehensive validation,
 * role selection, and integration with user registration endpoint.
 * 
 * Features:
 * - Multi-field registration with validation
 * - Role selection (researcher/student) with descriptions
 * - Institution input with academic email preference
 * - Password strength indicator
 * - Terms and conditions acceptance
 * - Real-time validation feedback
 * - Registration endpoint integration
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { validateRegistrationForm, RegistrationFormData, calculatePasswordStrength } from '../../lib/auth/form-validation';
import { UserRole } from '../../lib/auth/role-permissions';

export interface RegistrationFormProps {
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
  redirectTo?: string;
  showLoginLink?: boolean;
  className?: string;
}

export default function RegistrationForm({
  onSuccess,
  onError,
  redirectTo,
  showLoginLink = true,
  className = ''
}: RegistrationFormProps) {
  const { register, isLoading, error, clearError } = useAuth();

  // Form state
  const [formData, setFormData] = useState<RegistrationFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    institution: '',
    role: 'student',
    acceptTerms: false
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [validationWarnings, setValidationWarnings] = useState<Record<string, string[]>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    if (!formData.password) return null;
    return calculatePasswordStrength(formData.password);
  }, [formData.password]);

  /**
   * Handle form input changes
   */
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear validation errors when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    // Clear auth error
    if (error) {
      clearError();
    }
  }, [validationErrors, error, clearError]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setValidationErrors({});
    setValidationWarnings({});
    clearError();

    // Validate form
    const validation = validateRegistrationForm(formData);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      setValidationWarnings(validation.warnings);
      return;
    }

    try {
      const success = await register({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        role: formData.role,
        institution: formData.institution || undefined
      });
      
      if (success) {
        const successMessage = 'Registrasi berhasil! Silakan cek email untuk verifikasi akun.';
        onSuccess?.(successMessage);
        
        // Redirect if specified
        if (redirectTo) {
          setTimeout(() => {
            window.location.href = redirectTo;
          }, 2000);
        }
      } else {
        onError?.(error || 'Registrasi gagal');
      }
    } catch (registrationError) {
      const errorMessage = registrationError instanceof Error ? registrationError.message : 'Registration error occurred';
      onError?.(errorMessage);
    }
  }, [formData, register, onSuccess, onError, redirectTo, error, clearError]);

  /**
   * Get role description
   */
  const getRoleDescription = (role: UserRole): string => {
    const descriptions = {
      student: 'Mahasiswa dengan akses workflow supervised dan bantuan AI terbatas',
      researcher: 'Peneliti dengan akses penuh workflow akademik dan fitur AI advanced',
      admin: 'Administrator dengan akses manajemen sistem (khusus undangan)'
    };
    return descriptions[role as keyof typeof descriptions] || 'Pengguna';
  };

  /**
   * Get password strength color
   */
  const getPasswordStrengthColor = (level: string): string => {
    const colors = {
      weak: '#ef4444',
      fair: '#f59e0b',
      good: '#3b82f6',
      strong: '#10b981'
    };
    return colors[level as keyof typeof colors] || '#9ca3af';
  };

  return (
    <div className={`registration-form ${className}`}>
      <div className="registration-form-header">
        <h2>Bergabung dengan Makalah AI</h2>
        <p>Buat akun untuk mengakses platform penulisan akademik dengan AI</p>
      </div>

      <form onSubmit={handleSubmit} className="registration-form-container">
        {/* Global Error Message */}
        {error && (
          <div className="error-message global-error">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Full Name Field */}
        <div className="form-field">
          <label htmlFor="fullName" className="form-label">
            Nama Lengkap <span className="required-asterisk">*</span>
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            value={formData.fullName}
            onChange={handleInputChange}
            className={`form-input ${validationErrors.fullName ? 'error' : ''}`}
            placeholder="Dr. Nama Lengkap Anda"
            autoComplete="name"
            required
          />
          
          {validationErrors.fullName && (
            <div className="field-error">
              <span className="error-icon">⚠️</span>
              <span>{validationErrors.fullName}</span>
            </div>
          )}
          
          {validationWarnings.fullName && (
            <div className="field-warning">
              <span className="warning-icon">💡</span>
              <span>{validationWarnings.fullName[0]}</span>
            </div>
          )}
        </div>

        {/* Email Field */}
        <div className="form-field">
          <label htmlFor="email" className="form-label">
            Email <span className="required-asterisk">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            className={`form-input ${validationErrors.email ? 'error' : ''}`}
            placeholder="nama@institusi.ac.id"
            autoComplete="email"
            required
          />
          
          {validationErrors.email && (
            <div className="field-error">
              <span className="error-icon">⚠️</span>
              <span>{validationErrors.email}</span>
            </div>
          )}
          
          {validationWarnings.email && (
            <div className="field-warning">
              <span className="warning-icon">💡</span>
              <span>{validationWarnings.email[0]}</span>
            </div>
          )}
        </div>

        {/* Institution Field */}
        <div className="form-field">
          <label htmlFor="institution" className="form-label">
            Institusi (Opsional)
          </label>
          <input
            id="institution"
            name="institution"
            type="text"
            value={formData.institution}
            onChange={handleInputChange}
            className={`form-input ${validationErrors.institution ? 'error' : ''}`}
            placeholder="Universitas Indonesia"
            autoComplete="organization"
          />
          
          {validationErrors.institution && (
            <div className="field-error">
              <span className="error-icon">⚠️</span>
              <span>{validationErrors.institution}</span>
            </div>
          )}
        </div>

        {/* Role Selection */}
        <div className="form-field">
          <label htmlFor="role" className="form-label">
            Role <span className="required-asterisk">*</span>
          </label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleInputChange}
            className={`form-input ${validationErrors.role ? 'error' : ''}`}
            required
          >
            <option value="student">Mahasiswa/Student</option>
            <option value="researcher">Peneliti/Researcher</option>
          </select>
          
          <div className="role-description">
            <span className="info-icon">ℹ️</span>
            <span>{getRoleDescription(formData.role)}</span>
          </div>
          
          {validationErrors.role && (
            <div className="field-error">
              <span className="error-icon">⚠️</span>
              <span>{validationErrors.role}</span>
            </div>
          )}
        </div>

        {/* Password Field */}
        <div className="form-field">
          <label htmlFor="password" className="form-label">
            Password <span className="required-asterisk">*</span>
          </label>
          <div className="password-input-container">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleInputChange}
              className={`form-input ${validationErrors.password ? 'error' : ''}`}
              placeholder="Minimal 8 karakter dengan kombinasi"
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
          
          {/* Password Strength Indicator */}
          {passwordStrength && (
            <div className="password-strength">
              <div className="strength-bar">
                <div 
                  className="strength-fill"
                  style={{ 
                    width: `${passwordStrength.score}%`,
                    backgroundColor: getPasswordStrengthColor(passwordStrength.level)
                  }}
                />
              </div>
              <div className="strength-info">
                <span 
                  className="strength-level"
                  style={{ color: getPasswordStrengthColor(passwordStrength.level) }}
                >
                  {passwordStrength.level === 'weak' && 'Lemah'}
                  {passwordStrength.level === 'fair' && 'Cukup'}
                  {passwordStrength.level === 'good' && 'Bagus'}
                  {passwordStrength.level === 'strong' && 'Kuat'}
                </span>
                <span className="strength-score">{passwordStrength.score}/100</span>
              </div>
            </div>
          )}
          
          {validationErrors.password && (
            <div className="field-error">
              <span className="error-icon">⚠️</span>
              <span>{validationErrors.password}</span>
            </div>
          )}
          
          {validationWarnings.password && (
            <div className="field-warning">
              <span className="warning-icon">💡</span>
              <span>{validationWarnings.password[0]}</span>
            </div>
          )}
        </div>

        {/* Confirm Password Field */}
        <div className="form-field">
          <label htmlFor="confirmPassword" className="form-label">
            Konfirmasi Password <span className="required-asterisk">*</span>
          </label>
          <div className="password-input-container">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className={`form-input ${validationErrors.confirmPassword ? 'error' : ''}`}
              placeholder="Ulangi password"
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? 'Sembunyikan password' : 'Tampilkan password'}
            >
              {showConfirmPassword ? '🙈' : '👁️'}
            </button>
          </div>
          
          {validationErrors.confirmPassword && (
            <div className="field-error">
              <span className="error-icon">⚠️</span>
              <span>{validationErrors.confirmPassword}</span>
            </div>
          )}
        </div>

        {/* Terms and Conditions */}
        <div className="form-field">
          <label className="checkbox-container">
            <input
              type="checkbox"
              name="acceptTerms"
              checked={formData.acceptTerms}
              onChange={handleInputChange}
              required
            />
            <span className="checkbox-checkmark"></span>
            <span className="checkbox-label">
              Saya menyetujui{' '}
              <a href="/terms" target="_blank" className="terms-link">
                Syarat dan Ketentuan
              </a>
              {' '}dan{' '}
              <a href="/privacy" target="_blank" className="terms-link">
                Kebijakan Privasi
              </a>
              <span className="required-asterisk">*</span>
            </span>
          </label>
          
          {validationErrors.acceptTerms && (
            <div className="field-error">
              <span className="error-icon">⚠️</span>
              <span>{validationErrors.acceptTerms}</span>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !formData.acceptTerms}
          className={`submit-button ${isLoading ? 'loading' : ''}`}
        >
          {isLoading ? (
            <>
              <span className="loading-spinner">⏳</span>
              <span>Sedang mendaftar...</span>
            </>
          ) : (
            <span>Daftar Sekarang</span>
          )}
        </button>

        {/* Login Link */}
        {showLoginLink && (
          <div className="login-link-container">
            <p>
              Sudah punya akun?{' '}
              <a href="/auth" className="login-link">
                Masuk di sini
              </a>
            </p>
          </div>
        )}
      </form>

    </div>
  );
}

// CSS-in-JS styles (you can move these to a separate CSS file)
const styles = `
.registration-form {
  max-width: 500px;
  margin: 0 auto;
  padding: 2rem;
}

.registration-form-header {
  text-align: center;
  margin-bottom: 2rem;
}

.registration-form-header h2 {
  font-size: 1.75rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--text-100);
}

.registration-form-header p {
  color: var(--text-200);
  font-size: 0.9rem;
}

.registration-form-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.role-description {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: var(--text-300);
  background-color: var(--bg-700);
  padding: 0.5rem;
  border-radius: 0.25rem;
}

.password-strength {
  margin-top: 0.5rem;
}

.strength-bar {
  height: 4px;
  background-color: #e5e7eb;
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 0.25rem;
}

.strength-fill {
  height: 100%;
  transition: width 0.3s ease, background-color 0.3s ease;
}

.strength-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
}

.strength-level {
  font-weight: 500;
}

.strength-score {
  color: #6b7280;
}

.checkbox-container {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.875rem;
  cursor: pointer;
  line-height: 1.4;
  color: var(--text-200);
}

.checkbox-container input[type="checkbox"] {
  margin: 0;
  margin-top: 0.1rem;
}

.terms-link {
  color: #3b82f6;
  text-decoration: underline;
}

.login-link-container {
  text-align: center;
  margin-top: 1rem;
  font-size: 0.875rem;
  color: var(--text-200);
}

.login-link {
  color: #3b82f6;
  text-decoration: none;
}

.login-link:hover {
  text-decoration: underline;
}


@media (max-width: 640px) {
  .registration-form {
    padding: 1rem;
  }
  
}
`;

// Inject styles (in a real app, you'd put this in a CSS file)
if (typeof document !== 'undefined' && !document.querySelector('#registration-form-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'registration-form-styles';
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}
