import type { Metadata } from 'next';
import { PricingSection } from '@/components/pricing/PricingSection';

export const metadata: Metadata = {
  title: 'Harga | Makalah AI',
  description: 'Pilih paket Makalah AI yang menjaga setiap fase penulisan akademik tetap fokus dan terukur.',
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section with CSS illustration (non full-viewport) */}
      <section className="px-6 py-20 text-center relative hero-vivid hero-grid-thin">
        <div className="relative z-10 max-w-3xl mx-auto space-y-4">
          <h1 className="text-3xl md:text-4xl font-semibold leading-tight font-heading">
            Tak Perlu Bayar Mahal Untuk Karya Yang Masuk Akal
          </h1>
          <p className="text-lg md:text-xl text-white">
            Pilih paket penggunaan sesuai kebutuhan. Mau ujicoba dulu yang gratisan? Boleh! Atau langsung bayar per paper? Aman! Jika perlu, langganan bulanan sekalian! Bebas!
          </p>
        </div>
      </section>

      <PricingSection />
    </div>
  );
}
