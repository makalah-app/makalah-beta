'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Target, Lightbulb, Award, BookOpen, Zap, Mail, Briefcase, Brain } from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AboutPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Pattern Background */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--muted-foreground) / 0.15) 1px, transparent 0)',
          backgroundSize: '16px 16px',
        }}
      />

      <div className="relative z-10">
        {/* Hero Section */}
        <section className="px-6 py-20 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
              <Brain className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold mb-6 leading-tight text-foreground font-heading">
            Tentang <span className="text-primary">Makalah AI</span>
          </h1>
          <p className="text-xl mb-8 max-w-3xl mx-auto leading-relaxed text-muted-foreground">
            Platform kolaborasi penulisan makalah akademik berbahasa Indonesia yang menggunakan kecerdasan buatan untuk
            membantu peneliti dan mahasiswa menghasilkan karya akademik berkualitas tinggi melalui metodologi
            terstruktur.
          </p>
        </section>

        {/* Mission & Vision */}
        <section className="px-6 py-16 border-t border-border">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12">
              <Card className="border-border bg-card hover:bg-card/80 transition-all duration-300 hover:scale-[1.02]">
                <CardContent className="p-8">
                  <div className="w-14 h-14 bg-primary/10 flex items-center justify-center rounded-[3px] mb-6">
                    <Target className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-4 text-foreground font-heading">Misi Kami</h3>
                  <p className="leading-relaxed text-muted-foreground">
                    Memberdayakan peneliti dan mahasiswa Indonesia dengan teknologi AI yang membantu menghasilkan makalah
                    akademik berkualitas tinggi, sambil mempertahankan integritas akademik dan kreativitas manusia dalam
                    proses penulisan.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border bg-card hover:bg-card/80 transition-all duration-300 hover:scale-[1.02]">
                <CardContent className="p-8">
                  <div className="w-14 h-14 bg-primary/10 flex items-center justify-center rounded-[3px] mb-6">
                    <Lightbulb className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-4 text-foreground font-heading">Visi Kami</h3>
                  <p className="leading-relaxed text-muted-foreground">
                    Menjadi platform terdepan dalam penulisan akademik berbasis AI di Indonesia, yang memungkinkan setiap
                    peneliti dan mahasiswa untuk menghasilkan karya ilmiah yang berkualitas dengan efisiensi dan akurasi
                    tinggi.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Our Approach */}
        <section className="px-6 py-20 border-t border-border">
          <div className="max-w-6xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-semibold mb-6 leading-tight text-foreground font-heading">
              Pendekatan <span className="text-primary">7 Fase Terstruktur</span>
            </h2>
            <p className="text-xl mb-16 max-w-3xl mx-auto leading-relaxed text-muted-foreground">
              Makalah AI menggunakan metodologi SOLC (Structured Outline Learning Cycle) yang membagi proses penulisan
              menjadi 7 fase yang sistematis dan terukur.
            </p>

            <div className="grid md:grid-cols-3 gap-8 mb-16">
              {[
                {
                  phase: 'Fase 1-2',
                  title: 'Klarifikasi & Perencanaan',
                  description: 'Mendefinisikan topik penelitian dan menyusun kerangka kerja yang solid',
                  icon: Target,
                },
                {
                  phase: 'Fase 3-4',
                  title: 'Penelitian & Analisis',
                  description: 'Melakukan tinjauan literatur dan mengembangkan kerangka teoretis',
                  icon: BookOpen,
                },
                {
                  phase: 'Fase 5-7',
                  title: 'Penulisan & Finalisasi',
                  description: 'Menyusun metodologi, analisis data, dan kesimpulan penelitian',
                  icon: Zap,
                },
              ].map((item, index) => (
                <Card
                  key={index}
                  className="border-border bg-card hover:bg-card/80 transition-all duration-300 hover:scale-[1.02]"
                >
                  <CardContent className="p-8">
                    <Badge className="bg-primary text-primary-foreground mb-4">{item.phase}</Badge>
                    <div className="w-14 h-14 bg-primary/10 flex items-center justify-center rounded-[3px] mb-6 mx-auto">
                      <item.icon className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-4 text-foreground">{item.title}</h3>
                    <p className="leading-relaxed text-muted-foreground">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="px-6 py-20 border-t border-border">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-semibold mb-16 text-center leading-tight text-foreground font-heading">
              Nilai-Nilai <span className="text-primary">Kami</span>
            </h2>

            <div className="grid md:grid-cols-2 gap-12">
              {[
                {
                  title: 'Integritas Akademik',
                  description:
                    'Kami berkomitmen untuk mempertahankan standar etika akademik tertinggi. AI kami dirancang untuk membantu, bukan menggantikan proses berpikir kritis dan kreativitas peneliti.',
                  icon: Award,
                },
                {
                  title: 'Kolaborasi Manusia-AI',
                  description:
                    'Kami percaya pada kekuatan kolaborasi antara kecerdasan manusia dan buatan. Platform kami memungkinkan kontrol penuh di tangan pengguna dengan dukungan AI yang cerdas.',
                  icon: Users,
                },
                {
                  title: 'Kualitas & Akurasi',
                  description:
                    'Setiap fitur yang kami kembangkan berfokus pada peningkatan kualitas dan akurasi penulisan akademik, dengan mempertimbangkan standar internasional dan lokal.',
                  icon: Target,
                },
                {
                  title: 'Aksesibilitas',
                  description:
                    'Kami berkomitmen untuk membuat teknologi penulisan akademik canggih dapat diakses oleh semua kalangan peneliti dan mahasiswa di Indonesia.',
                  icon: BookOpen,
                },
              ].map((value, index) => (
                <Card
                  key={index}
                  className="border-border bg-card hover:bg-card/80 transition-all duration-300 hover:scale-[1.02]"
                >
                  <CardContent className="p-8">
                    <div className="w-14 h-14 bg-primary/10 flex items-center justify-center rounded-[3px] mb-6">
                      <value.icon className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-4 text-foreground">{value.title}</h3>
                    <p className="leading-relaxed text-muted-foreground">{value.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-6 py-20 text-center border-t border-border">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-semibold mb-6 leading-tight text-foreground font-heading">
              Bergabunglah dengan <span className="text-primary">Revolusi</span> Penulisan Akademik
            </h2>
            <p className="text-xl mb-8 leading-relaxed text-muted-foreground">
              Mulai perjalanan penulisan akademik Anda dengan dukungan AI yang cerdas dan metodologi yang terbukti
              efektif.
            </p>
            <div className="flex justify-center gap-4">
              <Button asChild size="lg">
                <Link href="/chat">Mulai Menulis</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/documentation">Pelajari Lebih Lanjut</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Contact & Career Section */}
        <section className="px-6 py-20 border-t border-border">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12">
              {/* Contact Section */}
              <Card
                id="hubungi-kami"
                className="border-border bg-card hover:bg-card/80 transition-all duration-300 hover:scale-[1.02]"
              >
                <CardContent className="p-8">
                  <div className="w-14 h-14 bg-primary/10 flex items-center justify-center rounded-[3px] mb-6">
                    <Mail className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-4 text-foreground font-heading">Hubungi Kami</h3>
                  <p className="leading-relaxed mb-6 text-muted-foreground">
                    Punya pertanyaan, saran, atau ingin berkolaborasi? Tim kami siap membantu Anda. Jangan ragu untuk
                    menghubungi kami kapan saja.
                  </p>
                  <Button asChild>
                    <a href="mailto:contact@makalah.ai" target="_blank" rel="noopener noreferrer">
                      <Mail className="w-4 h-4 mr-2" />
                      contact@makalah.ai
                    </a>
                  </Button>
                </CardContent>
              </Card>

              {/* Career Section */}
              <Card
                id="bergabung-dengan-tim"
                className="border-border bg-card hover:bg-card/80 transition-all duration-300 hover:scale-[1.02]"
              >
                <CardContent className="p-8">
                  <div className="w-14 h-14 bg-primary/10 flex items-center justify-center rounded-[3px] mb-6">
                    <Briefcase className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-4 text-foreground font-heading">Bergabung dengan Tim</h3>
                  <p className="leading-relaxed mb-6 text-muted-foreground">
                    Kami selalu mencari talenta terbaik untuk bergabung dalam misi mengembangkan teknologi penulisan
                    akademik. Mari bersama membangun masa depan pendidikan Indonesia.
                  </p>
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-muted-foreground">Posisi yang tersedia:</div>
                    <ul className="text-sm space-y-2 text-muted-foreground">
                      <li>• AI/ML Engineer</li>
                      <li>• Full-Stack Developer</li>
                      <li>• Academic Content Specialist</li>
                      <li>• Product Manager</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}