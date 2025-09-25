'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseClient } from '../../../src/lib/database/supabase-client';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [sessionValid, setSessionValid] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    let mounted = true;

    const handlePasswordRecovery = async () => {
      console.log('Starting password recovery - simple approach');
      console.log('URL:', window.location.href);
      
      // Let Supabase handle magic link processing with onAuthStateChange
      const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
        async (event, session) => {
          if (!mounted) return;
          
          console.log('Auth event:', event, 'Session:', !!session);
          
          if (event === 'PASSWORD_RECOVERY') {
            console.log('PASSWORD_RECOVERY event - ready to reset password');
            setError('');
            setSessionValid(true);
            setAuthLoading(false);
            
            // Clean URL
            window.history.replaceState({}, '', window.location.pathname);
          } else if (event === 'SIGNED_IN' && session) {
            console.log('SIGNED_IN event with session');
            setError('');
            setSessionValid(true);
            setAuthLoading(false);
            
            // Clean URL
            window.history.replaceState({}, '', window.location.pathname);
          } else if (event === 'SIGNED_OUT') {
            console.log('SIGNED_OUT event');
            setSessionValid(false);
            setAuthLoading(false);
            setError('Session expired. Please request a new password reset.');
          }
        }
      );

      // Check current session
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session) {
        console.log('Existing valid session found');
        setSessionValid(true);
        setError('');
        setAuthLoading(false);
      } else {
        // No session yet - wait for magic link processing or timeout
        setTimeout(() => {
          if (!mounted) return;
          
          supabaseClient.auth.getSession().then(({ data: { session } }) => {
            if (session) {
              setSessionValid(true);
              setError('');
            } else {
              setSessionValid(false);
              setError('Invalid or expired reset link. Please request a new password reset.');
            }
            setAuthLoading(false);
          });
        }, 2000); // Give 2 seconds for magic link processing
      }

      return () => {
        subscription.unsubscribe();
      };
    };

    handlePasswordRecovery();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      setError('Both password fields are required');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { error } = await supabaseClient.auth.updateUser({
        password: password
      });

      if (error) {
        setError(error.message);
      } else {
        setMessage('Password updated successfully! Please login with your new password...');
        
        // SECURITY: Sign out user to force fresh login with new password
        setTimeout(async () => {
          console.log('Signing out user to force fresh login...');
          await supabaseClient.auth.signOut();
          
          // Redirect to login page
          window.location.href = '/auth?message=password-updated';
        }, 2000);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Set New Password</h1>
      
      {/* Loading State */}
      {authLoading && (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p>Verifying reset link...</p>
          <div>⏳ Please wait...</div>
        </div>
      )}
      
      {/* Error State */}
      {!authLoading && error && (
        <div style={{color: 'red', marginBottom: '20px'}}>
          {error}
          <div style={{ marginTop: '10px' }}>
            <a href="/auth/forgot-password">Request new reset link</a>
          </div>
        </div>
      )}
      
      {/* Reset Form - only show if session is valid */}
      {!authLoading && sessionValid && (
        <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="password">New Password:</label>
          <div style={{display: 'flex', alignItems: 'center'}}>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
              required
              style={{flex: 1}}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{marginLeft: '8px', background: 'none', border: 'none', cursor: 'pointer'}}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </div>
        
        <div>
          <label htmlFor="confirmPassword">Confirm Password:</label>
          <div style={{display: 'flex', alignItems: 'center'}}>
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              style={{flex: 1}}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              style={{marginLeft: '8px', background: 'none', border: 'none', cursor: 'pointer'}}
            >
              {showConfirmPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </div>
        
        <button type="submit" disabled={loading}>
          {loading ? 'Updating...' : 'Update Password'}
        </button>
        
        {/* Success/Error Messages within form */}
        {message && <div style={{color: 'green', marginTop: '10px'}}>{message}</div>}
      </form>
      )}
      
      {/* Back to Login - always show */}
      {!authLoading && (
        <div style={{ marginTop: '20px' }}>
          <a href="/auth">Back to Login</a>
        </div>
      )}
    </div>
  );
}