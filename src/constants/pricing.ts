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
    name: 'Bayar Per Tugas',
    tagline: 'Bayar sesuai kebutuhan untuk menyelesaikan satu paper maksimal lima belas halaman A4.',
    priceLabel: 'Rp75.000',
    priceUnit: 'per paper',
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
    tagline: 'Ritme tinggi untuk sekitar enam paper akademik per bulan dengan diskusi agent tanpa batas.',
    priceLabel: 'Rp255.000',
    priceUnit: '5-6 paper',
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
