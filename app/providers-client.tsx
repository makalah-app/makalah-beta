'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { ThemeProvider } from '../src/components/theme/ThemeProvider';
import { AuthProvider } from '../src/hooks/useAuth';
import { GlobalHeader } from '../src/components/layout/GlobalHeader';
import { Footer } from '../src/components/layout/Footer';

interface ProvidersProps {
  children: ReactNode;
}

function LayoutShell({ children }: ProvidersProps) {
  const pathname = usePathname();
  const isChatPage = pathname === '/chat';
  const isAuthPage = pathname.startsWith('/auth');

  if (isChatPage || isAuthPage) {
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
      </ThemeProvider>
    </AuthProvider>
  );
}

export default AppProviders;
