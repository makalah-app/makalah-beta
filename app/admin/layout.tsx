'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import AdminAccess from '@/components/auth/AdminAccess';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { GlobalHeader } from '@/components/layout/GlobalHeader';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Menu, Shield } from 'lucide-react';
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
        <GlobalHeader showNavigation={true} className="z-[50]" />

        {/* Admin Content Area */}
        <div className="flex flex-1">
          {/* Desktop Sidebar */}
          <div className="hidden md:block w-64 border-r border-border">
            <AdminSidebar currentPath={pathname} />
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Mobile Header ala Documentation pattern */}
            <div className="flex md:hidden items-center p-4 border-b border-border bg-background/95 backdrop-blur mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <Menu className="h-5 w-5" />
                      <span className="sr-only">Toggle Sidebar</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent
                    side="left"
                    overlayClassName="z-[40] top-20"
                    className="z-[60] top-20 bottom-0 h-auto w-64 p-0 overflow-y-auto"
                    hideCloseButton
                  >
                    <AdminSidebar currentPath={pathname} onNavigate={() => setSidebarOpen(false)} />
                  </SheetContent>
                </Sheet>
                <div className="flex min-w-0 flex-col leading-tight">
                  <span className="text-lg font-semibold text-foreground">Admin Panel</span>
                  <span className="text-sm text-muted-foreground truncate">Makalah AI Management</span>
                </div>
              </div>
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
    </AdminAccess>
  );
}

function getMobileTitle(pathname: string) {
  if (pathname.startsWith('/admin/waiting-list')) return 'Waiting List';
  if (pathname.startsWith('/admin/users')) return 'Users';
  if (pathname.startsWith('/admin/models')) return 'Models';
  if (pathname.startsWith('/admin/prompt')) return 'Prompt';
  if (pathname.startsWith('/admin/status')) return 'Status';
  if (pathname.startsWith('/admin/create-admin')) return 'Create Admin';
  return 'Admin';
}
