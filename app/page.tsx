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
      <section className="px-6 py-20 text-center relative section-screen-with-header hero-vivid hero-grid-thin">

        <div className="relative z-10">
          <h1 className="text-5xl md:text-7xl font-medium mb-6 leading-tight text-foreground font-heading">
            Bikin <span className="text-primary">Paper Akademik</span>
            <br />
            Jadi Lebih Mudah
          </h1>
          <p className="text-xl mb-6 max-w-2xl mx-auto leading-relaxed text-muted-foreground">
            Obrolkan gagasan, lalu biarkan Agen Ai memandu Anda mengelaborasi topik hingga paper utuh
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
        {/* Bottom fade to background to soften edge while keeping separator on next section */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-20 md:h-28 z-0"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0), var(--background))' }}
          aria-hidden
        />
      </section>

      {/* Why Makalah Section */}
      <section id="why-makalah" className="px-6 py-16 bg-background relative section-screen separator-accent-only">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold text-center mb-10 text-foreground font-heading">
            Kenapa Makalah AI?
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
            <p className="text-base md:text-4xl text-muted-foreground mt-2">
              Karya tulis tetap orisinal.
            </p>
            <div className="h-[1px] w-16 bg-primary/60 mx-auto mt-4" />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="px-6 py-20 bg-background section-screen">
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

      {/* Learn + Resources (combined bottom section) */}
      <section className="px-6 py-8 bg-background section-screen-with-footer">
        <div className="w-full flex flex-col items-center gap-10 my-auto">
          {/* Tutorial highlight */}
          <div className="w-full max-w-3xl">
            <h2 className="text-3xl md:text-4xl font-semibold text-foreground font-heading text-center">
              Pelajari cara bekerja dengan Agen Makalah
            </h2>
            <p className="mt-3 text-base md:text-lg text-muted-foreground text-center">
              Cermati tahap demi tahap penggunaan Agen Makalah dalam mengasistensi Anda menyusun paper akademik dan melakukan riset.
            </p>
            <div className="relative group cursor-pointer overflow-hidden border-2 border-border transition-all hover:-translate-y-2 rounded-[3px] mt-6 md:mt-8">
              <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative">
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/20 transition-all">
                  <div className="w-20 h-20 rounded-[3px] bg-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
                <div className="absolute bottom-4 right-4 px-2 py-1 text-white text-sm font-medium bg-black/80 rounded-[3px]">
                  12:34
                </div>
              </div>
              {/* Video stands alone without title/description */}
            </div>
          </div>

          {/* Internal sub-separator between Tutorial and Resources */}
          <div className="w-full my-4" aria-hidden="true">
            <div
              className="h-[2px] w-full rounded-[3px]"
              style={{ background: 'linear-gradient(90deg, transparent, var(--primary), transparent)', opacity: 0.55 }}
            />
          </div>

          {/* Resources + Company (narrow) */}
          <div className="w-full max-w-md grid grid-cols-1 sm:grid-cols-2 gap-10 text-center md:text-left justify-items-center md:justify-items-start">
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
            <div>
              <h3 className="text-sm font-bold mb-6 text-foreground font-heading">Perusahaan</h3>
              <ul className="space-y-4 text-xs">
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
      </section>
    </div>
  );
}
