'use client';

import { usePathname } from 'next/navigation';
import { Inter, Roboto, JetBrains_Mono } from 'next/font/google';
import { ThemeProvider } from '../src/components/theme/ThemeProvider';
import { AuthProvider } from '../src/hooks/useAuth';
import { GlobalHeader } from '../src/components/layout/GlobalHeader';
import { Footer } from '../src/components/layout/Footer';
import './globals.css';

// Font configurations sesuai design reference
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

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isChatPage = pathname === '/chat';
  const isAuthPage = pathname.startsWith('/auth');

  if (isChatPage) {
    // Chat page gets no header/footer - pure content
    return children;
  }

  if (isAuthPage) {
    // Auth pages get no header/footer - pure content
    return children;
  }

  // Other pages get global header and footer
  return (
    <div className="global-layout">
      <GlobalHeader
        className="global-header"
        showNavigation={!isAuthPage}
      />
      <main className="global-main">
        {children}
      </main>
      <Footer className="global-footer" />
    </div>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <title>Makalah AI - Academic Paper Writing Assistant</title>
        <meta name="description" content="AI-powered academic paper writing platform dengan dukungan riset terstruktur dan kolaborasi manusia" />
        <meta name="keywords" content="AI, academic writing, research, Makalah, Indonesia, academic assistant" />
        <link rel="icon" href="/favicon.svg" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={`${inter.variable} ${roboto.variable} ${jetbrainsMono.variable} font-sans`} suppressHydrationWarning>
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem={true}
            disableTransitionOnChange={false}
          >
            <LayoutContent>
              {children}
            </LayoutContent>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
