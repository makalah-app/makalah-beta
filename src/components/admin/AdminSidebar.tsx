'use client';

import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Shield, Brain, Cpu, Users, UserPlus, LucideIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface AdminSidebarProps {
  currentPath?: string;
  onNavigate?: () => void;
}

interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
  superadminOnly?: boolean;
}

const navigationItems: NavigationItem[] = [
  {
    id: 'status',
    label: 'Status Konfigurasi',
    href: '/admin/status',
    icon: Shield,
    description: 'Ringkasan setup aktif'
  },
  {
    id: 'models',
    label: 'Konfigurasi Model',
    href: '/admin/models',
    icon: Brain,
    description: 'Model LLM & parameters'
  },
  {
    id: 'prompt',
    label: 'System Prompt',
    href: '/admin/prompt',
    icon: Cpu,
    description: 'Instruksi dasar AI'
  },
  {
    id: 'users',
    label: 'Statistik Pengguna',
    href: '/admin/users',
    icon: Users,
    description: 'Analitik pemakaian'
  },
  {
    id: 'users-details',
    label: 'Detail Users',
    href: '/admin/users/details',
    icon: Users,
    description: 'Kontrol akun & status'
  },
  {
    id: 'create-admin',
    label: 'Buat Admin',
    href: '/admin/create-admin',
    icon: UserPlus,
    description: 'Tambah administrator',
    superadminOnly: true
  }
];

export function AdminSidebar({ currentPath, onNavigate }: AdminSidebarProps) {
  const router = useRouter();
  const { user } = useAuth();

  const handleNavigation = (href: string) => {
    router.push(href);
    onNavigate?.();
  };

  // Filter navigation items based on user role
  const isSuperAdmin = user?.role === 'superadmin';
  const visibleItems = navigationItems.filter(
    (item) => !item.superadminOnly || isSuperAdmin
  );

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-start justify-center rounded bg-primary/10 text-primary shrink-0 pt-1.5">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-semibold text-lg">Admin Panel</h1>
            <p className="text-xs text-muted-foreground">Makalah AI Management</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.href;

            return (
              <Button
                key={item.id}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start items-start gap-3 h-auto p-3 text-left",
                  isActive && "bg-secondary text-secondary-foreground"
                )}
                onClick={() => handleNavigation(item.href)}
              >
                <Icon className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="font-medium text-sm">{item.label}</span>
                  <span className="text-xs text-muted-foreground">{item.description}</span>
                </div>
              </Button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
