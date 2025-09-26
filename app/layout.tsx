import './globals.css';
import { Inter, Roboto, JetBrains_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import AppProviders from './providers';

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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className="dark" suppressHydrationWarning>
      <head>
        <title>Makalah AI - Academic Paper Writing Assistant</title>
        <meta
          name="description"
          content="AI-powered academic paper writing platform dengan 7-phase workflow dan human approval gates"
        />
        <meta
          name="keywords"
          content="AI, academic writing, research, Makalah, Indonesia, academic assistant"
        />
        <link rel="icon" href="/favicon.svg" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body
        className={`${inter.variable} ${roboto.variable} ${jetbrainsMono.variable} font-sans`}
        suppressHydrationWarning
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
