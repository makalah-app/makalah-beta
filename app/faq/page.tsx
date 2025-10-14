'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Brain, Search, MessageCircle, Users, Shield, HelpCircle } from 'lucide-react';

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const faqCategories = [
    {
      title: 'Umum',
      icon: HelpCircle,
      questions: [
        {
          question: 'Apa itu Makalah AI?',
          answer:
            'Makalah AI adalah platform kolaborasi penulisan makalah akademik berbasis AI yang membantu mahasiswa, peneliti, dan akademisi dalam menyusun karya tulis ilmiah dengan 7 fase terstruktur dan dukungan kecerdasan buatan.',
        },
        {
          question: 'Bagaimana cara memulai menggunakan platform ini?',
          answer:
            'Anda dapat memulai dengan mendaftar akun, kemudian memilih template makalah yang sesuai dengan bidang studi Anda. Platform akan memandu Anda melalui 7 fase penulisan yang terstruktur.',
        },
        {
          question: 'Apakah platform ini gratis?',
          answer:
            'Kami menyediakan paket gratis dengan fitur dasar, serta paket premium dengan fitur AI yang lebih canggih dan kapasitas penyimpanan yang lebih besar.',
        },
      ],
    },
    {
      title: 'Fitur AI',
      icon: Brain,
      questions: [
        {
          question: 'Bagaimana AI membantu dalam penulisan makalah?',
          answer:
            'AI kami membantu dalam berbagai aspek: memberikan saran struktur, memeriksa tata bahasa, memberikan rekomendasi referensi, menganalisis konsistensi argumen, dan membantu parafrase untuk menghindari plagiarisme.',
        },
        {
          question: 'Apakah AI akan menulis seluruh makalah untuk saya?',
          answer:
            'Tidak. AI berfungsi sebagai asisten yang membantu dan membimbing proses penulisan Anda. Konten utama dan ide-ide orisinal tetap berasal dari Anda sebagai penulis.',
        },
        {
          question: 'Seberapa akurat saran yang diberikan AI?',
          answer:
            'AI kami dilatih dengan jutaan dokumen akademik dan terus diperbarui. Namun, kami selalu menyarankan untuk melakukan verifikasi dan review manual terhadap semua saran yang diberikan.',
        },
      ],
    },
    {
      title: 'Kolaborasi',
      icon: Users,
      questions: [
        {
          question: 'Bagaimana cara berkolaborasi dengan tim?',
          answer:
            'Anda dapat mengundang anggota tim melalui email, memberikan akses dengan level yang berbeda (editor, reviewer, viewer), dan melakukan real-time collaboration dengan fitur komentar dan track changes.',
        },
        {
          question: 'Berapa banyak orang yang bisa berkolaborasi dalam satu proyek?',
          answer:
            'Paket gratis mendukung hingga 3 kolaborator, paket premium mendukung hingga 10 kolaborator, dan paket enterprise tidak terbatas.',
        },
        {
          question: 'Bagaimana cara mengelola versi dokumen?',
          answer:
            'Platform kami menyimpan riwayat perubahan secara otomatis, memungkinkan Anda untuk melihat siapa yang membuat perubahan, kapan, dan mengembalikan ke versi sebelumnya jika diperlukan.',
        },
      ],
    },
    {
      title: 'Keamanan',
      icon: Shield,
      questions: [
        {
          question: 'Apakah data saya aman?',
          answer:
            'Ya, kami menggunakan enkripsi end-to-end, penyimpanan cloud yang aman, dan mematuhi standar keamanan internasional. Data Anda tidak akan dibagikan kepada pihak ketiga tanpa persetujuan.',
        },
        {
          question: 'Bagaimana dengan hak kekayaan intelektual?',
          answer:
            'Semua konten yang Anda buat tetap menjadi milik Anda sepenuhnya. Kami tidak mengklaim hak atas karya tulis yang dihasilkan menggunakan platform kami.',
        },
        {
          question: 'Apakah ada backup otomatis?',
          answer:
            'Ya, sistem kami melakukan backup otomatis setiap beberapa menit dan menyimpan multiple copies di server yang berbeda untuk memastikan data Anda tidak hilang.',
        },
      ],
    },
  ];

  const filteredCategories = faqCategories
    .map((category) => ({
      ...category,
      questions: category.questions.filter(
        (q) =>
          q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          q.answer.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((category) => category.questions.length > 0);

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section with CSS illustration (non full-viewport) */}
      <section className="px-6 py-20 text-center relative hero-vivid hero-grid-thin">
        <div className="relative z-10">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded bg-primary/10 flex items-center justify-center">
              <HelpCircle className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold mb-6 leading-tight text-foreground font-heading">
            Frequently Asked <span className="text-primary">Questions</span>
          </h1>
          <p className="text-xl mb-8 max-w-3xl mx-auto leading-relaxed text-white">
            Temukan jawaban untuk pertanyaan yang sering diajukan tentang platform Makalah AI
          </p>
        </div>
      </section>

      <div className="relative z-10">
        {/* Search Section */}
        <section className="px-6 py-8 border-t border-border">
          <div className="max-w-2xl mx-auto">
            <Card className="border-border bg-card hover:bg-card/80 transition-all duration-300">
              <div className="p-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Cari pertanyaan..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 text-base bg-background border-border focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent"
                  />
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* FAQ Categories */}
        <section className="px-6 py-12 border-t border-border">
          <div className="max-w-4xl mx-auto space-y-8">
            {filteredCategories.map((category, categoryIndex) => (
              <Card
                key={categoryIndex}
                className="border-border bg-card hover:bg-card/80 transition-all duration-300 hover:scale-[1.01]"
              >
                <div className="p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center">
                      <category.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h2 className="text-2xl font-semibold text-foreground font-heading">{category.title}</h2>
                  </div>

                  <Accordion type="single" collapsible className="space-y-3">
                    {category.questions.map((faq, faqIndex) => (
                      <AccordionItem
                        key={faqIndex}
                        value={`${categoryIndex}-${faqIndex}`}
                        className="border border-border rounded px-4 bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <AccordionTrigger className="text-left font-medium text-foreground hover:no-underline py-4">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground pb-4 leading-relaxed">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Contact Support Section */}
        <section className="px-6 py-20 border-t border-border">
          <div className="max-w-2xl mx-auto">
            <Card className="border-border bg-card hover:bg-card/80 transition-all duration-300 hover:scale-[1.02]">
              <div className="p-8 text-center">
                <div className="w-14 h-14 bg-primary/10 flex items-center justify-center rounded mb-6 mx-auto">
                  <MessageCircle className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold mb-4 text-foreground font-heading">
                  Tidak menemukan jawaban yang Anda cari?
                </h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Tim support kami siap membantu Anda dengan pertanyaan apapun
                </p>
                <Button size="lg" className="btn-green-solid">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Hubungi Support
                </Button>
              </div>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
