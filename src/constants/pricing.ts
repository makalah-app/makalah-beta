export type PricingTier = {
  name: string;
  badge?: string;
  featured?: boolean;
  tagline: string;
  priceLabel: string;
  priceUnit?: string; // Unit/description below price (e.g., "per paper", "5-6 paper")
  description: string[];
  cta: {
    label: string;
    href?: string;
    disabled?: boolean;
  };
};

export const pricingTiers: PricingTier[] = [
  {
    name: 'Gratis',
    tagline: 'Akses awal tanpa biaya untuk mengenal alur Makalah AI.',
    priceLabel: 'Rp.0',
    description: [
      'Eksplorasi alur penyunan hingga draft.',
      'Upgrade kapan saja lewat halaman harga.',
    ],
    cta: {
      label: 'Coba Gratis',
      // Arahkan ke login (default tab login) ketimbang register
      href: '/auth',
    },
  },
  {
    name: 'Bayar Per Tugas',
    tagline: 'Bayar sesuai kebutuhan untuk menyelesaikan satu paper setara 15 halaman A4.',
    priceLabel: 'Rpxx.xxx',
    priceUnit: 'per paper',
    description: [
      'Selesaikan satu makalah lengkap.',
      'Bayar hanya saat ada tugas saja.',
    ],
    cta: {
      label: 'Belum Aktif',
      disabled: true,
    },
  },
  {
    name: 'Pro',
    tagline: 'Langganan untuk penyusunan banyak paper akademik per bulan dengan diskusi agent tanpa batas.',
    priceLabel: 'Rpxxx.xxx',
    priceUnit: 'per bulan',
    description: [
      'Penyusunan hingga enam paper.',
      'Diskusi agent tanpa batas.',
      'Dukungan operasional prioritas.',
    ],
    cta: {
      label: 'Belum Aktif',
      disabled: true,
    },
  },
];
