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
import Link from 'next/link';
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
      {/* Striped hairline separator (10px, sparser thin diagonal strokes) - SVG for pixel-perfect rendering */}
      <svg
        className="absolute inset-x-0 top-0 h-[10px] w-full opacity-30"
        aria-hidden="true"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="diagonal-stripes-footer"
            x="0"
            y="0"
            width="10"
            height="10"
            patternUnits="userSpaceOnUse"
          >
            <line
              x1="0"
              y1="10"
              x2="10"
              y2="0"
              stroke="currentColor"
              strokeWidth="1"
              className="text-muted-foreground"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#diagonal-stripes-footer)" />
      </svg>
      <div className="max-w-6xl mx-auto">
        {/* 2 columns layout: Left (logo+copyright), Right (resources+company, right-aligned) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
          {/* Brand + Copyright */}
          <div className="flex items-start gap-3">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="transition-opacity duration-200"
              aria-label="Scroll to top"
            >
              <BrandLogo variant="mono" size="xs" className="opacity-60 hover:opacity-100" />
            </button>
            <p className="text-xxs text-muted-foreground leading-relaxed">
              &copy; 2025 Makalah AI
              <br />
              Semua hak cipta dilindungi.
            </p>
          </div>

          {/* Right: Sumber Daya + Perusahaan (right-aligned, precise grid) */}
          <div className="flex flex-col items-start text-left md:ml-auto md:w-full">
            <div className="grid md:grid-cols-[minmax(200px,auto)_minmax(200px,auto)] md:gap-12 md:justify-end md:ml-auto">
              <div className="md:justify-self-end">
                <h3 className="text-sm font-bold mb-3 text-foreground font-heading">Sumber Daya</h3>
                <ul className="space-y-2 text-xs">
                  <li>
                    <Link href="/documentation" className="transition-colors hover:text-primary text-muted-foreground">
                      Dokumentasi
                    </Link>
                  </li>
                  <li>
                    <Link href="/faq" className="transition-colors hover:text-primary text-muted-foreground">
                      FAQ
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="mt-6 md:mt-0 md:justify-self-end">
                <h3 className="text-sm font-bold mb-3 text-foreground font-heading">Perusahaan</h3>
                <ul className="space-y-2 text-xs">
                  <li>
                    <Link href="/about#bergabung-dengan-tim" className="transition-colors hover:text-primary text-muted-foreground">
                      Karir
                    </Link>
                  </li>
                  <li>
                    <Link href="/about#hubungi-kami" className="transition-colors hover:text-primary text-muted-foreground">
                      Kontak
                    </Link>
                  </li>
                  <li>
                    <Link href="/documentation#privacy-policy" className="transition-colors hover:text-primary text-muted-foreground">
                      Kebijakan Privasi
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
