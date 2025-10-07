'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { AuthProvider } from '@/hooks/useAuth';
import { GlobalHeader } from '@/components/layout/GlobalHeader';
import { Footer } from '@/components/layout/Footer';
import { Toaster } from '@/components/ui/toaster';

interface ProvidersProps {
  children: ReactNode;
}

function LayoutShell({ children }: ProvidersProps) {
  const pathname = usePathname();
  const isChatPage = pathname === '/chat';
  const isAuthPage = pathname.startsWith('/auth');
  const isAdminPage = pathname.startsWith('/admin');

  if (isChatPage || isAuthPage || isAdminPage) {
    return <>{children}</>;
  }

  return (
    <div className="global-layout">
      <GlobalHeader className="global-header" showNavigation={!isAuthPage} />
      <main className="global-main">{children}</main>
      <Footer className="global-footer" />
    </div>
  );
}

export function AppProviders({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        disableTransitionOnChange={false}
      >
        <LayoutShell>{children}</LayoutShell>
        <Toaster />
      </ThemeProvider>
    </AuthProvider>
  );
}

export default AppProviders;
