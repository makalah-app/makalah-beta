'use client';

import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Settings, User, Lock, Palette, Shield, MessageSquare, LucideIcon } from 'lucide-react';

interface SettingsSidebarProps {
  currentPath?: string;
  onNavigate?: () => void;
}

interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
}

const navigationItems: NavigationItem[] = [
  {
    id: 'profile',
    label: 'Profil Pengguna',
    href: '/settings/profile',
    icon: User,
    description: 'Kelola identitas & institusi'
  },
  {
    id: 'security',
    label: 'Keamanan',
    href: '/settings/security',
    icon: Lock,
    description: 'Password & autentikasi'
  },
  {
    id: 'preferences',
    label: 'Preferensi',
    href: '/settings/preferences',
    icon: Palette,
    description: 'Tema & tampilan'
  },
  {
    id: 'account',
    label: 'Info Akun',
    href: '/settings/account',
    icon: Shield,
    description: 'Role & status akun'
  },
  {
    id: 'conversations',
    label: 'Log Percakapan',
    href: '/settings/conversations',
    icon: MessageSquare,
    description: 'Riwayat & pengelolaan chat'
  }
];

export function SettingsSidebar({ currentPath, onNavigate }: SettingsSidebarProps) {
  const router = useRouter();

  const handleNavigation = (href: string) => {
    router.push(href);
    onNavigate?.();
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header (hidden on mobile to avoid redundancy) */}
      <div className="hidden md:block p-6 border-b border-border">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-start justify-center pt-1 rounded bg-primary/10 text-primary -mt-[2px] shrink-0">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-none">Pengaturan</h1>
            <p className="text-xs text-muted-foreground">Kelola akun & preferensi</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.href;

            return (
              <Button
                key={item.id}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start items-start gap-3 h-auto p-3 text-left whitespace-normal",
                  isActive && "bg-secondary text-secondary-foreground"
                )}
                onClick={() => handleNavigation(item.href)}
              >
                <Icon className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1 min-w-0 break-words">
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
