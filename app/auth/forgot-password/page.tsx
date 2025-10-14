'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabaseClient } from '../../../src/lib/database/supabase-client';

export default function ForgotPasswordPage() {
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Component mount check
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError('Email diperlukan');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Use existing functional Supabase logic
      const redirectUrl = `${window.location.origin}/auth/reset-password`;

      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        setError(error.message);
      } else {
        setIsSubmitted(true);
      }
    } catch (err) {
      setError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) setError(''); // Clear error on input change
  };

  const handleResendEmail = () => {
    setIsSubmitted(false);
    setError('');
  };

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  return (
    <div className="min-h-screen transition-colors duration-300 bg-background text-foreground">
      <section className="relative h-[100dvh] min-h-[100dvh] overflow-hidden hero-vivid hero-grid-thin flex items-center justify-center px-6 py-8">
        <div className="absolute inset-0 bg-black/20 pointer-events-none z-0" />

        <div className="w-full max-w-md max-h-[calc(100dvh-3rem)] overflow-auto relative z-10">
          <Card className="p-6 border-border bg-card shadow-lg">
            <div className="text-center mb-6">
              <div className="flex justify-center mb-3">
                <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
                  <BrandLogo variant="color" size="sm" priority />
                </Link>
              </div>
              <h1 className="text-3xl font-medium mb-2 text-foreground font-heading">
                {isSubmitted ? 'Email Terkirim' : 'Lupa Password'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isSubmitted
                  ? 'Kami telah mengirim link reset password ke email Anda'
                  : 'Masukkan email untuk mendapatkan link reset password'}
              </p>
            </div>

            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="space-ui-loose">
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
                      value={email}
                      onChange={handleInputChange}
                      placeholder="nama@email.com"
                      className="pl-10"
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="text-sm text-destructive text-center">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Mengirim...</span>
                    </div>
                  ) : (
                    <span>Kirim Link Reset</span>
                  )}
                </Button>
              </form>
            ) : (
              <div className="space-ui-loose">
                <div className="text-center space-ui-medium">
                  <div className="w-16 h-16 mx-auto rounded bg-success-100 dark:bg-success-900/20 flex items-center justify-center">
                    <Mail className="w-8 h-8 text-success-600 dark:text-success-400" />
                  </div>
                  <div className="space-ui-medium">
                    <p className="text-sm text-muted-foreground">
                      Periksa inbox email <span className="font-medium text-foreground">{email}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Tidak menerima email? Periksa folder spam atau coba kirim ulang
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleResendEmail}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  Kirim Ulang
                </Button>
              </div>
            )}

            <div className="mt-6 text-center">
              <Link
                href="/auth"
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors hover:underline"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Kembali ke halaman masuk
              </Link>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
import BrandLogo from '@/components/ui/BrandLogo';
