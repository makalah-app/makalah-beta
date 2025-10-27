import type { Metadata } from 'next';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import {
  AlertTriangle,
  BookOpen,
  Brain,
  Building2,
  ClipboardList,
  Clock,
  Eye,
  FileText,
  GitBranch,
  GitMerge,
  GraduationCap,
  Lightbulb,
  Lock,
  MessageSquare,
  Workflow,
  Search,
  Share2,
  Shield,
  ShieldCheck,
  Sparkles,
  UserCog,
  Briefcase,
  Quote,
  Mail,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Tentang | Makalah AI',
  description:
    'AI Yang Menumbuhkan Pikiran. Platform untuk penggunaan AI akademik yang transparan, akuntabel, dan terdidik; lengkap jejak pakai, sitasi, versioning, dan research graph.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="px-6 py-20 text-center relative hero-vivid hero-grid-thin">
        <div className="relative z-10 max-w-3xl mx-auto space-y-4">
          <h1 className="text-3xl md:text-4xl font-semibold leading-tight font-heading">
            AI Yang Menumbuhkan Pikiran
          </h1>
          <p className="text-lg md:text-md text-white">
            Teknologi tidak menggantikan manusia, melainkan melengkapi agar kian berdaya
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <a
              href="https://mail.google.com/mail/?view=cm&fs=1&to=dukungan@makalah.ai&su=Pertanyaan%20tentang%20Makalah%20AI&body=Halo%20Tim%20Makalah%2C%0A%0ASaya%20ingin%20bertanya%20tentang%20...%0A%0ATerima%20kasih."
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: 'default' }), 'btn-green-solid')}
            >
              Hubungi Kami
            </a>
          </div>
        </div>
      </section>

      {/* Manifesto */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto space-y-6">
          <h2 className="text-2xl md:text-3xl font-semibold font-heading text-center">Jadi, begini...</h2>
          {/* Ringkasan singkat selalu tampil */}
          <div className="prose prose-invert max-w-none text-foreground">
            <h5>
              Platform ini disiapkan untuk merespons disrupsi teknologi dalam aktivitas akademik dan riset. Laju
              pemakaian AI/<em>Large Language Model</em> nggak bisa dihindari. Pelarangan penggunaannya di lingkungan akademik hanya memicu ketidakjujuran:
              ngomongnya nggak pakai, padahal diam-diam menggunakan.
            </h5>
          </div>

          {/* Read more ala Accordion */}
          <div className="relative pt-6">
            <Accordion type="single" collapsible>
              <AccordionItem value="manifesto-more" className="border-0">
                <AccordionTrigger
                  aria-label="Baca selengkapnya Manifesto"
                  className="absolute -top-4 left-1/2 -translate-x-1/2 h-9 w-9 rounded-full bg-card shadow-sm flex items-center justify-center p-0 hover:no-underline [&>svg]:text-muted-foreground/70"
                >
                </AccordionTrigger>
                <AccordionContent className="mt-2">
                  <div className="prose prose-invert max-w-none text-muted-foreground">
                    <p>
                      Bagaimana dengan detektor AI—apakah absah? Problematik. Detektor AI rawan <em>false positive</em>{' '}
                      dan hanya mengeluarkan persentase probabilitas tanpa argumen jelas. Selama tulisan mengikuti
                      struktur subjek–predikat–objek–keterangan, kalimat apa pun bisa terdeteksi “buatan AI”.
                    </p>
                    <p>
                      Yang diperlukan sekarang: mengatur penggunaan AI agar transparan, bisa dipertanggungjawabkan, dan
                      punya riwayat pemakaian yang akuntabel. Siapa pun bisa dilacak: apakah paper dibuatkan AI, atau
                      dibuat bersama AI? Bukankah itu dua hal yang berbeda?
                    </p>
                    <p>
                      Makalah berdiri di posisi: Penggunaan AI harus transparan, terjejak, dan terdidik.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>

      {/* Apa Persoalan Yang Dijawab (Accordion mobile, Cards desktop) */}
      <section className="px-6 py-16 border-t border-border">
        <div className="max-w-6xl mx-auto space-y-6">
          <h2 className="text-2xl md:text-3xl font-semibold font-heading text-center">Apa Saja Persoalan Yang Dijawab?</h2>
          {/* Mobile: Accordion */}
          <div className="md:hidden">
            <Accordion type="single" collapsible>
              {[
                {
                  title: 'Mematikan Rasa Ingin Tahu',
                  description:
                    'AI sering bikin malas berpikir. Makalah justru memantik diskusi dan menyangga teknis penulisan, supaya fokus ke tajamnya gagasan.',
                  icon: Brain,
                },
                {
                  title: 'Prompting Yang Ribet',
                  description:
                    'Makalah lepas dari prompt kompleks. Agen memahami kebutuhan lewat percakapan alamiah yang iteratif.',
                  icon: MessageSquare,
                },
                {
                  title: 'Kontribusi Siapa?',
                  description:
                    'Gagasan milik manusia, AI hanya tukang. Paper dibuat bersama AI—bukan dibuatkan AI.',
                  icon: UserCog,
                },
                {
                  title: 'Sitasi & Provenance',
                  description: 'Sumber dan asal-ide sering kabur. Makalah bantu sitasi ketat dan jejak ide.',
                  icon: Quote,
                },
                {
                  title: 'Versi & Kolaborasi',
                  description: 'Perubahan tercecer. Makalah sediakan versioning yang jelas dan bisa diaudit.',
                  icon: GitBranch,
                },
                {
                  title: 'Deteksi AI Problematik',
                  description:
                    '“AI atau bukan” tidak dapat dipertanggungjawabkan. Makalah mendorong transparansi penggunaan, bukan sekadar deteksi.',
                  icon: AlertTriangle,
              },
            ].map((item, idx) => (
              <AccordionItem key={idx} value={`problem-${idx}`}>
                <AccordionTrigger className="text-left font-medium text-foreground hover:no-underline py-3">
                  {item.title}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4 leading-relaxed">
                  {item.description}
                </AccordionContent>
              </AccordionItem>
            ))}
            </Accordion>
          </div>

          {/* Desktop: Cards */}
          <div className="hidden md:grid md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                title: 'Mematikan Rasa Ingin Tahu',
                description:
                  'AI sering bikin malas berpikir. Makalah justru memantik diskusi dan menyangga teknis penulisan, supaya fokus ke tajamnya gagasan.',
                icon: Brain,
              },
              {
                title: 'Prompting Yang Ribet',
                description:
                  'Makalah lepas dari prompt kompleks. Agen memahami kebutuhan lewat percakapan alamiah yang iteratif.',
                icon: MessageSquare,
              },
              {
                title: 'Kontribusi Siapa?',
                description:
                  'Gagasan milik manusia, AI hanya tukang. Paper dibuat bersama AI—bukan dibuatkan AI.',
                icon: UserCog,
              },
              {
                title: 'Sitasi & Provenance',
                description: 'Sumber dan asal-ide sering kabur. Makalah bantu sitasi ketat dan jejak ide.',
                icon: Quote,
              },
              {
                title: 'Versi & Kolaborasi',
                description: 'Perubahan tercecer. Makalah sediakan versioning yang jelas dan bisa diaudit.',
                icon: GitBranch,
              },
              {
                title: 'Deteksi AI Problematik',
                description:
                  '“AI atau bukan” tidak dapat dipertanggungjawabkan. Makalah mendorong transparansi penggunaan, bukan sekadar deteksi.',
                icon: AlertTriangle,
              },
            ].map((item, idx) => (
              <Card key={idx} className="border-border bg-card hover:bg-card/80 transition-colors">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-primary/10 rounded flex items-center justify-center mb-4">
                    <item.icon className="w-6 h-6 text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Solusi Inti Makalah (Accordion mobile, Cards desktop) */}
      <section className="px-6 py-16 border-t border-border">
        <div className="max-w-6xl mx-auto space-y-6">
          <h2 className="text-2xl md:text-3xl font-semibold font-heading text-center">Solusi Makalah</h2>
          {/* Mobile: Accordion */}
          <div className="md:hidden">
            <Accordion type="single" collapsible>
              {[
                {
                  title: 'Jejak Pakai Transparan',
                  description: 'Timeline siapa-melakukan-apa; bedakan intervensi AI vs manusia.',
                  icon: Clock,
                },
                {
                  title: 'Cite-as-you-write',
                  description: 'Sitasi dan referensi saat menulis, lengkap metadata.',
                  icon: FileText,
                },
                {
                  title: 'Versioning & Diff',
                  description: 'Bandingkan perubahan; rekomendasi AI vs edit penulis terbaca jelas.',
                  icon: GitMerge,
                },
                {
                  title: 'Research Graph',
                  description: 'Peta konsep–referensi–penelitian untuk menemukan celah (gap).',
                  icon: Workflow,
                },
                {
                  title: 'Reviewer Toolkit',
                  description: 'Cek struktur, koherensi, dan kelengkapan metodologis.',
                  icon: ClipboardList,
                },
                {
                  title: 'Laporan Kepatuhan',
                  description: 'Ringkasan penggunaan AI siap diserahkan ke dosen/jurnal.',
                  icon: ShieldCheck,
              },
            ].map((item, idx) => (
              <AccordionItem key={idx} value={`solution-${idx}`}>
                <AccordionTrigger className="text-left font-medium text-foreground hover:no-underline py-3">
                  {item.title}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4 leading-relaxed">
                  {item.description}
                </AccordionContent>
              </AccordionItem>
            ))}
            </Accordion>
          </div>

          {/* Desktop: Cards */}
          <div className="hidden md:grid md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                title: 'Jejak Pakai Transparan',
                description: 'Timeline siapa-melakukan-apa; bedakan intervensi AI vs manusia.',
                icon: Clock,
              },
              {
                title: 'Cite-as-you-write',
                description: 'Sitasi dan referensi saat menulis, lengkap metadata.',
                icon: FileText,
              },
              {
                title: 'Versioning & Diff',
                description: 'Bandingkan perubahan; rekomendasi AI vs edit penulis terbaca jelas.',
                icon: GitMerge,
              },
              {
                title: 'Research Graph',
                description: 'Peta konsep–referensi–penelitian untuk menemukan celah (gap).',
                icon: Workflow,
              },
              {
                title: 'Reviewer Toolkit',
                description: 'Cek struktur, koherensi, dan kelengkapan metodologis.',
                icon: ClipboardList,
              },
              {
                title: 'Laporan Kepatuhan',
                description: 'Ringkasan penggunaan AI siap diserahkan ke dosen/jurnal.',
                icon: ShieldCheck,
              },
            ].map((item, idx) => (
              <Card key={idx} className="border-border bg-card hover:bg-card/80 transition-colors">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-primary/10 rounded flex items-center justify-center mb-4">
                    <item.icon className="w-6 h-6 text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      

      {/* Masa Depan Makalah (Peran/Agen) — Accordion mobile, Cards desktop */}
      <section className="px-6 py-16 border-t border-border">
        <div className="max-w-6xl mx-auto space-y-6">
          <h2 className="text-2xl md:text-3xl font-semibold font-heading text-center">Ai Agents</h2>
          {/* Mobile: Accordion */}
          <div className="md:hidden">
            <Accordion type="single" collapsible>
              {[
              {
                title: 'Sparring Partner',
                description:
                  'Agen Ai mendampingi riset sekaligus lawan diskusi. Berperan sebagai juru tulis pengguna. Pengguna fokus berpikir tanpa direporkan persoalan teknis dan prompting. Paper tetap orisinal, buah pikiran pengguna.',
                icon: MessageSquare,
                status: 'available' as const,
              },
              {
                title: 'Dosen Pembimbing',
                description: 'Agen Ai berperan sebagai Dosen Pembimbing, yang memberikan arahan struktur, kritik metodologi, dan petunjuk milestone. Dengan demikian, pengguna masuk dalam pengalaman: seperti berbincang dengan dosen pembimbing',
                icon: BookOpen,
                status: 'building' as const,
              },
              {
                title: 'Peer Reviewer',
                description: 'Agen Ai berperan layaknya kawan debat, yang memberikan review kritis pada paper pengguna, lengkap dengan catatan argumen & referensi.',
                icon: Search,
                status: 'building' as const,
              },
              {
                title: 'Gap Thinker',
                description: 'Agen Ai menyorot celah riset dari berbagai paper referensi awal, menemukan potensi topik baru yang lebih segar.',
                icon: Lightbulb,
                status: 'building' as const,
              },
              {
                title: 'Novelty Finder',
                description: 'Agen Ai yang mampu memetakan kebaruan dan posisi kontribusi penyusun paper, dalam topik yang telah banyak diulas.',
                icon: Sparkles,
                status: 'building' as const,
              },
              {
                title: 'Graph Elaborator',
                description: 'Bayangkan, pengguna mengirimkan konsep tertentu, kemudian agen Ai memetakan konsep itu dalam bentuk grafik, mengaitkannya dengan referensi pendukung, serta konsep-konsep sejenis yang pernah ada sebelumnya. Memudahkan pemahaman? Tentu. Bahkan mendukung pembelajaran cepat. Ya, itu akan ada dalam Makalah',
                icon: Share2,
                status: 'building' as const,
              },
            ].map((item, idx) => (
              <AccordionItem key={idx} value={`role-${idx}`}>
                <AccordionTrigger className="text-left font-medium text-foreground hover:no-underline py-3">
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                      <item.icon className="w-4 h-4 text-primary" aria-hidden="true" />
                    </div>
                    <span className="mr-auto">{item.title}</span>
                    <Badge
                      variant={item.status === 'available' ? 'default' : 'secondary'}
                      className="ml-2 shrink-0 px-2 py-0.5 text-[10px]"
                    >
                      {item.status === 'available' ? 'Tersedia' : 'Proses'}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4 leading-relaxed">
                  {item.description}
                </AccordionContent>
              </AccordionItem>
            ))}
            </Accordion>
          </div>

          {/* Desktop: Cards */}
          <div className="hidden md:grid md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                title: 'Sparring Partner',
                description:
                  'Agen Ai mendampingi riset sekaligus lawan diskusi. Berperan sebagai juru tulis pengguna. Pengguna fokus berpikir tanpa direporkan persoalan teknis dan prompting. Paper tetap orisinal, buah pikiran pengguna.',
                icon: MessageSquare,
                status: 'available' as const,
              },
              {
                title: 'Dosen Pembimbing',
                description: 'Agen Ai berperan sebagai Dosen Pembimbing, yang memberikan arahan struktur, kritik metodologi, dan petunjuk milestone. Dengan demikian, pengguna masuk dalam pengalaman: seperti berbincang dengan dosen pembimbing',
                icon: BookOpen,
                status: 'building' as const,
              },
              {
                title: 'Peer Reviewer',
                description: 'Agen Ai berperan layaknya kawan debat, yang memberikan review kritis pada paper pengguna, lengkap dengan catatan argumen & referensi.',
                icon: Search,
                status: 'building' as const,
              },
              {
                title: 'Gap Thinker',
                description: 'Agen Ai yang mampu menyorot celah riset dari berbagai paper referensi awal, menemukan potensi topik baru yang lebih besar.',
                icon: Lightbulb,
                status: 'building' as const,
              },
              {
                title: 'Novelty Finder',
                description: 'Agen Ai yang mampu memetakan kebaruan dan posisi kontribusi dalam satu topik yang telah banyak diulas.',
                icon: Sparkles,
                status: 'building' as const,
              },
              {
                title: 'Graph Elaborator',
                description: 'Bayangkan, pengguna mengirimkan konsep tertentu, kemudian agen Ai memetakan konsep itu dalam bentuk grafik, mengaitkannya dengan referensi pendukung, serta konsep-konsep sejenis yang pernah ada sebelumnya. Ya, itu akan ada dalam Makalah',
                icon: Share2,
                status: 'building' as const,
              },
            ].map((item, idx) => (
              <Card key={idx} className="border-border bg-card hover:bg-card/80 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 bg-primary/10 rounded flex items-center justify-center">
                      <item.icon className="w-6 h-6 text-primary" aria-hidden="true" />
                    </div>
                     <Badge
                       variant={item.status === 'available' ? 'default' : 'secondary'}
                       className="px-2 py-0.5 text-[10px]"
                     >
                       {item.status === 'available' ? 'Tersedia' : 'Proses'}
                     </Badge>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Prinsip & Etika Penggunaan AI (Accordion mobile, Cards desktop) */}
      <section className="px-6 py-16 border-t border-border">
        <div className="max-w-6xl mx-auto space-y-6">
          <h2 className="text-2xl md:text-3xl font-semibold font-heading text-center">Prinsip &amp; Etika</h2>
          {/* Mobile: Accordion */}
          <div className="md:hidden">
            <Accordion type="single" collapsible>
              {[
              {
                title: 'Transparansi',
                description: 'Semua intervensi AI tercatat. Porsi kontribusi terlihat jelas.',
                icon: Eye,
              },
              {
                title: 'Akuntabilitas',
                description: 'Penulis paham dan menyetujui setiap rekomendasi AI.',
                icon: Shield,
              },
              {
                title: 'Sitasi Ketat',
                description: 'Semua ide/teks yang dipengaruhi sumber tercantum.',
                icon: Quote,
              },
              {
                title: 'Privasi & Keamanan',
                description: 'Data riset dilindungi, akses berbasis peran, jejak diaudit.',
                icon: Lock,
              },
            ].map((item, idx) => (
              <AccordionItem key={idx} value={`principle-${idx}`}>
                <AccordionTrigger className="text-left font-medium text-foreground hover:no-underline py-3">
                  {item.title}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4 leading-relaxed">
                  {item.description}
                </AccordionContent>
              </AccordionItem>
            ))}
            </Accordion>
          </div>

          {/* Desktop: Cards */}
          <div className="hidden md:grid md:grid-cols-2 xl:grid-cols-4 gap-6 md:gap-8">
            {[
              {
                title: 'Transparansi',
                description: 'Semua intervensi AI tercatat. Porsi kontribusi terlihat jelas.',
                icon: Eye,
              },
              {
                title: 'Akuntabilitas',
                description: 'Penulis paham dan menyetujui setiap rekomendasi AI.',
                icon: Shield,
              },
              {
                title: 'Sitasi Ketat',
                description: 'Semua ide/teks yang dipengaruhi sumber tercantum.',
                icon: Quote,
              },
              {
                title: 'Privasi & Keamanan',
                description: 'Data riset dilindungi, akses berbasis peran, jejak diaudit.',
                icon: Lock,
              },
            ].map((item, idx) => (
              <Card key={idx} className="border-border bg-card hover:bg-card/80 transition-colors">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-primary/10 rounded flex items-center justify-center mb-4">
                    <item.icon className="w-6 h-6 text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Karier & Kontak (Accordion mobile, Cards desktop side by side) */}
      <section id="karier-kontak" className="px-6 py-16 border-t border-border">
        <div className="max-w-6xl mx-auto space-y-6">
          <h2 className="text-2xl md:text-3xl font-semibold font-heading text-center">Karier &amp; Kontak</h2>

          {/* Mobile: Accordion */}
          <div className="md:hidden">
            <Accordion type="single" collapsible>
              <AccordionItem value="career">
                <AccordionTrigger className="text-left font-medium text-foreground hover:no-underline py-3">
                  Bergabung dengan Makalah
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4 leading-relaxed">
                  <p>
                   Saat ini belum ada pembukaan resmi. Update posisi akan kami tampilkan di halaman ini.
                  </p>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="contact">
                <AccordionTrigger className="text-left font-medium text-foreground hover:no-underline py-3">
                  Hubungi Kami
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4 leading-relaxed">
                  <div className="space-y-2">
                    <p><strong>PT The Management Asia</strong></p>
                    <p>Menara Cakrawala 12th floor unit 05A</p>
                    <p>Jalan MH. Thamrin, Jakarta Pusat</p>
                    <p>dukungan@makalah.ai</p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Desktop: Cards side by side */}
          <div className="hidden md:grid md:grid-cols-2 gap-6 md:gap-8">
            {/* Karier Card */}
            <Card className="border-border bg-card">
              <CardContent className="p-6 md:p-8">
                <div className="w-12 h-12 bg-primary/10 rounded flex items-center justify-center mb-4">
                  <Briefcase className="w-6 h-6 text-primary" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Karier</h3>
                <p className="text-muted-foreground">
                  Saat ini belum ada pembukaan resmi. Update posisi akan kami tampilkan di halaman ini.
                </p>
              </CardContent>
            </Card>

            {/* Kontak Card */}
            <Card className="border-border bg-card">
              <CardContent className="p-6 md:p-8">
                <div className="w-12 h-12 bg-primary/10 rounded flex items-center justify-center mb-4">
                  <Mail className="w-6 h-6 text-primary" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Kontak</h3>
                <div className="space-y-2">
                  <p className="text-muted-foreground"><strong>PT The Management Asia</strong></p>
                  <p className="text-muted-foreground">Menara Cakrawala 12th floor unit 05A</p>
                  <p className="text-muted-foreground">Jalan MH. Thamrin, Jakarta Pusat</p>
                  <p className="text-muted-foreground">dukungan@makalah.ai</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
