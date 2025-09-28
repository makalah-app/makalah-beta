export type PricingTier = {
  name: string;
  badge?: string;
  featured?: boolean;
  tagline: string;
  priceLabel: string;
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
    badge: 'Gratis',
    tagline: 'Akses awal tanpa biaya untuk mengenal alur Makalah AI.',
    priceLabel: 'Rp.0',
    description: [
      'Eksplorasi alur tujuh fase.',
      'Kuota bulanan otomatis diperbarui.',
      'Upgrade kapan saja lewat dasbor.',
    ],
    cta: {
      label: 'Coba Gratis',
      href: '/auth?tab=register',
    },
  },
  {
    name: 'Bayar Per Paper',
    tagline: 'Bayar sesuai kebutuhan untuk menyelesaikan satu paper maksimal lima belas halaman A4.',
    priceLabel: 'Rp.75.000/paper',
    description: [
      'Selesaikan satu makalah lengkap.',
      'Bayar hanya saat ada proyek.',
      'Panduan tetap menyeluruh.',
    ],
    cta: {
      label: 'Belum Aktif',
      disabled: true,
    },
  },
  {
    name: 'Pro',
    badge: 'Langganan Tetap',
    tagline: 'Ritme tinggi untuk sekitar enam paper akademik per bulan dengan diskusi agent tanpa batas.',
    priceLabel: 'Rp255.000/5-6 paper',
    description: [
      'Ritme lima hingga enam makalah.',
      'Diskusi agent tanpa batas.',
      'Dukungan operasional prioritas.',
    ],
    cta: {
      label: 'Belum Aktif',
      disabled: true,
    },
  },
];
