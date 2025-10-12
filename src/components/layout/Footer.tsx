'use client';

/**
 * Footer - Global footer component based on design reference
 *
 * DESIGN COMPLIANCE:
 * - Follows knowledge_base/design_reference/components/global-footer.tsx
 * - Uses Tailwind CSS directly (no custom CSS classes)
 * - Orange gradient logo badge consistent with brand
 * - Responsive layout dengan proper spacing
 * - Typography menggunakan muted-foreground untuk consistency
 */

import React from 'react';
import { usePathname } from 'next/navigation';
import BrandLogo from '@/components/ui/BrandLogo';
import { cn } from '../../lib/utils';

interface FooterProps {
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({
  className
}) => {
  const pathname = usePathname();

  // Don't show footer on chat pages
  if (pathname?.startsWith('/chat')) {
    return null;
  }

  return (
    <footer className={cn('px-6 py-12 transition-colors duration-300 relative', className)}>
      <div className="hairline-stripe-10 absolute inset-x-0 top-0" aria-hidden="true" />
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          {/* Brand Section */}
          <div className="flex items-center">
            <BrandLogo variant="mono" size="sm" className="opacity-60" />
          </div>

          {/* Copyright */}
          <p className="text-xxs text-muted-foreground">
            &copy; 2025 Makalah AI. Semua hak cipta dilindungi.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
