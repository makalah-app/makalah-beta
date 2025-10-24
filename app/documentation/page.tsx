'use client';

import { useState } from 'react';
import { ChevronRight, Book, FileText, Zap, Settings, Users, HelpCircle, Search, Brain, Shield, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Helper functions - dipindahkan keluar untuk reusability
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

const renderContent = (activeSection: string, setActiveSection: (id: string) => void) => {
  switch (activeSection) {
    case 'welcome':
      return (
        <div className="space-y-8">
          <div>
            <div className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-2">Mulai</div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-3xl font-semibold text-foreground">Selamat Datang</h1>
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
              <Card className="hover:bg-card/70 transition-colors cursor-pointer" onClick={() => setActiveSection && setActiveSection('quickstart')}>
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

              <Card className="hover:bg-card/70 transition-colors cursor-pointer" onClick={() => setActiveSection && setActiveSection('workflow')}>
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

export default function DocumentationPage() {
  const [activeSection, setActiveSection] = useState('welcome');

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
          {/* Left: Sidebar untuk Desktop */}
          <div className="w-64 min-h-screen border-r border-border p-6 overflow-y-auto bg-card/30 hidden md:flex flex-col">
            {/* Desktop Search */}
            <div className="mb-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cari dokumentasi..."
                  className="pl-10 border-border"
                />
              </div>
            </div>

            {/* Desktop Navigation */}
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
                            className={`w-full flex items-center px-3 py-2 text-sm transition-colors hover:bg-muted/50 rounded ${
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

          {/* Right: Main Content */}
          <div className="flex-1 p-4 md:p-8 max-w-4xl overflow-y-auto">
            {renderContent(activeSection, setActiveSection)}
          </div>
      </div>
    </div>
  );
}