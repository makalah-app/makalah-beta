'use client';

import { useState } from 'react';
import { ChevronRight, Book, FileText, Zap, Settings, Users, HelpCircle, Search, Brain, Shield, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DocumentationPage() {
  const [activeSection, setActiveSection] = useState('welcome');

  const navigationSections = [
    {
      title: 'Mulai',
      items: [
        { id: 'welcome', label: 'Selamat Datang', icon: Book },
        { id: 'installation', label: 'Memulai', icon: Settings },
        { id: 'quickstart', label: 'Panduan Cepat', icon: Zap },
        { id: 'concepts', label: 'Konsep Dasar', icon: FileText },
      ],
    },
    {
      title: 'Fitur Utama',
      items: [
        { id: 'chat-agent', label: 'Chat dengan AI', icon: Users },
        { id: 'artifact-system', label: 'Sistem Penelitian', icon: FileText },
        { id: 'workflow', label: '7 Fase Penulisan', icon: Settings },
        { id: 'collaboration', label: 'Kolaborasi Tim', icon: Users },
      ],
    },
    {
      title: 'Panduan Lanjutan',
      items: [
        { id: 'best-practices', label: 'Best Practices', icon: Zap },
        { id: 'troubleshooting', label: 'Troubleshooting', icon: HelpCircle },
        { id: 'security', label: 'Keamanan Data', icon: Shield },
        { id: 'privacy-policy', label: 'Kebijakan Privasi', icon: Globe },
      ],
    },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'welcome':
        return (
          <div className="space-y-8">
            <div>
              <div className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-2">Mulai</div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-[3px] bg-primary/10 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-primary" />
                </div>
                <h1 className="text-4xl font-semibold text-foreground">Selamat Datang</h1>
              </div>
              <p className="text-lg mb-8 text-muted-foreground">
                Pelajari tentang Makalah AI dan cara memulai menulis makalah akademik yang lebih baik
              </p>
            </div>

            <div className="space-y-6">
              <p className="text-muted-foreground">
                Makalah AI adalah platform kolaborasi penulisan makalah akademik berbasis AI yang memandu Anda melalui 7
                fase terstruktur untuk menghasilkan karya akademik berkualitas tinggi. Platform ini dirancang khusus
                untuk peneliti dan mahasiswa Indonesia yang ingin meningkatkan kualitas penulisan akademik mereka.
              </p>

              <Card className="border-l-4 border-l-primary">
                <CardHeader>
                  <CardTitle className="text-primary">Fitur Utama</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>
                      • <strong>Chat dengan AI Agent</strong> - Berinteraksi langsung dengan AI untuk panduan penulisan
                    </li>
                    <li>
                      • <strong>Sistem Penelitian</strong> - Kelola dokumen dan file penelitian dengan mudah
                    </li>
                    <li>
                      • <strong>7 Fase Terstruktur</strong> - Proses penulisan yang sistematis dan terarah
                    </li>
                    <li>
                      • <strong>Web Search Integration</strong> - Pencarian akademik yang terintegrasi dengan AI
                    </li>
                    <li>
                      • <strong>Kolaborasi Real-time</strong> - Bekerja sama dengan tim peneliti lainnya
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-6">
                <Card className="hover:bg-card/70 transition-colors cursor-pointer" onClick={() => setActiveSection('quickstart')}>
                  <CardHeader>
                    <Zap className="w-8 h-8 mb-2 text-primary" />
                    <CardTitle className="text-lg">Panduan Cepat</CardTitle>
                    <CardDescription>
                      Mulai menulis makalah pertama Anda dalam 5 menit dengan panduan langkah demi langkah.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button size="sm">
                      Mulai Sekarang
                    </Button>
                  </CardContent>
                </Card>

                <Card className="hover:bg-card/70 transition-colors cursor-pointer" onClick={() => setActiveSection('workflow')}>
                  <CardHeader>
                    <Book className="w-8 h-8 mb-2 text-primary" />
                    <CardTitle className="text-lg">7 Fase Penulisan</CardTitle>
                    <CardDescription>
                      Pelajari metodologi yang telah terbukti efektif untuk penulisan akademik.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button size="sm">
                      Pelajari Lebih Lanjut
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        );

      case 'quickstart':
        return (
          <div className="space-y-8">
            <div>
              <div className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-2">Mulai</div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-[3px] bg-primary/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <h1 className="text-4xl font-semibold text-foreground">Panduan Cepat</h1>
              </div>
              <p className="text-lg mb-8 text-muted-foreground">
                Mulai menulis makalah akademik pertama Anda dalam 5 menit
              </p>
            </div>

            <div className="space-y-6">
              <Card className="border-l-4 border-l-primary">
                <CardHeader>
                  <CardTitle className="text-primary">Langkah 1: Mulai Chat Baru</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Klik tombol &ldquo;Chat&rdquo; di navigation header atau gunakan halaman chat. Jelaskan
                    topik makalah yang ingin Anda tulis dengan detail yang jelas.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500">
                <CardHeader>
                  <CardTitle className="text-green-500">Langkah 2: Klarifikasi Topik</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    AI Agent akan membantu Anda mengklarifikasi topik penelitian, ruang lingkup, dan metodologi yang akan
                    digunakan. Berikan feedback yang jelas untuk hasil yang optimal.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-blue-500">
                <CardHeader>
                  <CardTitle className="text-blue-500">Langkah 3: Ikuti 7 Fase</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Sistem akan memandu Anda melalui 7 fase terstruktur: klarifikasi topik, literature review,
                    metodologi, pengumpulan data, analisis, penulisan, dan finalisasi.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'workflow':
        return (
          <div className="space-y-8">
            <div>
              <div className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-2">Fitur Utama</div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-[3px] bg-primary/10 flex items-center justify-center">
                  <Book className="w-5 h-5 text-primary" />
                </div>
                <h1 className="text-4xl font-semibold text-foreground">7 Fase Penulisan</h1>
              </div>
              <p className="text-lg mb-8 text-muted-foreground">
                Metodologi sistematis untuk menghasilkan makalah akademik berkualitas tinggi
              </p>
            </div>

            <div className="grid gap-6">
              {[
                {
                  phase: 1,
                  title: 'Klarifikasi Topik',
                  desc: 'Mendefinisikan topik penelitian dengan jelas dan spesifik',
                },
                { phase: 2, title: 'Kerangka Penelitian', desc: 'Menyusun struktur dan metodologi penelitian' },
                { phase: 3, title: 'Literature Review', desc: 'Menganalisis dan mensintesis literatur yang relevan' },
                { phase: 4, title: 'Pengumpulan Data', desc: 'Merancang dan melaksanakan pengumpulan data' },
                { phase: 5, title: 'Analisis Data', desc: 'Menganalisis data dengan metode yang tepat' },
                { phase: 6, title: 'Penulisan Draft', desc: 'Menyusun draft lengkap makalah akademik' },
                { phase: 7, title: 'Review & Finalisasi', desc: 'Review akhir dan penyempurnaan makalah' },
              ].map((item) => (
                <Card key={item.phase} className="hover:bg-card/70 transition-colors">
                  <CardContent className="pt-6">
                    <div className="flex items-center mb-4">
                      <div className="w-8 h-8 flex items-center justify-center text-white font-semibold mr-4 bg-primary rounded-[3px]">
                        {item.phase}
                      </div>
                      <h3 className="text-xl font-semibold text-foreground">{item.title}</h3>
                    </div>
                    <p className="text-muted-foreground">{item.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 'privacy-policy':
        return (
          <div className="space-y-8">
            <div>
              <div className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-2">Panduan Lanjutan</div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-[3px] bg-primary/10 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-primary" />
                </div>
                <h1 className="text-4xl font-semibold text-foreground">Kebijakan Privasi</h1>
              </div>
              <p className="text-lg mb-8 text-muted-foreground">
                Komitmen kami dalam melindungi privasi dan data pengguna Makalah AI
              </p>
            </div>

            <div className="space-y-8">
              <Card className="border-l-4 border-l-primary">
                <CardHeader>
                  <CardTitle className="text-primary">Informasi yang Kami Kumpulkan</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• Data akun pengguna (nama, email, preferensi)</li>
                    <li>• Konten makalah dan dokumen yang dibuat</li>
                    <li>• Riwayat interaksi dengan AI Agent</li>
                    <li>• Data penggunaan platform untuk peningkatan layanan</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500">
                <CardHeader>
                  <CardTitle className="text-green-500">Penggunaan Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Data yang dikumpulkan digunakan untuk menyediakan layanan penulisan akademik, meningkatkan kualitas AI
                    Agent, dan memberikan pengalaman pengguna yang lebih baik. Kami tidak akan membagikan konten makalah
                    Anda kepada pihak ketiga tanpa persetujuan eksplisit.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-blue-500">
                <CardHeader>
                  <CardTitle className="text-blue-500">Keamanan Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Kami menggunakan enkripsi untuk melindungi data Anda. Semua komunikasi dengan server
                    menggunakan protokol HTTPS dan data disimpan dengan standar keamanan tinggi. Akses ke data dibatasi
                    hanya untuk personel yang berwenang.
                  </p>
                </CardContent>
              </Card>

              <div className="text-sm text-muted-foreground border-t border-border pt-6">
                <p>Terakhir diperbarui: 24 September 2025</p>
                <p>
                  Kebijakan ini dapat berubah sewaktu-waktu. Perubahan akan diberitahukan melalui email atau notifikasi
                  platform.
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-semibold mb-4 text-foreground">Dokumentasi</h1>
              <p className="text-lg text-muted-foreground">
                Pilih topik dari sidebar untuk mempelajari lebih lanjut tentang Makalah AI.
              </p>
            </div>
          </div>
        );
    }
  };

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

      <div className="relative z-10 flex">
        {/* Sidebar */}
        <div className="w-64 min-h-screen border-r border-border p-6 overflow-y-auto bg-card/30">
          {/* Search */}
          <div className="mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari dokumentasi..."
                className="pl-10 border-border"
              />
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-8">
            {navigationSections.map((section) => (
              <div key={section.title}>
                <h3 className="text-sm font-medium mb-4 tracking-wider uppercase text-muted-foreground">
                  {section.title}
                </h3>
                <ul className="space-y-2">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeSection === item.id;
                    return (
                      <li key={item.id}>
                        <button
                          onClick={() => setActiveSection(item.id)}
                          className={`w-full flex items-center px-3 py-2 text-sm transition-colors hover:bg-muted/50 rounded-[3px] ${
                            isActive ? 'font-medium bg-muted/70 text-primary' : 'text-muted-foreground'
                          }`}
                        >
                          <Icon className="w-4 h-4 mr-3" />
                          {item.label}
                          {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8 max-w-4xl">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
