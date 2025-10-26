'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { SettingsSidebar } from '@/components/settings/SettingsSidebar';
import { GlobalHeader } from '@/components/layout/GlobalHeader';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Global Header */}
      <GlobalHeader showNavigation={true} className="z-[50]" />

      {/* Settings Content Area */}
      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <div className="hidden md:block w-64 border-r border-border">
          <SettingsSidebar currentPath={pathname} />
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Mobile Header ala Admin pattern */}
          <div className="flex md:hidden items-center p-4 border-b border-border bg-background/95 backdrop-blur mb-4">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Buka menu pengaturan">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                overlayClassName="z-[40] top-20"
                className="z-[60] top-20 bottom-0 h-auto w-64 p-0 overflow-y-auto"
                hideCloseButton
              >
                <SettingsSidebar currentPath={pathname} onNavigate={() => setSidebarOpen(false)} />
              </SheetContent>
            </Sheet>
          </div>

          {/* Page Content */}
          <div className="p-6 md:p-8 max-w-full overflow-x-hidden">
            {children}
          </div>
        </div>
      </div>

      {/* Global Footer */}
      <Footer />
    </div>
  );
}
