export interface MainMenuItem {
  label: string;
  href: string;
  requiresAuth?: boolean;
}

export const MAIN_MENU_ITEMS: MainMenuItem[] = [
  { label: 'Dokumentasi', href: '/documentation' },
  { label: 'Tutorial', href: '/tutorial' },
  { label: 'Blog', href: '/blog' },
  { label: 'Harga', href: '/pricing' },
];
