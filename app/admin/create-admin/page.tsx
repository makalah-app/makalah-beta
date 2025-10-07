'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminAccess from '@/components/auth/AdminAccess';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Check, Loader2, UserPlus } from 'lucide-react';
import { validatePassword, validatePasswordConfirmation } from '@/lib/auth/form-validation';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  institution: string;
}

function CreateAdminContent() {
  const router = useRouter();
  const { session } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    institution: ''
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    title: string;
    description?: string;
  } | null>(null);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email diperlukan';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Format email tidak valid';
    }

    // Password validation
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.error;
    }

    // Confirm password validation
    const confirmPasswordValidation = validatePasswordConfirmation(
      formData.password,
      formData.confirmPassword
    );
    if (!confirmPasswordValidation.isValid) {
      newErrors.confirmPassword = confirmPasswordValidation.error;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!validateForm()) {
      return;
    }

    if (!session?.accessToken) {
      setFeedback({
        type: 'error',
        title: 'Unauthorized',
        description: 'Sesi Anda telah berakhir. Silakan login kembali.'
      });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/admin/users/create-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName || undefined,
          institution: formData.institution || undefined
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Gagal membuat admin');
      }

      setFeedback({
        type: 'success',
        title: 'Admin berhasil dibuat',
        description: `Email verifikasi telah dikirim ke ${formData.email}`
      });

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/admin/users/details');
      }, 2000);
    } catch (err) {
      setFeedback({
        type: 'error',
        title: 'Gagal membuat admin',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Buat Admin Baru</h1>
        <p className="text-sm text-muted-foreground">
          Tambahkan administrator baru ke sistem. Email verifikasi akan dikirim otomatis.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Form Pembuatan Admin</CardTitle>
          <CardDescription>
            Lengkapi data di bawah untuk membuat akun admin baru.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {feedback && (
              <Alert variant={feedback.type === 'success' ? 'default' : 'destructive'}>
                {feedback.type === 'success' ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                <AlertTitle>{feedback.title}</AlertTitle>
                {feedback.description && (
                  <AlertDescription>{feedback.description}</AlertDescription>
                )}
              </Alert>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  disabled={submitting}
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  Password <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimal 8 karakter dengan karakter khusus"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  disabled={submitting}
                  className={errors.password ? 'border-destructive' : ''}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Password harus minimal 8 karakter dan mengandung karakter khusus (!@#$%^&* dll)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  Konfirmasi Password <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Ulangi password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  disabled={submitting}
                  className={errors.confirmPassword ? 'border-destructive' : ''}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Nama Lengkap</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe (opsional)"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="institution">Institusi</Label>
                <Input
                  id="institution"
                  type="text"
                  placeholder="Nama institusi (opsional)"
                  value={formData.institution}
                  onChange={(e) => handleInputChange('institution', e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/admin/users/details')}
                disabled={submitting}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Membuat Admin...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Buat Admin
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CreateAdminPage() {
  return (
    <AdminAccess requiredPermissions={['admin.users.promote']}>
      <CreateAdminContent />
    </AdminAccess>
  );
}
