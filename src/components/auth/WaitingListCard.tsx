"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import BrandLogo from '@/components/ui/BrandLogo';

function isValidEmail(email: string) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

export default function WaitingListCard() {
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
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] px-6 py-12">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-6">
            <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
              <BrandLogo variant="white" size="sm" />
            </Link>
          </div>
          <Card className="p-8 border-border bg-card shadow-lg">
            <h1 className="text-xl font-medium mb-2 text-foreground font-heading">Daftar Tunggu</h1>
            <p className="text-sm text-muted-foreground mb-6">Masukkan email</p>

            {message && (
              <div className="mb-4 text-sm p-3 rounded border border-green-300 text-green-700 bg-green-50">
                {message}
              </div>
            )}
            {error && (
              <div className="mb-4 text-sm p-3 rounded border border-red-300 text-red-700 bg-red-50">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  disabled={isSubmitting}
                  required
                />
                {/* Honeypot */}
                <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                {isSubmitting ? 'Mendaftar...' : 'Daftar'}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              <span>Sudah punya akun? </span>
              <Link href="/auth" className="font-medium text-primary hover:underline">Masuk</Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

