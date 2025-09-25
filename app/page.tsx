'use client';

import { useAuth } from '../src/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Button } from "../src/components/ui/button";
import { Card } from "../src/components/ui/card";
import { Badge } from "../src/components/ui/badge";
import { CheckCircle, Brain } from "lucide-react";
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
            Platform kolaborasi penulisan makalah akademik berbahasa Indonesia berbasis AI. Dipandu agen AI melalui 7
            fase terstruktur dengan kontrol penuh di tangan Anda.
          </p>
          <div className="flex justify-center">
            <Button
              size="lg"
              className="font-medium transition-all hover:-translate-y-1 hover:scale-105"
              onClick={handleChatWithAgent}
              disabled={isLoading}
            >
              <Brain className="w-5 h-5 mr-2" />
              {isLoading ? 'Loading...' : 'Chat With Agent'}
            </Button>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="px-6 py-16 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <Card className="p-8 border-border bg-card relative transition-colors duration-300">
            <div className="absolute top-4 left-4 w-2 h-2 bg-border rounded-[3px]"></div>
            <div className="absolute top-4 right-4 w-2 h-2 bg-border rounded-[3px]"></div>
            <div className="grid md:grid-cols-2 gap-8">
              {/* Left side - Chat interface mockup */}
              <Card className="p-6 border-border bg-secondary">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-destructive rounded-[3px]"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-[3px]"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-[3px]"></div>
                  </div>
                  <Badge className="text-white text-xs font-medium px-3 py-1 bg-primary">
                    Fase 1/7: Klarifikasi Topik
                  </Badge>
                </div>
                <div className="space-y-4">
                  <div className="text-white p-4 text-sm font-medium bg-primary rounded-[3px]">
                    Saya ingin menulis makalah tentang dampak AI terhadap pendidikan tinggi di Indonesia
                  </div>
                  <div className="p-4 text-sm bg-card border-l-2 border-primary rounded-[3px]">
                    <div className="flex items-start space-x-3">
                      <Brain className="w-5 h-5 mt-1 flex-shrink-0 text-primary" />
                      <div>
                        <p className="font-medium mb-2">
                          Topik yang menarik! Mari kita klarifikasi arah penelitian Anda...
                        </p>
                        <div className="mt-3 space-y-2 text-xs font-normal text-muted-foreground">
                          <p>• Fokus pada aspek pedagogis atau teknologi?</p>
                          <p>• Tingkat pendidikan spesifik (S1, S2, S3)?</p>
                          <p>• Metodologi kualitatif atau kuantitatif?</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Setujui
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-yellow-600 text-yellow-600 hover:bg-yellow-600 hover:text-white"
                    >
                      Minta Revisi
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Right side - Artifact preview */}
              <Card className="p-6 border-border bg-secondary relative">
                <div className="absolute top-3 left-3 w-2 h-2 bg-border rounded-[3px]"></div>
                <div className="absolute top-3 right-3 w-2 h-2 bg-border rounded-[3px]"></div>
                <div className="flex items-center justify-between mb-6 pt-2">
                  <h3 className="text-sm font-bold text-foreground">01-topic-definitive-research-direction.md</h3>
                  <Badge variant="secondary" className="text-xs font-bold px-3 py-1">
                    v1.0
                  </Badge>
                </div>
                <div className="bg-background border border-border p-4 font-mono text-sm text-muted-foreground space-y-3">
                  <h4 className="font-bold text-foreground"># Arah Penelitian Definitif</h4>
                  <p>**Topik:** Dampak Implementasi AI dalam Pembelajaran...</p>
                  <p>**Ruang Lingkup:** Pendidikan tinggi di Indonesia...</p>
                  <p>**Metodologi:** Penelitian kualitatif dengan pendekatan...</p>
                  <div className="text-xs text-muted-foreground mt-4 pt-3 border-t border-border">
                    Generated • 2 minutes ago
                  </div>
                </div>
              </Card>
            </div>
          </Card>
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
                  <Link href="/about" className="transition-colors hover:text-primary text-muted-foreground">
                    Tentang Kami
                  </Link>
                </li>
                <li>
                  <Link
                    href="/about#bergabung-dengan-tim"
                    className="transition-colors hover:text-primary text-muted-foreground"
                  >
                    Karir
                  </Link>
                </li>
                <li>
                  <Link
                    href="/about#hubungi-kami"
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
