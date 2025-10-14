'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import AdminAccess from '@/components/auth/AdminAccess';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { GlobalHeader } from '@/components/layout/GlobalHeader';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <AdminAccess>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Global Header */}
        <GlobalHeader showNavigation={true} />

        {/* Admin Content Area */}
        <div className="flex flex-1">
          {/* Desktop Sidebar */}
          <div className="hidden md:block w-64 border-r border-border">
            <AdminSidebar currentPath={pathname} />
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Mobile Menu Trigger - Positioned in content area */}
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden absolute top-6 right-6 z-30 h-10 w-10 rounded border border-border bg-background/95 backdrop-blur text-muted-foreground hover:text-primary hover:border-primary"
                  aria-label="Buka menu admin"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-64 p-0 [&>button[data-radix-dialog-close]]:top-4 [&>button[data-radix-dialog-close]]:right-4"
              >
                <AdminSidebar currentPath={pathname} onNavigate={() => setSidebarOpen(false)} />
              </SheetContent>
            </Sheet>

            {/* Page Content with relative positioning for mobile menu */}
            <div className="relative p-6 md:p-8">
              {children}
            </div>
          </div>
        </div>

        {/* Global Footer */}
        <Footer />
      </div>
    </AdminAccess>
  );
}
