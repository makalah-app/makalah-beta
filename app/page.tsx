'use client';

import { useAuth } from '../src/hooks/useAuth';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "../src/components/ui/button";
import { Card } from "../src/components/ui/card";
import { Badge } from "../src/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogTrigger, DialogClose } from "../src/components/ui/dialog";
import { pricingTiers } from "@/constants/pricing";
import { cn } from "../src/lib/utils";
import { BadgeCheck, Brain, MessageSquare, ListChecks, Target, ShieldCheck, UserCheck, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from '@/hooks/use-toast';
// Page no longer defines scoped fonts; global config handles fonts
import Link from "next/link";
import ChatInputHeroMock from "../src/components/marketing/ChatInputHeroMock";
import { E } from 'node_modules/@upstash/redis/zmscore-DWj9Vh1g.mjs';

// Fonts are configured globally in app/layout.tsx

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);
  const [isPawangDialogOpen, setIsPawangDialogOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = (localStorage.getItem("theme") as "light" | "dark") || "light";
    setTheme(savedTheme);
  }, []);

  const handleChatWithAgent = () => {
    if (isAuthenticated) {
      router.push('/chat');
    } else {
      // Redirect to auth page with redirectTo parameter
      router.push('/auth?redirectTo=/chat');
    }
  };

  // Show toast after waitlist success via query param, then clean the URL
  useEffect(() => {
    if (!mounted) return;
    const flag = searchParams.get('waitlist');
    if (flag === 'success') {
      toast({
        title: 'Terima kasih!',
        description: 'Email kamu masuk daftar tunggu. Makasih!',
      });
      // Clean up the URL to avoid re-trigger on back/forward
      router.replace('/', { scroll: false });
    }
  }, [mounted, searchParams, toast, router]);

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  // ✅ PERFORMANCE: Remove double loading indicators - rely on app-level loading only
  // No button-level loading to prevent double loaders

  return (
    <div className="min-h-screen transition-colors duration-300 bg-background text-foreground">
      {/* Hero Section */}
      <section className="px-6 py-0 text-center relative section-screen-with-header hero-vivid hero-grid-thin">
        
        <div className="relative z-10 h-full flex flex-col justify-between">
          <div className="mt-2 md:mt-2">
            {/* New Badge */}
            <div className="flex justify-center mb-4">
              <Dialog open={isPawangDialogOpen} onOpenChange={setIsPawangDialogOpen}>
                <DialogTrigger asChild>
                  <Badge
                    variant="default"
                    className="bg-success-600 hover:bg-success-700 text-white text-xs px-4 py-2 rounded-full font-semibold transition-all duration-300 cursor-pointer hover:scale-105 hover:shadow-lg shadow-md relative overflow-hidden group"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-300"></span>
                      </span>
                      Anda Pawang, Ai Tukang
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  </Badge>
                </DialogTrigger>

                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-card text-card-foreground border border-border shadow-lg">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-semibold text-foreground">
                      Manusia adalah pawang, Ai sebatas tukang
                    </DialogTitle>
                  </DialogHeader>

                  <div
                    className="text-sm text-foreground leading-relaxed space-y-3"
                    dangerouslySetInnerHTML={{
                      __html: `Kredo tersebut jadi pedoman kami dalam membangun Makalah. Platform ini disiapkan untuk merespons disrupsi teknologi dalam aktivitas akademik dan riset. Laju penggunaan Ai khususnya<em>Large Language Model</em> (LLM) tidak bisa dihindari. Pelarangan hanya akan menghasilkan ketidakjujuran, &ldquo;Ngomong nggak pakai, padahal diam-diam menggunakan!&rdquo;.<br /><br />Bagaimana dengan penggunaan detektor Ai? Problematik! Detektor apapun akan selalu memberikan hasil <em>false positive</em>, dan hanya memunculkan persentase probabilitas yang tidak jelas argumennya. Bagaimana tidak? Model-model LLM yang diterbitkan platform-platform global, makin hari kian pintar, jauh lebih terdepan dibanding teknologi deteksi teks Ai. Lagi pula, selama tulisan tersusun dalam struktur subyek+predikat+obyek+keterangan, maka kalimat apapun bakal dideteksi buatan Ai.<br /><br />Yang diperlukan saat ini adalah mengatur penggunaan Ai di lingkungan akademik agar transparan, bisa dipertanggungjawabkan, dan memiliki riwayat pemakaian akuntabel. Siapapun bisa dilacak, &ldquo;Apakah paper miliknya dibuatkan Ai, atau dibuat bersama Ai?&rdquo;. Bukankah keduanya berbeda?`
                    }}
                  />

                  <DialogFooter>
                    <DialogClose asChild>
                      <Button
                        variant="default"
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-colors duration-200"
                      >
                        Tutup
                      </Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

          <h1
            className="text-4xl md:text-6xl mb-6 leading-tight text-foreground font-heading"
          >
            Ngobrol<span className="text-primary font-bold">+</span>Riset <br />
            <span className="text-primary font-bold">+</span>Brainstorming
            <br />
            <span className="text-primary">=</span>Paper Akademik
          </h1>

          <p className="text-md md:text-xl mb-6 max-w-2xl mx-auto leading-relaxed text-foreground">
            Nggak perlu <span className="font-bold"><em>prompt</em></span> ruwet, ide apapun bakal diolah <span className="font-bold">Agen Makalah Ai</span> menjadi paper utuh
          </p>
          <div className="flex justify-center">
            {/* Disembunyikan sesuai instruksi: CTA lama "Ayo mulai!" */}
            {false && (
              <Button
                size="lg"
                className="font-medium transition-all hover:-translate-y-1 hover:scale-105"
                onClick={handleChatWithAgent}
              >
                <Brain className="w-5 h-5 mr-2" />
                Ayo mulai!
              </Button>
            )}

            <Button
              asChild
              size="lg"
              className="font-medium transition-all hover:-translate-y-1 hover:scale-105"
            >
              <Link href="/auth/waiting-list">
                <UserPlus className="w-5 h-5 mr-2" />
                Daftarkan email untuk uji coba
              </Link>
            </Button>
          </div>
          </div>

          {/* Desktop-only chat input mock at bottom of hero; ensure enough spacing from CTA */}
          <div className="pb-0 mt-6 md:mt-8">
            <ChatInputHeroMock />
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
        <div className="max-w-4xl mx-auto">
          <h3
            className="text-3xl md:text-3xl font-semibold text-center mb-10 text-foreground font-heading"
          >
            Kenapa Makalah AI?
          </h3>

          {/* Benefits Grid - hero-style static boxes */}
          <div className="grid gap-8 sm:grid-cols-2">
            <Card className="p-8 border-border bg-card rounded">
              <div className="flex items-start gap-4">
                <UserCheck className="h-8 w-8 md:h-8 md:w-8 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <h3 className="text-lg md:text-xl font-semibold text-foreground mb-1.5 md:mb-2">Sparring Partner</h3>
                  <p className="text-sm text-muted-foreground">Agen Makalah Ai berperan sebagai pendamping riset, lawan diskusi, hingga menuliskan sesuai perintah dan arahan. Tak ada &ldquo;simsalabim&rdquo;. Anda berproses, agen Makalah Ai mengasistensi. Paper yang dihasilkan tetap buah pikiran Anda</p>
                </div>
              </div>
            </Card>

            <Card className="p-8 border-border bg-card rounded">
              <div className="flex items-start gap-4">
                <Brain className="h-8 w-8 md:h-8 md:w-8 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <h3 className="text-lg md:text-xl font-semibold text-foreground mb-1.5 md:mb-2">Fokus Berpikir</h3>
                  <p className="text-sm text-muted-foreground">Mengembalikan aktivitas riset dan penulisan paper sebagai kegiatan berpikir, bukan malah berkutat dengan <em>prompt</em>, seolah berusaha menemukan keajaiban Ai. Eh?</p>
                </div>
              </div>
            </Card>

            <Card className="p-8 border-border bg-card rounded">
              <div className="flex items-start gap-4">
                <ShieldCheck className="h-8 w-8 md:h-8 md:w-8 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <h3 className="text-lg md:text-xl font-semibold text-foreground mb-1.5 md:mb-2">Sitasi Akurat</h3>
                  <p className="text-sm text-muted-foreground">Seluruh sitasi didapatkan  Agen Makalah, dari sumber-sumber akurat, kemudian ditautkan ke dalam naskah dalam URL vali, dengan format rujukan pustaka sesuai arahan Anda.</p>
                </div>
              </div>
            </Card>

            <Card className="p-8 border-border bg-card rounded">
              <div className="flex items-start gap-4">
                <MessageSquare className="h-8 w-8 md:h-8 md:w-8 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <h3 className="text-lg md:text-xl font-semibold text-foreground mb-1.5 md:mb-2">Obrolan Natural</h3>
                  <p className="text-sm text-muted-foreground">Ngobrol saja dengan bahasa sehari-hari, Agen Makalah pasti memahami, bahkan mengonformasi interpretasi saat menemukan ambiguitas.</p>
                </div>
              </div>
            </Card>

            <Card className="p-8 border-border bg-card rounded">
              <div className="flex items-start gap-4">
                <ListChecks className="h-8 w-8 md:h-8 md:w-8 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <h3 className="text-lg md:text-xl font-semibold text-foreground mb-1.5 md:mb-2">Dipandu Bertahap</h3>
                  <p className="text-sm text-muted-foreground">Agen Makalah dibekali <em>workflow</em> konsisten yang memandu penyusunan paper tahap demi tahap, tanpa melenceng.</p>
                </div>
              </div>
            </Card>

            <Card className="p-8 border-border bg-card rounded">
              <div className="flex items-start gap-4">
                <Target className="h-8 w-8 md:h-8 md:w-8 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <h3 className="text-lg md:text-xl font-semibold text-foreground mb-1.5 md:mb-2">Konteks Terjaga</h3>
                  <p className="text-sm text-muted-foreground">Obrolan se-<em>ngelantur</em> apapun, akan selalu dikembalikan ke bahasan utama.</p>
                </div>
              </div>
            </Card>


          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="px-6 py-20 bg-background section-screen">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h3
              className="text-3xl md:text-3xl font-semibold font-heading"
            >
              Pilih paket penggunaan
              <br />
              sesuai kebutuhan
            </h3>

            <Link
              href="/pricing"
              className="inline-block mt-4 md:mt-6 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
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
                    <h4 className="text-lg font-light text-foreground font-heading">{tier.name}</h4>
                    {tier.badge ? (
                      <Badge variant={tier.featured ? 'default' : 'secondary'}>{tier.badge}</Badge>
                    ) : null}
                  </div>
                  <div>
                  <div className="mb-2">
                    <h3
                      className={cn(
                        "text-3xl font-semibold",
                        /x/i.test(tier.priceLabel)
                          ? "line-through decoration-red-600 decoration-4 decoration-skip-ink-none text-muted-foreground opacity-80"
                          : "text-foreground"
                      )}
                      title={/x/i.test(tier.priceLabel) ? "Harga belum aktif" : undefined}
                      style={/x/i.test(tier.priceLabel)
                        ? { textDecorationColor: 'rgb(220 38 38)', textDecorationThickness: '4px', textDecorationSkipInk: 'none' }
                        : undefined}
                    >
                      {tier.priceLabel}
                    </h3>
                      {tier.priceUnit && (
                        <div className="text-sm font-light text-muted-foreground mt-0.5">{tier.priceUnit}</div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{tier.tagline}</p>
                  </div>
                  <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
                    {tier.description.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <BadgeCheck className="mt-0.5 h-5 w-5 text-success-600" />
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
            <h3
              className="text-3xl md:text-3xl font-semibold text-foreground font-heading text-center"
            >
              Bagaimana cara kerjanya?
            </h3>
            <p className="mt-3 text-md text-base md:text-lg text-foreground text-center">
              Pelajari kepiawaian Agen Makalah Ai dalam mengasistensi riset dan penyusunan paper akademik.
            </p>
            <div className="relative group cursor-pointer overflow-hidden border-2 border-border transition-all hover:-translate-y-2 rounded mt-6 md:mt-8">
              <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative">
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/20 transition-all">
                  <div className="w-20 h-20 rounded bg-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
                <div className="absolute bottom-4 right-4 px-2 py-1 text-white text-sm font-medium bg-black/80 rounded">
                  12:34
                </div>
              </div>
              {/* Video stands alone without title/description */}
            </div>
          </div>

          {/* Internal sub-separator between Tutorial and Resources */}
          <div className="w-full my-4" aria-hidden="true">
            <div
              className="h-[2px] w-full rounded"
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
