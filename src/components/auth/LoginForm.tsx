/**
 * Login Form Component
 * 
 * Provides user authentication interface with JWT integration,
 * role detection, and comprehensive form validation.
 * 
 * Features:
 * - Email/password authentication with validation
 * - JWT token handling with role information
 * - Remember me functionality with persistence
 * - Error handling with user-friendly messages
 * - Academic domain preference suggestions
 * - Loading states and form submission handling
 */

'use client';

import React, { useState, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { validateLoginForm, LoginFormData } from '../../lib/auth/form-validation';

export interface LoginFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  redirectTo?: string;
  showRegisterLink?: boolean;
  className?: string;
}

export default function LoginForm({
  onSuccess,
  onError,
  redirectTo,
  showRegisterLink = true,
  className = ''
}: LoginFormProps) {
  const { login, isLoading, error, clearError } = useAuth();

  // Form state
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [validationWarnings, setValidationWarnings] = useState<Record<string, string[]>>({});
  const [showPassword, setShowPassword] = useState(false);

  /**
   * Handle form input changes
   */
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
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
    const validation = validateLoginForm(formData);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      setValidationWarnings(validation.warnings);
      return;
    }

    try {
      const success = await login(formData);
      
      if (success) {
        onSuccess?.();
        
        // Redirect if specified
        if (redirectTo) {
          window.location.href = redirectTo;
        }
      } else {
        // Error handling is managed by useAuth hook
        onError?.(error || 'Login gagal');
      }
    } catch (loginError) {
      const errorMessage = loginError instanceof Error ? loginError.message : 'Login error occurred';
      onError?.(errorMessage);
    }
  }, [formData, login, onSuccess, onError, redirectTo, error, clearError]);

  /**
   * Handle forgot password
   */
  const handleForgotPassword = useCallback(() => {
    window.location.href = '/auth/forgot-password';
  }, []);

  return (
    <div className={`login-form ${className}`}>
      <div className="login-form-header">
        <h2>Masuk ke Makalah AI</h2>
        <p>Masuk untuk mengakses platform penulisan akademik AI</p>
      </div>

      <form onSubmit={handleSubmit} className="login-form-container">
        {/* Global Error Message dibuang: ditangani oleh banner di halaman Auth */}

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
          
          {/* Email Validation Error */}
          {validationErrors.email && (
            <div className="field-error">
              <span className="error-icon">⚠️</span>
              <span>{validationErrors.email}</span>
            </div>
          )}
          
          {/* Email Validation Warning */}
          {validationWarnings.email && (
            <div className="field-warning">
              <span className="warning-icon">💡</span>
              <span>{validationWarnings.email[0]}</span>
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
              placeholder="Masukkan password"
              autoComplete="current-password"
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
          
          {/* Password Validation Error */}
          {validationErrors.password && (
            <div className="field-error">
              <span className="error-icon">⚠️</span>
              <span>{validationErrors.password}</span>
            </div>
          )}
          
          {/* Password Validation Warning */}
          {validationWarnings.password && (
            <div className="field-warning">
              <span className="warning-icon">💡</span>
              <span>{validationWarnings.password[0]}</span>
            </div>
          )}
        </div>

        {/* Remember Me and Forgot Password */}
        <div className="form-row">
          <label className="checkbox-container">
            <input
              type="checkbox"
              name="rememberMe"
              checked={formData.rememberMe}
              onChange={handleInputChange}
            />
            <span className="checkbox-checkmark"></span>
            <span className="checkbox-label">Ingat saya</span>
          </label>
          
          <button
            type="button"
            className="forgot-password-link"
            onClick={handleForgotPassword}
          >
            Lupa password?
          </button>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className={`submit-button ${isLoading ? 'loading' : ''}`}
        >
          {isLoading ? (
            <>
              <span className="loading-spinner">⏳</span>
              <span>Sedang masuk...</span>
            </>
          ) : (
            <span>Masuk</span>
          )}
        </button>

        {/* Register Link */}
        {false && showRegisterLink && (
          <div className="register-link-container">
            <p>
              {/* Belum punya akun? <a href="/auth?tab=register" className="register-link">Daftar sekarang</a> */}
            </p>
          </div>
        )}
      </form>

    </div>
  );
}

// CSS-in-JS styles (you can move these to a separate CSS file)
const styles = `
.login-form {
  max-width: 400px;
  margin: 0 auto;
  padding: 2rem;
}

.login-form-header {
  text-align: center;
  margin-bottom: 2rem;
}

.login-form-header h2 {
  font-size: 1.75rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--text-100);
}

.login-form-header p {
  color: var(--text-200);
  font-size: 0.9rem;
}

.login-form-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-weight: 500;
  color: var(--text-200);
  font-size: 0.875rem;
}

.required-asterisk {
  color: #ef4444;
}

.form-input {
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-input.error {
  border-color: #ef4444;
}

.password-input-container {
  position: relative;
}

.password-toggle {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  color: #dc2626;
}

.field-error {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8rem;
  color: #dc2626;
}

.field-warning {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8rem;
  color: #d97706;
}

.form-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.checkbox-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  cursor: pointer;
  color: var(--text-200);
}

.checkbox-container input[type="checkbox"] {
  margin: 0;
}

.forgot-password-link {
  background: none;
  border: none;
  color: #3b82f6;
  font-size: 0.875rem;
  cursor: pointer;
  text-decoration: underline;
}

.submit-button {
  padding: 0.75rem;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
}

.submit-button:hover:not(:disabled) {
  background-color: #2563eb;
}

.submit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.register-link-container {
  text-align: center;
  margin-top: 1rem;
  font-size: 0.875rem;
  color: var(--text-200);
}

.register-link {
  color: #3b82f6;
  text-decoration: none;
}

.register-link:hover {
  text-decoration: underline;
}


@media (max-width: 640px) {
  .login-form {
    padding: 1rem;
  }
  
  .form-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}
`;

// Inject styles (in a real app, you'd put this in a CSS file)
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}
