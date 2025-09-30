'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Brain, Cpu, Users } from 'lucide-react';

interface AdminSidebarProps {
  currentPath?: string;
  onNavigate?: () => void;
}

const navigationItems = [
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
  }
];

export function AdminSidebar({ currentPath, onNavigate }: AdminSidebarProps) {
  const router = useRouter();

  const handleNavigation = (href: string) => {
    router.push(href);
    onNavigate?.();
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
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
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.href;

            return (
              <Button
                key={item.id}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 h-auto p-3 text-left",
                  isActive && "bg-secondary text-secondary-foreground"
                )}
                onClick={() => handleNavigation(item.href)}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="font-medium text-sm">{item.label}</span>
                  <span className="text-xs text-muted-foreground">{item.description}</span>
                </div>
              </Button>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs">
            Admin Dashboard
          </Badge>
          <Badge variant="secondary" className="text-xs">
            v1.0
          </Badge>
        </div>
      </div>
    </div>
  );
}