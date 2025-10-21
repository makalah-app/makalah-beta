import './globals.css';
import { Inter, Nunito_Sans, JetBrains_Mono, Victor_Mono } from 'next/font/google';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import LogoLoadingSpinner from '@/components/ui/LogoLoadingSpinner';

const AppProviders = dynamic(() => import('./providers-client'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-8 h-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Memuat aplikasi...</p>
      </div>
    </div>
  ),
});

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const nunitoSans = Nunito_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-heading',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

// Global hero/primary heading font (h1-h2)
const victorMono = Victor_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-hero',
});

export const metadata: Metadata = {
  title: 'Makalah AI - Academic Paper Writing Assistant',
  description:
    'AI-powered academic paper writing platform with intelligent chat assistance',
  keywords: ['AI', 'academic writing', 'research', 'Makalah', 'Indonesia', 'academic assistant'],
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${nunitoSans.variable} ${jetbrainsMono.variable} ${victorMono.variable} font-sans`}
        suppressHydrationWarning
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
