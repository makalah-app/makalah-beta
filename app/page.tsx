'use client';

import { useAuth } from '../src/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Button } from "../src/components/ui/button";
import { Card } from "../src/components/ui/card";
import { Badge } from "../src/components/ui/badge";
import { pricingTiers } from "../src/constants/pricing";
import { cn } from "../src/lib/utils";
import { BadgeCheck, Brain, MessageSquare, ListChecks, Target, ShieldCheck, UserCheck } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = (localStorage.getItem("theme") as "light" | "dark") || "light";
    setTheme(savedTheme);
  }, []);

  const handleChatWithAgent = () => {
    if (isAuthenticated) {
      router.push('/chat');
    } else {
      // Pastikan CTA tetap membawa user ke ruang chat setelah login
      router.push('/auth?redirectTo=/chat');
    }
  };

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  return (
    <div className="min-h-screen transition-colors duration-300 bg-background text-foreground">
      {/* Hero Section */}
      <section className="px-6 py-20 text-center relative">
        <div className={`absolute inset-0 opacity-30 ${theme === "light" ? "hero-pattern-light" : "hero-pattern-dark"}`}></div>

        <div className="relative z-10">
          <h1 className="text-5xl md:text-7xl font-medium mb-6 leading-tight text-foreground font-heading">
            Bikin <span className="text-primary">Paper Akademik</span>
            <br />
            Jadi Lebih Mudah
          </h1>
          <p className="text-xl mb-6 max-w-2xl mx-auto leading-relaxed text-muted-foreground">
            Platform kolaborasi penulisan makalah akademik berbahasa Indonesia berbasis Generatif AI. Dipandu agen AI melalui fase-fase penyusunan paper yang
            terstruktur dengan kontrol penuh di tangan Anda.
          </p>
          <div className="flex justify-center">
            <Button
              size="lg"
              className="font-medium transition-all hover:-translate-y-1 hover:scale-105"
              onClick={handleChatWithAgent}
              disabled={isLoading}
            >
              <Brain className="w-5 h-5 mr-2" />
              {isLoading ? 'Loading...' : 'Diskusi dengan Agen AI'}
            </Button>
          </div>
        </div>
      </section>

      {/* Why Makalah Section */}
      <section id="why-makalah" className="px-6 py-16 border-t border-border bg-background">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold text-center mb-10 text-foreground font-heading">
            Kenapa pakai Makalah AI?
          </h2>

          {/* Benefits Grid - hero-style static boxes */}
          <div className="grid gap-8 sm:grid-cols-2">
            <Card className="p-8 border-border bg-card rounded-[3px]">
              <div className="flex items-start gap-4">
                <Brain className="h-12 w-12 md:h-14 md:w-14 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <h3 className="text-lg md:text-xl font-semibold text-foreground">Fokus Berpikir</h3>
                  <p className="text-base text-muted-foreground">Mengembalikan aktivitas riset dan penulisan naskah akademik sebagai kegiatan berpikir: bukan malah berkutat dengan prompt.</p>
                </div>
              </div>
            </Card>

            <Card className="p-8 border-border bg-card rounded-[3px]">
              <div className="flex items-start gap-4">
                <MessageSquare className="h-12 w-12 md:h-14 md:w-14 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <h3 className="text-lg md:text-xl font-semibold text-foreground">Obrolan Natural</h3>
                  <p className="text-base text-muted-foreground">Tidak perlu ruwet menyusun prompt. Silakan bercakap dengan bahasa sehari-hari, Agen Makalah akan  menjadikannya bahan penyusun paper</p>
                </div>
              </div>
            </Card>

            <Card className="p-8 border-border bg-card rounded-[3px]">
              <div className="flex items-start gap-4">
                <ListChecks className="h-12 w-12 md:h-14 md:w-14 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <h3 className="text-lg md:text-xl font-semibold text-foreground">Dipandu Bertahap</h3>
                  <p className="text-base text-muted-foreground">Agen Makalah telah dibekali workflow yang memandu Anda menyusun paper tahap demi tahap, tanpa potensi melenceng</p>
                </div>
              </div>
            </Card>

            <Card className="p-8 border-border bg-card rounded-[3px]">
              <div className="flex items-start gap-4">
                <Target className="h-12 w-12 md:h-14 md:w-14 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <h3 className="text-lg md:text-xl font-semibold text-foreground">Konteks Terjaga</h3>
                  <p className="text-base text-muted-foreground">Tanpa keluar konteks riset, meski obrolan panjang lebar. Agen Makalah akan selalu mengembalikan obrolan ke bahasan Utama.</p>
                </div>
              </div>
            </Card>

            <Card className="p-8 border-border bg-card rounded-[3px]">
              <div className="flex items-start gap-4">
                <ShieldCheck className="h-12 w-12 md:h-14 md:w-14 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <h3 className="text-lg md:text-xl font-semibold text-foreground">Sitasi Akurat</h3>
                  <p className="text-base text-muted-foreground">Seluruh sitasi dan rujukan, dikumpulkan cermat oleh Agen Makalah, dengan tautan sumber yang akurat, anti‑plagiasi.</p>
                </div>
              </div>
            </Card>

            <Card className="p-8 border-border bg-card rounded-[3px]">
              <div className="flex items-start gap-4">
                <UserCheck className="h-12 w-12 md:h-14 md:w-14 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <h3 className="text-lg md:text-xl font-semibold text-foreground">Anda Pengendali</h3>
                  <p className="text-base text-muted-foreground">Paper yang dihasilkan tetap buah pikiran Anda, bukan dibuatkan AI. Anda hanya dibantu mengetik, menyusun, oleh Agen Makalah</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Highlight statement as sub-section */}
          <div className="mt-12 text-center max-w-3xl mx-auto">
            <h3 className="text-2xl md:text-3xl font-semibold text-foreground font-heading tracking-tight">
              Anda adalah pawang, AI hanya tukang.
            </h3>
            <p className="text-base md:text-3xl text-muted-foreground mt-2">
              Karya tulis tetap orisinal.
            </p>
            <div className="h-[1px] w-16 bg-primary/60 mx-auto mt-4" />
          </div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="px-6 py-20 text-center border-t border-border">
        <h2 className="text-4xl md:text-5xl font-medium mb-4 leading-tight text-foreground font-heading">
          AI yang akan <span className="text-primary">bekerja dengan Anda</span>,
        </h2>
        <h2 className="text-4xl md:text-5xl font-medium mb-6 leading-tight text-foreground font-heading">bukan menggantikan Anda</h2>
        <p className="text-xl mb-6 max-w-2xl mx-auto leading-relaxed text-muted-foreground">
          Bergabunglah dengan ribuan peneliti dan mahasiswa yang telah mempercayai MAKALAH AI untuk menghasilkan karya
          akademik berkualitas tinggi.
        </p>
        <div className="flex justify-center mb-12">
          <Link href="/tutorial">
            <Button
              variant="outline"
              size="lg"
              className="font-medium transition-all hover:-translate-y-1 hover:scale-105 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              Lihat Tutorial
            </Button>
          </Link>
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="relative group cursor-pointer overflow-hidden border-2 border-border transition-all hover:-translate-y-2 rounded-[3px]">
            <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative">
              {/* Play button overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 group-hover:bg-opacity-20 transition-all">
                <div className="w-20 h-20 rounded-[3px] bg-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>

              {/* Video duration badge */}
              <div className="absolute bottom-4 right-4 px-2 py-1 text-white text-sm font-medium bg-black/80 rounded-[3px]">
                12:34
              </div>
            </div>

            {/* Video title and description */}
            <div className="p-6 border-t border-border bg-card">
              <h3 className="text-xl font-bold mb-2 text-foreground font-heading">
                Tutorial Lengkap: Menulis Makalah Akademik dengan MAKALAH AI
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Pelajari cara menggunakan platform MAKALAH AI untuk menghasilkan makalah akademik berkualitas tinggi
                melalui 7 fase terstruktur dengan panduan AI yang cerdas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="px-6 py-20 border-t border-border bg-background">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h3 className="text-3xl md:text-4xl font-semibold font-heading">
              Tak Perlu Bayar Mahal Untuk Karya Yang Masuk Akal
            </h3>
            <p className="text-base md:text-lg text-muted-foreground">
              Pilih paket yang sesuai kebutuhan penulisan Anda. Mulai gratis, lanjutkan saat siap menyelesaikan makalah
              penuh, atau aktifkan langganan tetap ketika produksi karya berjalan rutin.
            </p>
            <Link
              href="/pricing"
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Lihat detail paket lengkap
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {pricingTiers.map((tier) => (
              <Card
                key={tier.name}
                className={cn(
                  'flex h-full flex-col gap-6 border border-border bg-card p-8 shadow-lg transition-colors',
                  tier.featured ? 'border-primary' : 'hover:bg-card/80',
                  tier.name === 'Gratis' && 'border-2 border-orange-500'
                )}
              >
                <div className="space-y-4 text-left">
                  <div className="flex items-center justify-between">
                    <h4 className="text-2xl font-semibold text-foreground font-heading">{tier.name}</h4>
                    {tier.badge ? (
                      <Badge variant={tier.featured ? 'default' : 'secondary'}>{tier.badge}</Badge>
                    ) : null}
                  </div>
                  <div>
                    <span className="text-3xl font-semibold text-foreground">{tier.priceLabel}</span>
                    <p className="text-sm text-muted-foreground leading-relaxed">{tier.tagline}</p>
                  </div>
                  <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
                    {tier.description.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <BadgeCheck className="mt-0.5 h-5 w-5 text-green-600" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-auto">
                  {tier.cta.disabled ? (
                    <Button
                      className="w-full bg-muted-foreground text-background hover:bg-muted-foreground disabled:opacity-100 disabled:pointer-events-none"
                      disabled
                    >
                      {tier.cta.label}
                    </Button>
                  ) : (
                    <Button className="w-full btn-green-solid" asChild>
                      <Link href={tier.cta.href ?? '/auth?tab=register'}>{tier.cta.label}</Link>
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>


      {/* Resources Section */}
      <section className="px-6 py-16 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-center gap-48 text-center md:text-left">
            {/* Sumber Daya Column */}
            <div>
              <h3 className="text-sm font-bold mb-6 text-foreground font-heading">Sumber Daya</h3>
              <ul className="space-y-4 text-xs">
                <li>
                  <Link href="/documentation" className="transition-colors hover:text-primary text-muted-foreground">
                    Dokumentasi
                  </Link>
                </li>
                <li>
                  <Link href="/tutorial" className="transition-colors hover:text-primary text-muted-foreground">
                    Tutorial Video
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="transition-colors hover:text-primary text-muted-foreground">
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="transition-colors hover:text-primary text-muted-foreground">
                    Blog
                  </Link>
                </li>
              </ul>
            </div>

            {/* Perusahaan Column */}
            <div>
              <h3 className="text-sm font-bold mb-6 text-foreground font-heading">Perusahaan</h3>
              <ul className="space-y-4 text-xs">
                <li>
                  <Link
                    href="#"
                    className="transition-colors hover:text-primary text-muted-foreground"
                  >
                    Karir
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="transition-colors hover:text-primary text-muted-foreground"
                  >
                    Kontak
                  </Link>
                </li>
                <li>
                  <Link
                    href="/docs#privacy-policy"
                    className="transition-colors hover:text-primary text-muted-foreground"
                  >
                    Kebijakan Privasi
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
