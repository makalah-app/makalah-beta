'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { SettingsSidebar } from '@/components/settings/SettingsSidebar';
import { GlobalHeader } from '@/components/layout/GlobalHeader';
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
    <div className="min-h-screen bg-background">
      {/* Global Header */}
      <GlobalHeader showNavigation={true} />

      {/* Settings Content Area */}
      <div className="flex">
        {/* Desktop Sidebar */}
        <div className="hidden md:block w-64 border-r border-border min-h-screen">
          <SettingsSidebar currentPath={pathname} />
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* Mobile Menu Trigger - Positioned in content area */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden absolute top-6 right-6 z-30 h-10 w-10 rounded-[3px] border border-border bg-background/95 backdrop-blur text-muted-foreground hover:text-primary hover:border-primary"
                aria-label="Buka menu pengaturan"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-64 p-0 [&>button[data-radix-dialog-close]]:top-4 [&>button[data-radix-dialog-close]]:right-4"
            >
              <SettingsSidebar currentPath={pathname} onNavigate={() => setSidebarOpen(false)} />
            </SheetContent>
          </Sheet>

          {/* Page Content with relative positioning for mobile menu */}
          <div className="relative p-6 md:p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
