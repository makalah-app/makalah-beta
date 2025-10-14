'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import BrandLogo from '@/components/ui/BrandLogo';
import { Eye, EyeOff, Mail, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';

interface FormData {
  email: string;
  password: string;
  fullName?: string;
  confirmPassword?: string;
}

export default function AuthPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { login, register, isLoading, error, resendVerificationEmail } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [showResendOption, setShowResendOption] = useState(false);
  const [resendEmail, setResendEmail] = useState<string>('');
  const [resendMessage, setResendMessage] = useState<string>('');
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
    fullName: "",
    confirmPassword: ""
  });

  // Component mount check
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check URL params for tab
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'register') {
      setIsRegisterMode(true);
    }
  }, [searchParams]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (isRegisterMode) {
        if (formData.password !== formData.confirmPassword) {
          alert('Password tidak cocok');
          setIsSubmitting(false);
          return;
        }
        await register({
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName || '',
          role: 'user', // Default role untuk registrasi umum
        });
        // Show success message and redirect to login
        setSuccessMessage('Registrasi berhasil! Silakan cek email Anda untuk verifikasi akun, lalu login.');
        setShowResendOption(true);
        setResendEmail(formData.email);
        setIsRegisterMode(false);
        setFormData({ email: formData.email, password: '', fullName: '', confirmPassword: '' });
        setIsSubmitting(false);
      } else {
        await login({
          email: formData.email,
          password: formData.password,
          rememberMe,
        });

        // Clear success message on successful login
        setSuccessMessage('');

        // Get redirect URL from search params
        const redirectTo = searchParams.get('redirectTo');

        // Validate redirect URL for security (must be internal URL)
        const isValidRedirect = redirectTo &&
          (redirectTo.startsWith('/') && !redirectTo.startsWith('//')) &&
          !redirectTo.includes('../') &&
          !redirectTo.startsWith('/auth'); // Prevent redirect loop

        if (isValidRedirect) {
          router.push(redirectTo);
        } else {
          // Default behavior: redirect to chat
          router.push('/chat');
        }
        // Don't set isSubmitting(false) for login success - let redirect handle it
      }
    } catch (error: any) {
      // Check if error is due to unverified email
      if (!isRegisterMode && error?.message?.toLowerCase().includes('email not confirmed')) {
        setShowResendOption(true);
        setResendEmail(formData.email);
      }

      setIsSubmitting(false);
    }
  };

  const handleResendEmail = async () => {
    if (!resendEmail) return;

    setResendMessage('Mengirim ulang email verifikasi...');
    const success = await resendVerificationEmail(resendEmail);

    if (success) {
      setResendMessage('Email verifikasi telah dikirim ulang. Silakan cek inbox Anda.');
      setTimeout(() => {
        setResendMessage('');
      }, 5000);
    } else {
      setResendMessage('Gagal mengirim ulang email. Silakan coba lagi.');
    }
  };

  const toggleMode = () => {
    setIsRegisterMode(!isRegisterMode);
    setFormData({ email: '', password: '', fullName: '', confirmPassword: '' });
    setShowPassword(false);
    setShowConfirmPassword(false);
    setIsSubmitting(false);
    setSuccessMessage(''); // Clear success message when switching modes
    setShowResendOption(false);
    setResendEmail('');
    setResendMessage('');
  };

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  return (
    <div className="min-h-screen transition-colors duration-300 bg-background text-foreground">
      <section className="relative h-[100dvh] min-h-[100dvh] overflow-hidden hero-vivid hero-grid-thin flex items-center justify-center px-6 py-8">
        <div className="absolute inset-0 bg-black/20 pointer-events-none z-0" />

        <div className="w-full max-w-md max-h-[calc(100dvh-3rem)] overflow-auto relative z-10">
          <Card className="p-8 border-border bg-card shadow-lg">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
                  <BrandLogo variant="color" size="lg" priority />
                </Link>
              </div>
              <h1 className="text-xl font-medium mb-2 text-foreground font-heading">
                {isRegisterMode ? 'Daftar Akun Baru' : 'Masuk ke Akun'}
              </h1>
            </div>

            {/* Success Message */}
            {successMessage && !isRegisterMode && (
              <div className="mb-4 p-4 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded">
                <p className="text-sm text-success-800 dark:text-success-200 flex items-center gap-2 mb-2">
                  <span>✅</span>
                  <span>{successMessage}</span>
                </p>
                {showResendOption && (
                  <div className="mt-3 pt-3 border-t border-success-200 dark:border-success-800">
                    <p className="text-xs text-success-700 dark:text-success-300 mb-2">
                      Email tidak sampai? Cek folder spam atau kirim ulang.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleResendEmail}
                      disabled={isLoading || !!resendMessage}
                      className="text-xs"
                    >
                      {resendMessage || 'Kirim Ulang Email Verifikasi'}
                    </Button>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-ui-loose">
              {isRegisterMode && (
                <div className="space-ui-medium">
                  <Label htmlFor="fullName" className="text-sm font-medium text-foreground">
                    Nama Lengkap
                  </Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder="Masukkan nama lengkap"
                    disabled={isSubmitting || isLoading}
                    required
                  />
                </div>
              )}

              <div className="space-ui-medium">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="nama@email.com"
                    className="pl-10"
                    disabled={isSubmitting || isLoading}
                    required
                  />
                </div>
              </div>

              <div className="space-ui-medium">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Masukkan password"
                    className="pl-10 pr-10"
                    disabled={isSubmitting || isLoading}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 h-6 w-6"
                    disabled={isSubmitting || isLoading}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {isRegisterMode && (
                <div className="space-ui-medium">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                    Konfirmasi Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="Konfirmasi password"
                      className="pl-10 pr-10"
                      disabled={isSubmitting || isLoading}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 h-6 w-6"
                      disabled={isSubmitting || isLoading}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              )}

              {!isRegisterMode && (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                      disabled={isSubmitting || isLoading}
                    />
                    <Label htmlFor="remember" className="text-muted-foreground cursor-pointer">
                      Ingat saya
                    </Label>
                  </div>
                  <Link
                    href="/auth/forgot-password"
                    className="text-primary hover:text-primary/80 transition-colors hover:underline"
                  >
                    Lupa password?
                  </Link>
                </div>
              )}

              {error && (
                <div className="space-y-2">
                  <div className="text-sm text-destructive text-center">
                    {error}
                  </div>
                  {showResendOption && !successMessage && (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                      <p className="text-xs text-yellow-800 dark:text-yellow-200 mb-2">
                        Email belum terverifikasi. Cek inbox atau kirim ulang.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleResendEmail}
                        disabled={isLoading || !!resendMessage}
                        className="text-xs w-full"
                      >
                        {resendMessage || 'Kirim Ulang Email Verifikasi'}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isSubmitting || isLoading}
              >
                {(isSubmitting || isLoading) ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isRegisterMode ? 'Mendaftar...' : 'Memverifikasi...'}</span>
                  </div>
                ) : (
                  <span>{isRegisterMode ? 'Daftar' : 'Masuk'}</span>
                )}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-muted-foreground">
                {isRegisterMode ? 'Sudah punya akun?' : 'Belum punya akun?'}{" "}
                <Button
                  variant="link"
                  onClick={toggleMode}
                  className="h-auto p-0 font-medium"
                  disabled={isSubmitting || isLoading}
                >
                  {isRegisterMode ? 'Masuk sekarang' : 'Daftar sekarang'}
                </Button>
              </p>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
