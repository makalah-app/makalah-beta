export interface MainMenuItem {
  label: string;
  href: string;
  requiresAuth?: boolean;
}

export const MAIN_MENU_ITEMS: MainMenuItem[] = [
  { label: 'Dokumentasi', href: '/documentation' },
  // HIDDEN: Tutorial (sementara disembunyikan dari header utama)
  // { label: 'Tutorial', href: '/tutorial' },
  // HIDDEN: Blog (sementara disembunyikan dari header utama)
  // { label: 'Blog', href: '/blog' },
  // HIDDEN: Harga (sementara disembunyikan dari header utama)
  // { label: 'Harga', href: '/pricing' },
  { label: 'Tentang', href: '/about' },
];
