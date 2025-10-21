'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Palette, MonitorSmartphone } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/components/theme/ThemeProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

type ThemeChoice = 'light' | 'dark';

export default function PreferencesPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const { theme, setTheme } = useTheme();

  const [selectedTheme, setSelectedTheme] = useState<ThemeChoice>('dark');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (theme === 'light' || theme === 'dark') {
      setSelectedTheme(theme);
    } else {
      setSelectedTheme('dark');
    }
  }, [theme]);

  const isDarkMode = selectedTheme === 'dark';
  const activeThemeLabel = isDarkMode ? 'gelap' : 'terang';

  const handleThemeChange = (value: ThemeChoice) => {
    setSelectedTheme(value);
    setTheme(value);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
          <p className="text-sm text-muted-foreground">Memuat preferensi...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Mengalihkan ke halaman masuk...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start gap-3">
        <Palette className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Preferensi</h1>
          <p className="text-muted-foreground">Sesuaikan tampilan dan pengalaman aplikasi</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Preferensi Tampilan</CardTitle>
          <CardDescription>Pilih tema yang sesuai dengan preferensi Anda</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded border border-border/70 bg-card/50 px-4 py-3">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-foreground">Mode gelap</span>
              <span className="text-xs text-muted-foreground">
                Aktifkan untuk fokus malam atau matikan untuk tampilan terang.
              </span>
            </div>
            <Switch
              checked={isDarkMode}
              onCheckedChange={(checked) => {
                const nextTheme: ThemeChoice = checked ? 'dark' : 'light';
                setSelectedTheme(nextTheme);
                setTheme(nextTheme);
              }}
              aria-label={isDarkMode ? 'Ubah ke mode terang' : 'Ubah ke mode gelap'}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="theme-select" className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-muted-foreground" />
              Mode Warna
            </Label>
            <Select value={selectedTheme} onValueChange={(value) => handleThemeChange(value as ThemeChoice)}>
              <SelectTrigger id="theme-select" className="w-full">
                <SelectValue placeholder="Pilih tema" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Tema Terang</SelectItem>
                <SelectItem value="dark">Tema Gelap</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between rounded border border-dashed border-border/60 bg-muted/30 px-3 py-2">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">Tema aktif</span>
                <span className="text-xs text-muted-foreground">
                  {`Sedang memakai mode ${activeThemeLabel}.`}
                </span>
              </div>
              <MonitorSmartphone className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
