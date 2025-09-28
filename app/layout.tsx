import './globals.css';
import { Inter, Roboto, JetBrains_Mono } from 'next/font/google';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import LogoLoadingSpinner from '@/components/ui/LogoLoadingSpinner';

const AppProviders = dynamic(() => import('./providers-client'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4 text-center">
          <LogoLoadingSpinner />
          <p className="text-sm text-muted-foreground">Bersiap masuk aplikasi...</p>
        </div>
      </div>
    </div>
  ),
});

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-heading',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Makalah AI - Academic Paper Writing Assistant',
  description:
    'AI-powered academic paper writing platform dengan 7-phase workflow dan human approval gates',
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
        className={`${inter.variable} ${roboto.variable} ${jetbrainsMono.variable} font-sans`}
        suppressHydrationWarning
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
