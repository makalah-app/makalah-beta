"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import BrandLogo from '@/components/ui/BrandLogo';
import { Mail, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

function isValidEmail(email: string) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

export default function WaitingListCard() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    const trimmed = email.trim();
    if (!isValidEmail(trimmed)) {
      setError('Format email kurang tepat.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/waiting-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, website: '' }) // website: honeypot
      });

      if (res.status === 201) {
        setMessage('Email kamu masuk daftar tunggu. Makasih!');
        setEmail('');
        // Redirect ke home setelah menampilkan notifikasi singkat
        setTimeout(() => {
          router.push('/?waitlist=success');
        }, 1600);
      } else {
        const data = await res.json().catch(() => ({} as any));
        const msg = data?.error?.message || (res.status === 409 ? 'Email sudah terdaftar di daftar tunggu.' : 'Lagi gangguan, coba lagi ya.');
        setError(msg);
      }
    } catch {
      setError('Lagi gangguan, coba lagi ya.');
    } finally {
      setIsSubmitting(false);
    }
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
              <h1 className="text-xl font-medium mb-2 text-foreground font-heading">Daftar Tunggu</h1>
              <p className="text-sm text-muted-foreground">Masukkan email untuk ikut uji coba</p>
            </div>

            {message && (
              <Alert className="mb-6 border-white/20 bg-white/10 backdrop-blur-sm text-white">
                <div className="mx-auto flex w-fit items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-white/90" aria-hidden="true" />
                  <AlertDescription className="text-white/90 text-sm">
                    {message}
                  </AlertDescription>
                </div>
              </Alert>
            )}

            {error && (
              <Alert className="mb-6 border-white bg-destructive backdrop-blur-sm text-white">
                <div className="mx-auto flex w-fit items-center gap-3">
                  <XCircle className="h-5 w-5 text-white/90" aria-hidden="true" />
                  <AlertDescription className="text-white/90 text-sm">
                    {error}
                  </AlertDescription>
                </div>
              </Alert>
            )}

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
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="pl-10"
                    disabled={isSubmitting}
                    required
                  />
                </div>
                {/* Honeypot */}
                <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Mendaftar...</span>
                ) : (
                  <span>Daftar</span>
                )}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-muted-foreground">
                Sudah punya akun?{" "}
                <Button asChild variant="link" className="h-auto p-0 font-medium">
                  <Link href="/auth">Masuk sekarang</Link>
                </Button>
              </p>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
