'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import BrandLogo from '@/components/ui/BrandLogo';
import { Eye, EyeOff, Mail, Lock, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/lib/auth/role-permissions';
import { debugLog } from '@/lib/utils/debug-log';

interface Slide1Data {
  email: string;
  password: string;
  confirmPassword: string;
}

interface Slide2Data {
  firstName: string;
  lastName: string;
  predikat: string;
}

interface FormData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  predikat?: string;
  confirmPassword?: string;
}

export default function AuthPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { login, register, isLoading, error, resendVerificationEmail, clearError } = useAuth();
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
  const [notRegisteredNotice, setNotRegisteredNotice] = useState<boolean>(false);
  const [currentSlide, setCurrentSlide] = useState(1);
  const [slide1Data, setSlide1Data] = useState<Slide1Data>({
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [slide2Data, setSlide2Data] = useState<Slide2Data>({
    firstName: "",
    lastName: "",
    predikat: ""
  });
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    predikat: "",
    confirmPassword: ""
  });

  // Log render/interactive states to trace "Memverifikasi" freeze
  useEffect(() => {
    try {
      debugLog('ui:auth', 'state', {
        isLoading,
        isSubmitting,
        isRegisterMode,
        hasError: !!error,
      });
    } catch {}
  }, [isLoading, isSubmitting, isRegisterMode, error]);

  // Dev-only watchdog: if UI stuck disabled too long, release local submitting flag for debugging
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    if (!(isLoading || isSubmitting)) return;
    const id = setTimeout(() => {
      try { debugLog('ui:auth', 'watchdog', { action: 'release-submitting' }); } catch {}
      setIsSubmitting(false);
    }, 10000);
    return () => clearTimeout(id);
  }, [isLoading, isSubmitting]);

  // Component mount check
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check URL params for tab and email verification
  useEffect(() => {
    const tab = searchParams.get('tab');
    const verified = searchParams.get('verified');

    if (tab === 'register') {
      setIsRegisterMode(true);
    }

    // Handle email verification - show success message but don't auto-login
    if (verified === 'true') {
      setSuccessMessage('Email Anda telah berhasil diverifikasi! Silakan login dengan kredensial Anda.');
      setIsRegisterMode(false); // Switch to login mode
    }
  }, [searchParams]);

  // Jika ada error/notRegistered, sembunyikan banner sukses agar tidak redundan
  useEffect(() => {
    if (!isRegisterMode && (error || notRegisteredNotice)) {
      setSuccessMessage('');
    }
  }, [error, notRegisteredNotice, isRegisterMode]);

  // Tampilkan notifikasi jika error dari useAuth menunjukkan akun tidak ditemukan/nonaktif
  useEffect(() => {
    const msg = (error || '').toLowerCase();
    const trigger = !isRegisterMode && (
      msg.includes('account not found') ||
      msg.includes('not found or disabled') ||
      msg.includes('disabled')
    );
    setNotRegisteredNotice(trigger);
  }, [error, isRegisterMode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (isRegisterMode) {
      if (currentSlide === 1) {
        setSlide1Data({
          ...slide1Data,
          [e.target.name]: e.target.value,
        });
      } else {
        setSlide2Data({
          ...slide2Data,
          [e.target.name]: e.target.value,
        });
      }
    }

    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

    // Clear previous auth error/notice while user typing
    try { clearError?.(); } catch {}
    setNotRegisteredNotice(false);
  };

  const validateSlide1 = () => {
    const { email, password, confirmPassword } = slide1Data;

    if (!email || !password || !confirmPassword) {
      alert('Semua field di slide 1 harus diisi');
      return false;
    }

    if (password !== confirmPassword) {
      alert('Password tidak cocok');
      return false;
    }

    if (password.length < 6) {
      alert('Password minimal 6 karakter');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('Format email tidak valid');
      return false;
    }

    return true;
  };

  const validateSlide2 = () => {
    const { firstName, lastName, predikat } = slide2Data;

    if (!firstName || !lastName || !predikat) {
      alert('Semua field di slide 2 harus diisi');
      return false;
    }

    return true;
  };

  
  const isSlide1Valid = () => {
    const { email, password, confirmPassword } = slide1Data;

    // Check if all fields are filled
    if (!email || !password || !confirmPassword) {
      return false;
    }

    // Check email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return false;
    }

    // Check password minimum length
    if (password.length < 6) {
      return false;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      return false;
    }

    return true;
  };

  const handlePreviousSlide = () => {
    setCurrentSlide(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    debugLog('ui:auth', 'submit-start', { isRegisterMode });

    let success = false;

    try {
      if (isRegisterMode) {
        // For registration, handle based on current slide
        if (currentSlide === 1) {
          // Validate slide 1 and move to slide 2
          if (validateSlide1()) {
            setCurrentSlide(2);
          } else {
            success = false; // Validation failed
          }
          return;
        } else {
          // Slide 2 - complete registration
          if (!validateSlide2()) {
            success = false; // Validation failed
            return;
          }

          const combinedData = {
            email: slide1Data.email,
            password: slide1Data.password,
            firstName: slide2Data.firstName,
            lastName: slide2Data.lastName,
            predikat: slide2Data.predikat,
            role: 'user' as UserRole, // Default role untuk registrasi umum
          };

          await register(combinedData);
          success = true; // Mark registration as successful
          // Show success message and redirect to login
          setSuccessMessage('Registrasi berhasil! Silakan cek email Anda untuk verifikasi akun, lalu login.');
          setShowResendOption(true);
          setResendEmail(slide1Data.email);
          setIsRegisterMode(false);
          setFormData({ email: slide1Data.email, password: '', firstName: '', lastName: '', predikat: '', confirmPassword: '' });
          // Reset slide data
          setSlide1Data({ email: "", password: "", confirmPassword: "" });
          setSlide2Data({ firstName: "", lastName: "", predikat: "" });
          setCurrentSlide(1);
        }
      } else {
        success = await login({
          email: formData.email,
          password: formData.password,
          rememberMe,
          redirectTo: '/chat' // Default redirect for auth page login
        });

        if (success) {
          debugLog('ui:auth', 'login-success');
          setSuccessMessage('');

          // Get redirect URL from search params
          const redirectTo = searchParams.get('redirectTo');

          // Validate redirect URL for security (must be internal URL)
          const isValidRedirect = redirectTo &&
            (redirectTo.startsWith('/') && !redirectTo.startsWith('//')) &&
            !redirectTo.includes('../') &&
            !redirectTo.startsWith('/auth'); // Prevent redirect loop

          // Add delay for smooth UX transition before redirect
          setTimeout(() => {
            if (isValidRedirect) {
              router.push(redirectTo);
            } else {
              // Default behavior: redirect to chat
              router.push('/chat');
            }
          }, 300); // 300ms delay for smooth UX

          return; // Prevent finally block from resetting isSubmitting for successful login
        } else {
          debugLog('ui:auth', 'login-failed');
          success = false; // Login failed
          // Stay on page; error message displayed by useAuth state
          return;
        }
      }
    } catch (error: any) {
      success = false; // Exception occurred
      debugLog('ui:auth', 'submit-exception', { message: error?.message });
      // Check if error is due to unverified email
      if (!isRegisterMode && error?.message?.toLowerCase().includes('email not confirmed')) {
        setShowResendOption(true);
        setResendEmail(formData.email);
      }
    } finally {
      // Only reset isSubmitting for failed login or registration
      // For successful login, let redirect handle state cleanup
      if (isRegisterMode || !success) {
        setIsSubmitting(false);
      }
      debugLog('ui:auth', 'submit-finally');
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
    setCurrentSlide(1); // Reset to slide 1
    setSlide1Data({ email: "", password: "", confirmPassword: "" });
    setSlide2Data({ firstName: "", lastName: "", predikat: "" });
    setFormData({ email: '', password: '', firstName: '', lastName: '', predikat: '', confirmPassword: '' });
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
                  <BrandLogo variant="white" size="lg" priority />
                </Link>
              </div>
              <h1 className="text-xl font-medium mb-2 text-foreground font-heading">
                {isRegisterMode ? 'Daftar Akun Baru' : 'Masuk ke Akun'}
              </h1>
            </div>

            {/* Success Message */}
            {successMessage && !isRegisterMode && !error && !notRegisteredNotice && (
              <Alert className="mb-6 border-white/20 bg-white/10 backdrop-blur-sm text-white">
                <div className="mx-auto flex w-fit items-center gap-4">
                  <CheckCircle2 className="h-6 w-6 text-white/90" aria-hidden="true" />
                  <div className="text-left">
                    <AlertDescription className="text-white/90 text-sm mt-1">
                      Email Anda telah berhasil diverifikasi! <br />
                      Silakan login dengan kredensial Anda.
                      {showResendOption && (
                        <div className="mt-3 space-y-2">
                          <p className="text-sm text-white/80">
                            Email tidak sampai? Cek folder spam atau kirim ulang.
                          </p>
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleResendEmail}
                              disabled={isLoading}
                              className="border-white/30 text-white/90 hover:bg-white/10 hover:text-white"
                            >
                              Kirim Ulang Email Verifikasi
                            </Button>
                            {resendMessage && (
                              <p className="text-sm text-white/80">
                                {resendMessage}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            )}

            {/* Notifikasi akun tidak terdaftar/nonaktif */}
            {notRegisteredNotice && !isRegisterMode && (
              <Alert className="mb-6 border-white/20 bg-white/10 backdrop-blur-sm text-white">
                <div className="mx-auto flex w-fit items-center gap-4">
                  <XCircle className="h-6 w-6 text-white/90" aria-hidden="true" />
                  <div className="text-left">
                    <AlertDescription className="text-white/90 text-sm mt-1">
                      Email yang Anda masukkan belum terdaftar atau akun nonaktif. Silakan daftar baru.
                      <div className="mt-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => router.push('/auth?tab=register')}
                          disabled={isLoading}
                          className="border-white/30 text-white/90 hover:bg-white/10 hover:text-white"
                        >
                          Daftar Sekarang
                        </Button>
                      </div>
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            )}

            {/* Notifikasi error umum (contoh: Invalid login credentials) */}
            {!isRegisterMode && !notRegisteredNotice && !!error && (
              <Alert className="mb-6 border-white bg-destructive backdrop-blur-sm text-white">
                <div className="mx-auto flex w-fit items-center gap-4">
                  <XCircle className="h-6 w-6 text-white/90" aria-hidden="true" />
                  <div className="text-left">
                    <AlertDescription className="text-white/90 text-sm mt-1">
                      {error}
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-ui-loose">
              {/* Login Form - Unchanged */}
              {!isRegisterMode && (
                <>
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

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={isSubmitting || isLoading}
                  >
                    {(isSubmitting || isLoading) ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Memverifikasi...</span>
                      </div>
                    ) : (
                      <span>Masuk</span>
                    )}
                  </Button>
                </>
              )}

              {/* Registration Form - 2 Slides */}
              {isRegisterMode && (
                <>
                  {/* Slide 1: Account Credentials */}
                  {currentSlide === 1 && (
                    <div className="space-ui-loose">
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
                            value={slide1Data.email}
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
                            value={slide1Data.password}
                            onChange={handleInputChange}
                            placeholder="Minimal 6 karakter"
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
                            value={slide1Data.confirmPassword}
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

                      <Button
                        type="submit"
                        className="w-full"
                        size="lg"
                        disabled={isSubmitting || isLoading || !isSlide1Valid()}
                      >
                        {(isSubmitting || isLoading) ? (
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Memvalidasi...</span>
                          </div>
                        ) : (
                          <span>Selanjutnya →</span>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Slide 2: Personal Information */}
                  {currentSlide === 2 && (
                    <div className="space-ui-loose">
                      <div className="space-ui-medium">
                        <Label htmlFor="firstName" className="text-sm font-medium text-foreground">
                          Nama Depan
                        </Label>
                        <Input
                          id="firstName"
                          name="firstName"
                          type="text"
                          value={slide2Data.firstName}
                          onChange={handleInputChange}
                          placeholder="Masukkan nama depan"
                          disabled={isSubmitting || isLoading}
                          required
                        />
                      </div>

                      <div className="space-ui-medium">
                        <Label htmlFor="lastName" className="text-sm font-medium text-foreground">
                          Nama Belakang
                        </Label>
                        <Input
                          id="lastName"
                          name="lastName"
                          type="text"
                          value={slide2Data.lastName}
                          onChange={handleInputChange}
                          placeholder="Masukkan nama belakang"
                          disabled={isSubmitting || isLoading}
                          required
                        />
                      </div>

                      <div className="space-ui-medium">
                        <Label htmlFor="predikat" className="text-sm font-medium text-foreground">
                          Predikat
                        </Label>
                        <select
                          id="predikat"
                          name="predikat"
                          value={slide2Data.predikat || ''}
                          onChange={handleInputChange}
                          disabled={isSubmitting || isLoading}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="">Pilih predikat</option>
                          <option value="Mahasiswa">Mahasiswa</option>
                          <option value="Peneliti">Peneliti</option>
                        </select>
                      </div>

                      <Button
                        type="submit"
                        className="w-full"
                        size="lg"
                        disabled={isSubmitting || isLoading}
                      >
                        {(isSubmitting || isLoading) ? (
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Mendaftar...</span>
                          </div>
                        ) : (
                          <span>Daftar Akun</span>
                        )}
                      </Button>
                    </div>
                  )}
                </>
              )}

              {(showResendOption && !successMessage) && (
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
            </form>

            <div className="mt-8 text-center">
              {isRegisterMode && currentSlide === 2 && (
                <div className="flex items-center justify-center gap-4 text-sm">
                  <Button
                    variant="link"
                    onClick={handlePreviousSlide}
                    className="h-auto p-0 font-medium text-muted-foreground hover:text-foreground"
                    disabled={isSubmitting || isLoading}
                  >
                    ← Kembali
                  </Button>
                  <span className="text-muted-foreground">|</span>
                  <span className="text-muted-foreground">
                    Sudah punya akun?{" "}
                    <Button
                      variant="link"
                      onClick={toggleMode}
                      className="h-auto p-0 font-medium"
                      disabled={isSubmitting || isLoading}
                    >
                      Masuk sekarang
                    </Button>
                  </span>
                </div>
              )}

              {/*
                Disembunyikan sesuai instruksi:
                "Belum punya akun? Daftar sekarang"
                (link pendaftaran di-card login)
              */}
              {isRegisterMode && (
                <p className="text-sm text-muted-foreground">
                  {'Sudah punya akun?'}{" "}
                  <Button
                    variant="link"
                    onClick={toggleMode}
                    className="h-auto p-0 font-medium"
                    disabled={isSubmitting || isLoading}
                  >
                    {'Masuk sekarang'}
                  </Button>
                </p>
              )}
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
