'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
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

  // Sync CSS variable for header height to support full-viewport sections minus header
  useEffect(() => {
    const root = document.documentElement;
    const headerEl = document.querySelector('.global-header') as HTMLElement | null;
    const footerEl = document.querySelector('.global-footer') as HTMLElement | null;

    const updateLayoutVars = () => {
      const h = headerEl?.offsetHeight ?? 0;
      const f = footerEl?.offsetHeight ?? 0;
      root.style.setProperty('--header-h', `${h}px`);
      root.style.setProperty('--footer-h', `${f}px`);
    };

    updateLayoutVars();
    const ros: ResizeObserver[] = [];
    if (headerEl) {
      const ro = new ResizeObserver(updateLayoutVars);
      ro.observe(headerEl);
      ros.push(ro);
    }
    if (footerEl) {
      const ro = new ResizeObserver(updateLayoutVars);
      ro.observe(footerEl);
      ros.push(ro);
    }

    window.addEventListener('resize', updateLayoutVars);
    return () => {
      ros.forEach((ro) => ro.disconnect());
      window.removeEventListener('resize', updateLayoutVars);
    };
  }, [pathname]);

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
