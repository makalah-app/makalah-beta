'use client';

import { useMemo, useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Book, FileText, Zap, Settings, Users, Search, Brain, Shield, Globe, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

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
    ],
  },
  {
    title: 'Panduan Lanjutan',
    items: [
      { id: 'security', label: 'Keamanan Data', icon: Shield },
      { id: 'privacy-policy', label: 'Kebijakan Privasi', icon: Globe },
    ],
  },
];

// Simple semantic-ish search over documentation content (client-side only)
type SearchRecord = { id: string; title: string; text: string; stemTitle: string; stemText: string };

const stripDiacritics = (s: string) =>
  s
    .normalize('NFKD')
    // Remove common combining diacritic ranges (broad browser support)
    .replace(/[\u0300-\u036f\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]/g, '');
const baseNorm = (s: string) => stripDiacritics(s.toLowerCase());
const stemToken = (t: string) => {
  // Indonesian-lite stemming: remove common clitics/suffixes
  let x = t;
  // remove punctuation/hyphens at edges
  x = x.replace(/^[^\p{L}0-9]+|[^\p{L}0-9]+$/gu, '');
  // clitics
  x = x.replace(/(nya|lah|kah|pun|ku|mu)$/i, '');
  // common derivational suffixes
  x = x.replace(/(kan|an|i)$/i, (m) => (x.length > 4 ? '' : m));
  return x;
};

const escapeReg = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const tokenize = (s: string) => baseNorm(s).replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(Boolean);

const tokensFromText = (s: string) => tokenize(s).map(stemToken).filter(Boolean);

const buildSearchIndex = (): SearchRecord[] => {
  const records = [
    {
      id: 'welcome',
      title: 'Selamat Datang',
      text: `Makalah AI membantu penyusunan makalah akademik melalui percakapan terarah.
        Fitur utama: chat akademik, kerangka 7 fase sebagai pedoman, dan (bila tersedia) web search otomatis.
        Anda dapat mulai dari Panduan Cepat untuk menulis draf pertama atau pelajari metodologi 7 Fase Penulisan.
        Platform menyimpan riwayat percakapan agar pekerjaan dapat dilanjutkan kapan saja.`,
    },
    {
      id: 'installation',
      title: 'Memulai',
      text: `Alur autentikasi: daftar akun baru (registrasi dua tahap dengan verifikasi email),
        masuk (login) melalui halaman /auth, dan titik masuk dari tombol Masuk di header,
        CTA kartu Harga, atau tombol Ngobrol dengan Agen di beranda. Sistem menggunakan parameter redirectTo
        agar setelah login Anda kembali ke tujuan (mis. /chat). Pemulihan kata sandi tersedia melalui tautan email.
        Logout menutup sesi di perangkat tersebut.`,
    },
    {
      id: 'quickstart',
      title: 'Panduan Cepat',
      text: `Langkah singkat: (1) Tetapkan konteks (tujuan, audiens, panjang, gaya, metode,
        daftar sumber wajib), (2) Minta 2–3 alternatif outline dan kunci struktur,
        (3) Tulis draf per bagian (Pendahuluan, Tinjauan Pustaka, Metodologi, dst.) dengan sitasi inline markdown,
        (4) Kelola sumber & sitasi: web search bila perlu (provider‑dependent), susun bagian REFERENCES,
        (5) Integrasi & finalisasi: harmonisasi gaya, cek koherensi, dan siapkan paket akhir.`,
    },
    {
      id: 'concepts',
      title: 'Konsep Dasar',
      text: `Model mental: satu percakapan untuk satu pekerjaan (makalah/bab). Tujuh fase sebagai kompas,
        bukan batasan UI. Riwayat disimpan dan dapat dilanjutkan. Sumber bereputasi diprioritaskan;
        gunakan sitasi inline berupa tautan markdown dan daftar REFERENCES di akhir. AI mengeksekusi,
        keputusan akademik tetap pada pengguna. Memori bersifat per‑sesi; hindari menyertakan rahasia sangat sensitif.`,
    },
    {
      id: 'chat-agent',
      title: 'Chat dengan AI',
      text: `Fungsi chat: buat percakapan baru, ubah judul secara inline, cari percakapan, muat lebih banyak,
        dan hapus dengan konfirmasi. Kirim pesan; saat streaming tersedia tombol Stop; gunakan Regenerasi dan Salin.
        Lampiran hingga 5 file (10MB) untuk image/*, text/*, PDF, DOC/DOCX—gambar dipratinjau, dokumen lain tampil sebagai kartu.
        Edit pesan pengguna didukung; saat disimpan, pesan setelahnya dipotong agar alur konsisten.
        Jika provider mendukung, daftar sumber dan penanda sitasi dapat muncul di bawah balasan.`,
    },
    {
      id: 'workflow',
      title: '7 Fase Penulisan',
      text: `Pre‑topic (eksplorasi ide). Fase 1: klarifikasi topik (fokus dan layak riset).
        Fase 2: bukti awal dan RQ (tema literatur, gap, rumuskan RQ). Fase 3: outline terkunci (target kata, mapping RQ→section).
        Fase 4: penulisan per section (prose formal, sitasi inline, validasi per bagian). Fase 5: integrasi & REFERENCES (harmonisasi gaya, transisi, konsistensi RQ).
        Fase 6: academic polish (grammar, istilah, format sitasi, edit report). Fase 7: finalisasi & packaging (cek akhir format, ringkasan kontribusi, checklist).`,
    },
    {
      id: 'security',
      title: 'Keamanan Data',
      text: `Prinsip: minimasi data, transparansi, tidak menjual data. Disimpan: riwayat percakapan, preferensi akun,
        lampiran, dan log teknis terbatas. Pemrosesan oleh penyedia model/web search mengikuti kebijakan mereka; hindari
        menyertakan rahasia sangat sensitif, gunakan anonimisasi. Enkripsi HTTPS/TLS, kontrol akses, RLS di database.
        Retensi wajar, opsi penghapusan percakapan, sesi login dikelola aman dengan token.`,
    },
    {
      id: 'privacy-policy',
      title: 'Kebijakan Privasi',
      text: `Ruang lingkup layanan; data yang dikumpulkan: akun, percakapan, lampiran, log teknis, cookie sesi.
        Tujuan: menyediakan layanan, keandalan/keamanan, kewajiban hukum. Berbagi data: penyedia model/web search,
        infrastruktur cloud/database/email, otoritas bila diwajibkan. Retensi: selama akun aktif atau sampai dihapus;
        backup/log sementara. Hak pengguna: akses/perbarui akun, hapus percakapan, minta penghapusan akun, ajukan pertanyaan.
        Transfer internasional, anak‑anak, perubahan kebijakan, dan kontak dukungan.`,
    },
  ];
  // enrich with stemmed fields for faster matching
  return records.map((r) => ({
    ...r,
    stemTitle: tokensFromText(r.title).join(' '),
    stemText: tokensFromText(r.text).join(' '),
  }));
};

const scoreDoc = (rec: SearchRecord, stems: string[]) => {
  // count exact token matches in stemmed fields; title weighted 2x
  const titleTokens = rec.stemTitle.split(' ').filter(Boolean);
  const textTokens = rec.stemText.split(' ').filter(Boolean);
  let score = 0;
  for (const t of stems) {
    if (!t) continue;
    const titleHits = titleTokens.reduce((n, tok) => n + (tok === t ? 1 : 0), 0);
    const textHits = textTokens.reduce((n, tok) => n + (tok === t ? 1 : 0), 0);
    score += titleHits * 2 + textHits * 1;
  }
  return score;
};

const makeSnippet = (text: string, term: string, span = 80) => {
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx < 0) return text.slice(0, 120) + (text.length > 120 ? '…' : '');
  const start = Math.max(0, idx - span);
  const end = Math.min(text.length, idx + span);
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
};

const buildMatchRegex = (stems: string[]) => {
  const parts = stems.filter(Boolean).map((t) => escapeReg(t));
  if (parts.length === 0) return null;
  return new RegExp(`\\b(?:${parts.join('|')})[\\w-]*`, 'i');
};

const makeSnippetAdvanced = (text: string, stems: string[], fallback: string) => {
  const rx = buildMatchRegex(stems);
  if (rx) {
    const m = rx.exec(baseNorm(text));
    if (m) {
      // use matched canonical substring length as anchor; fallback to original slice near same index
      const anchor = m[0];
      return makeSnippet(text, anchor);
    }
  }
  return makeSnippet(text, fallback);
};

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const highlightSnippet = (snippet: string, stems: string[]) => {
  const esc = escapeHtml(snippet);
  const parts = stems.filter(Boolean).map((t) => escapeReg(t));
  if (parts.length === 0) return esc;
  const rx = new RegExp(`\\b(${parts.join('|')})[\\w-]*`, 'gi');
  return esc.replace(rx, '<mark>$&</mark>');
};

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
              <h1 className="text-3xl font-semibold text-foreground">Selamat Datang di Makalah AI</h1>
            </div>
          </div>

          <div className="space-y-6">
            <p className="text-muted-foreground">
              Makalah AI bantu lu nyusun makalah akademik end-to-end lewat percakapan yang terarah. Alurnya mengikuti 7 fase kerja akademik (dari definisi topik sampai finalisasi), tapi UI-nya tetap simpel: lu chat, AI ngerespon, dan progres lu otomatis disimpan.
            </p>

            <Card className="border-l-4 border-l-primary">
              <CardHeader>
                <CardTitle className="text-primary">Apa yang bisa dilakukan?</CardTitle>
                <CardDescription>Fokus ke kualitas isi. Sisanya dibantu AI.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• <strong>Chat Akademik</strong> — diskusi topik, refine research question, sampai nulis per bagian.</li>
                  <li>• <strong>Kerangka 7 Fase</strong> — AI menjaga alur kerja supaya nggak loncat-loncat.</li>
                  <li>• <strong>Web Search (otomatis)</strong> — ketika perlu, AI bisa nyari info eksternal dari web provider yang didukung.</li>
                </ul>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="hover:bg-card/70 transition-colors cursor-pointer" onClick={() => setActiveSection && setActiveSection('quickstart')}>
                <CardHeader>
                  <Zap className="w-8 h-8 mb-2 text-primary" />
                  <CardTitle className="text-lg">Panduan Cepat</CardTitle>
                  <CardDescription>Mulai bikin draft pertama dalam 5 menit.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button size="sm">Mulai Sekarang</Button>
                </CardContent>
              </Card>

              <Card className="hover:bg-card/70 transition-colors cursor-pointer" onClick={() => setActiveSection && setActiveSection('workflow')}>
                <CardHeader>
                  <Book className="w-8 h-8 mb-2 text-primary" />
                  <CardTitle className="text-lg">7 Fase Penulisan</CardTitle>
                  <CardDescription>Metode kerja yang dipakai Makalah AI.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button size="sm">Pelajari Lebih Lanjut</Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      );

    case 'installation':
      return (
        <div className="space-y-8">
          <div>
            <div className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-2">Mulai</div>
            <h1 className="text-3xl font-semibold text-foreground">Memulai</h1>
            <p className="text-muted-foreground mt-2">
              Bagian ini menjelaskan alur autentikasi (auth) secara formal: cara mendaftar, cara masuk, titik masuk (&quot;Masuk&quot; di header, tombol pada kartu harga, dan tombol &quot;Ngobrol dengan Agen&quot;), serta pengalihan setelah autentikasi.
            </p>
          </div>

          <section className="space-y-3 no-section-separator">
            <h2 className="text-xl font-semibold text-foreground">Ringkasan Alur</h2>
            <p className="text-sm text-muted-foreground">Autentikasi diperlukan untuk menyimpan percakapan dan preferensi Anda.</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Platform menggunakan autentikasi berbasis email dan kata sandi.</li>
              <li>Tautan verifikasi serta pemulihan kata sandi dikirim melalui email.</li>
              <li>Setelah berhasil masuk, Anda dialihkan ke halaman tujuan (Chat secara default).</li>
            </ul>
          </section>

          <section className="space-y-3 no-section-separator">
            <h2 className="text-xl font-semibold text-foreground">Titik Masuk Autentikasi</h2>
            <p className="text-sm text-muted-foreground">Tiga cara menuju halaman autentikasi.</p>
            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-2">
              <li>
                Tombol <span className="font-medium">Masuk</span> di header situs.
                <ul className="mt-1 ml-5 list-disc space-y-1">
                  <li>Pada halaman publik (mis. beranda, dokumentasi), sistem menambahkan parameter <code>redirectTo</code> sehingga setelah autentikasi Anda kembali ke halaman semula.</li>
                  <li>Pada halaman non-publik, Anda diarahkan ke halaman autentikasi tanpa parameter tambahan.</li>
                </ul>
              </li>
              <li>
                Tombol CTA pada <span className="font-medium">kartu harga</span> di halaman Harga.
                <ul className="mt-1 ml-5 list-disc space-y-1">
                  <li>Tombol mengarahkan ke halaman <code>/auth</code>. Setelah berhasil masuk, sistem akan mengarahkan Anda ke halaman Chat secara default.</li>
                </ul>
              </li>
              <li>
                Tombol <span className="font-medium">Ngobrol dengan Agen</span> di beranda.
                <ul className="mt-1 ml-5 list-disc space-y-1">
                  <li>Jika Anda belum masuk, Anda diarahkan ke <code>/auth?redirectTo=/chat</code> agar setelah autentikasi langsung masuk ke Chat.</li>
                  <li>Jika sudah masuk, tombol membawa Anda langsung ke halaman Chat.</li>
                </ul>
              </li>
            </ol>
          </section>

          <section className="space-y-3 no-section-separator">
            <h2 className="text-xl font-semibold text-foreground">Pendaftaran Akun Baru</h2>
            <p className="text-sm text-muted-foreground">Registrasi dua tahap dengan verifikasi email.</p>
            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
              <li>Buka halaman <code>/auth</code>, lalu pilih mode Daftar (atau akses <code>/auth?tab=register</code>).</li>
              <li>Isi tahap 1: email, kata sandi, dan konfirmasi kata sandi.</li>
              <li>Isi tahap 2: nama depan, nama belakang, dan predikat (jika diminta).</li>
              <li>Setelah mengirim, sistem akan mengirim email verifikasi. Buka tautan pada email tersebut untuk mengaktifkan akun.</li>
              <li>Setelah verifikasi berhasil, kembali ke halaman <code>/auth</code> untuk masuk.</li>
            </ol>
          </section>

          <section className="space-y-3 no-section-separator">
            <h2 className="text-xl font-semibold text-foreground">Masuk ke Akun</h2>
            <p className="text-sm text-muted-foreground">Pengalihan sesudah autentikasi mengikuti parameter yang aman.</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Masukkan email dan kata sandi pada halaman <code>/auth</code>. Opsi “ingat saya” memperpanjang sesi pada perangkat yang sama.</li>
              <li>Jika URL menyertakan <code>redirectTo</code> yang valid, sistem akan mengarahkan Anda ke alamat tersebut setelah masuk.</li>
              <li>Jika tidak ada <code>redirectTo</code>, tujuan default adalah halaman <code>/chat</code>.</li>
              <li>Jika akun belum terdaftar atau nonaktif, halaman akan menampilkan ajakan untuk mendaftar.</li>
            </ul>
          </section>

          <section className="space-y-3 no-section-separator">
            <h2 className="text-xl font-semibold text-foreground">Pemulihan Kata Sandi</h2>
            <p className="text-sm text-muted-foreground">Atur ulang kata sandi melalui tautan email.</p>
            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
              <li>Pada halaman <code>/auth</code>, pilih tautan “Lupa password”.</li>
              <li>Masukkan email Anda; sistem akan mengirimkan tautan pemulihan ke kotak masuk.</li>
              <li>Buka tautan tersebut untuk membuat kata sandi baru, lalu kembali ke halaman <code>/auth</code> untuk masuk.</li>
            </ol>
          </section>

          <section className="space-y-3 no-section-separator">
            <h2 className="text-xl font-semibold text-foreground">Keluar (Logout)</h2>
            <p className="text-sm text-muted-foreground">Berakhirkan sesi dari menu profil.</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Gunakan menu profil di header untuk keluar.</li>
              <li>Setelah keluar, Anda akan diarahkan ke halaman <code>/auth</code>.</li>
            </ul>
          </section>

          <section className="space-y-3 no-section-separator">
            <h2 className="text-xl font-semibold text-foreground">Catatan Keamanan</h2>
            <p className="text-sm text-muted-foreground">Praktik baik dalam menggunakan akun.</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Jangan pernah membagikan kredensial di ruang publik mana pun.</li>
              <li>Gunakan perangkat pribadi dan perbarui kata sandi secara berkala.</li>
              <li>Jika mencurigai akses tidak sah, segera reset kata sandi dan keluar dari semua perangkat.</li>
            </ul>
          </section>
        </div>
      );

    case 'quickstart':
      return (
        <div className="space-y-8">
          <div>
            <div className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-2">Mulai</div>
            <h1 className="text-3xl font-semibold text-foreground">Panduan Cepat</h1>
            <p className="text-muted-foreground mt-2">Langkah ringkas untuk beralih dari topik ke draf akademik yang siap ditinjau.</p>
          </div>

          <section className="space-y-3 no-section-separator">
            <h2 className="text-xl font-semibold text-foreground">1) Inisialisasi percakapan</h2>
            <p className="text-sm text-muted-foreground">Nyatakan tujuan, ruang lingkup, dan batasan.</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Sebutkan topik, rumusan masalah/pertanyaan riset, audiens, panjang, gaya, dan metode yang diinginkan.</li>
              <li>Bila ada sumber wajib, cantumkan daftar awalnya.</li>
              <li>Contoh instruksi awal: “Tujuan: menyusun makalah tentang X. Audiens: dosen dan mahasiswa. Gaya: Bahasa Indonesia formal. Panjang: 1200–1500 kata. Harap arahkan langkah demi langkah.”</li>
            </ul>
          </section>

          <section className="space-y-3 no-section-separator">
            <h2 className="text-xl font-semibold text-foreground">2) Susun dan kunci outline</h2>
            <p className="text-sm text-muted-foreground">Fase perencanaan struktur.</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Minta 2–3 alternatif outline beserta justifikasi setiap bagian.</li>
              <li>Revisi hingga sesuai; kunci struktur sebelum drafting.</li>
              <li>Contoh: “Ajukan 2 alternatif outline dengan alasan, lalu rekomendasikan satu yang paling kuat.”</li>
            </ul>
          </section>

          <section className="space-y-3 no-section-separator">
            <h2 className="text-xl font-semibold text-foreground">3) Draft per bagian</h2>
            <p className="text-sm text-muted-foreground">Tuliskan isi dengan Bahasa Indonesia formal.</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Tulis per bagian (Pendahuluan → Tinjauan Pustaka → Metodologi → …) dengan target kata yang jelas.</li>
              <li>Sertakan sitasi inline berbentuk tautan markdown bila merujuk sumber.</li>
              <li>Contoh: “Tulis Pendahuluan 500–700 kata, beri sitasi inline yang relevan, tandai klaim yang butuh data primer.”</li>
            </ul>
          </section>

          <section className="space-y-3 no-section-separator">
            <h2 className="text-xl font-semibold text-foreground">4) Sumber & sitasi</h2>
            <p className="text-sm text-muted-foreground">Gunakan sumber bereputasi; ringkas referensi.</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Jika perlu, minta gunakan web search untuk melacak sumber terbaru (bergantung dukungan penyedia).</li>
              <li>Prioritaskan sumber bereputasi: jurnal bereview sejawat, konferensi, .gov, .edu, lembaga resmi.</li>
              <li>Tambahkan bagian “REFERENCES” berisi daftar: “- [Judul/Organisasi](URL) – ringkasan satu kalimat”.</li>
              <li>Larangan sitasi fiktif: verifikasi tautan sebelum final.</li>
            </ul>
          </section>

          <section className="space-y-3 no-section-separator">
            <h2 className="text-xl font-semibold text-foreground">5) Integrasi, tinjau, finalisasi</h2>
            <p className="text-sm text-muted-foreground">Harmonisasi gaya dan akurasi argumen.</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Minta harmonisasi antarbagian agar alur logis dan konsisten.</li>
              <li>Jalankan pemeriksaan mutu: konsistensi istilah, koherensi argumen, penanda ketidakpastian, etika dan anti‑plagiarisme.</li>
              <li>Finalisasi format dan siapkan paket pengumpulan (bila diperlukan).</li>
            </ul>
          </section>

          <section className="space-y-3 no-section-separator">
            <h2 className="text-xl font-semibold text-foreground">Tips cepat</h2>
            <p className="text-sm text-muted-foreground">Mempercepat iterasi tanpa mengorbankan mutu.</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Nyatakan batasan sejak awal (gaya, panjang, standar sitasi) agar hasil konsisten.</li>
              <li>Minta AI menandai klaim lemah/berisiko dan sarankan perbaikan.</li>
              <li>Bila perlu data eksternal, sebutkan: “boleh gunakan web search dan cantumkan sumbernya”.</li>
            </ul>
          </section>
        </div>
      );

    case 'concepts':
      return (
        <div className="space-y-8">
          <div>
            <div className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-2">Mulai</div>
            <h1 className="text-3xl font-semibold text-foreground">Konsep Dasar</h1>
            <p className="text-muted-foreground mt-2">Gambaran kerja Makalah AI dalam bahasa yang praktis untuk pengguna akhir—berpatokan pada pedoman internal, tapi fokus ke cara pakai nyata di chat.</p>
          </div>

          <section className="space-y-3 no-section-separator">
            <h2 className="text-xl font-semibold text-foreground">Cara Kerja Singkat</h2>
            <p className="text-sm text-muted-foreground">Anda berinteraksi lewat chat. Satu percakapan mewakili satu pekerjaan (mis. makalah/bab). Anda menjelaskan tujuan dan batasan; AI menyarankan, menyusun, dan menulis draf sesuai arahan Anda. Progres tersimpan dan bisa dilanjutkan kapan saja.</p>
            <p className="text-sm text-muted-foreground">Tujuh fase penulisan (dari pendefinisian topik hingga finalisasi) dipakai sebagai pedoman agar alur tetap rapi, tanpa membatasi kebebasan chat.</p>
          </section>

          <section className="space-y-3 no-section-separator">
            <h2 className="text-xl font-semibold text-foreground">Alur di Dalam Chat</h2>
            <p className="text-sm text-muted-foreground">Alur umum yang disarankan: tetapkan konteks → minta outline → tulis draf per bagian → integrasi dan harmonisasi → finalisasi. Selama proses, minta alternatif, ajukan revisi, dan pastikan keputusan kunci dicatat di percakapan.</p>
          </section>

          <section className="space-y-3 no-section-separator">
            <h2 className="text-xl font-semibold text-foreground">Istilah Penting</h2>
            <p className="text-sm text-muted-foreground">Percakapan (riwayat kerja), Pesan (instruksi/hasil), Outline (kerangka), Draf (isi sementara), Sumber (referensi), Sitasi inline (tautan markdown pada kalimat), dan References (daftar ringkas di akhir).</p>
          </section>

          <section className="space-y-3 no-section-separator">
            <h2 className="text-xl font-semibold text-foreground">Sumber & Sitasi</h2>
            <p className="text-sm text-muted-foreground">Saat perlu, minta AI menggunakan web search. Utamakan jurnal bereview sejawat, konferensi bereputasi, dan domain resmi (.gov, .edu, lembaga). Dilarang sitasi palsu—verifikasi tautan sebelum final.</p>
            <p className="text-sm text-muted-foreground">Gunakan sitasi inline berbentuk tautan markdown dalam tanda kurung. Tambahkan bagian “REFERENCES” dengan format “- [Judul/Organisasi](URL) – ringkasan satu kalimat”.</p>
          </section>

          <section className="space-y-3 no-section-separator">
            <h2 className="text-xl font-semibold text-foreground">Peran Pengguna vs AI</h2>
            <p className="text-sm text-muted-foreground">AI mengeksekusi dan mengusulkan, tetapi keputusan akademik tetap pada Anda. Minta AI menandai klaim lemah/berisiko, memberi opsi perbaikan, dan menyebut ketidakpastian bila ada.</p>
          </section>

          <section className="space-y-3 no-section-separator">
            <h2 className="text-xl font-semibold text-foreground">Penyimpanan & Privasi</h2>
            <p className="text-sm text-muted-foreground">Riwayat percakapan disimpan untuk kelanjutan pekerjaan. Hindari menempatkan rahasia yang sangat sensitif di chat. Rincian lebih lanjut tersedia di bagian Keamanan Data.</p>
          </section>

          <section className="space-y-3 no-section-separator">
            <h2 className="text-xl font-semibold text-foreground">Ke Mana Setelah Ini?</h2>
            <p className="text-sm text-muted-foreground">Lihat “Memulai” untuk autentikasi dan “Panduan Cepat” untuk langkah eksekusi dari topik ke draf. Butuh panduan metodologi? Buka “7 Fase Penulisan”.</p>
          </section>
        </div>
      );

    case 'chat-agent':
      return (
        <div className="space-y-8">
          <div>
            <div className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-2">Fitur Utama</div>
            <h1 className="text-3xl font-semibold text-foreground">Chat dengan AI</h1>
            <p className="text-muted-foreground mt-2">Fokus di sini: cara kerja antarmuka chat, fitur yang tersedia, dan hal teknis yang perlu diketahui pengguna saat menulis draf.</p>
          </div>

          <section className="space-y-3 no-section-separator">
            <h2 className="text-xl font-semibold text-foreground">Percakapan dan Riwayat</h2>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Mulai dari menu <span className="font-medium">Chat</span> → “Percakapan Baru”, atau lanjutkan percakapan yang ada dari sidebar.</li>
              <li>Ubah judul percakapan secara inline di sidebar; gunakan kolom <span className="font-medium">Cari percakapan…</span> untuk memfilter.</li>
              <li>Riwayat dimuat bertahap; klik “Muat lebih banyak” bila perlu. Hapus percakapan lewat dialog konfirmasi.</li>
              <li>Pembuatan percakapan dipastikan sebelum pesan pertama dikirim, sehingga aman jika halaman direfresh saat streaming.</li>
            </ul>
          </section>

          <section className="space-y-3 no-section-separator">
            <h2 className="text-xl font-semibold text-foreground">Mengirim Pesan</h2>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Ketik pesan di area input lalu kirim. Selama streaming, tombol <span className="font-medium">Stop</span> tersedia untuk menghentikan respons.</li>
              <li>Gunakan <span className="font-medium">Regenerasi respons</span> pada balasan AI bila butuh versi alternatif, atau <span className="font-medium">Salin</span> untuk menyalin teks.</li>
            </ul>
          </section>

          <section className="space-y-3 no-section-separator">
            <h2 className="text-xl font-semibold text-foreground">Lampiran File</h2>
            <p className="text-sm text-muted-foreground">Anda dapat menambahkan lampiran melalui tombol tambah di toolbar input.</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Maksimal 5 file, ukuran per file hingga 10MB.</li>
              <li>Tipe yang didukung: gambar (image/*), teks (text/*), PDF (.pdf), dan dokumen (.doc, .docx).</li>
              <li>Gambar akan dipratinjau; berkas lain ditampilkan sebagai kartu informasi.</li>
              <li>Peringatan: isi file tidak otomatis diproses sebagai konteks penuh. Untuk akurasi, rangkum poin penting dari file dalam pesan Anda.</li>
            </ul>
          </section>

          <section className="space-y-3 no-section-separator">
            <h2 className="text-xl font-semibold text-foreground">Menyunting Pesan</h2>
            <p className="text-sm text-muted-foreground">Pesan pengguna dapat disunting setelah terkirim.</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Aktifkan <span className="font-medium">Edit</span> pada pesan pengguna lalu simpan perubahan.</li>
              <li>Demi konsistensi percakapan, saat Anda menyimpan hasil edit, pesan setelahnya akan dipotong—percakapan berlanjut dari versi yang baru.</li>
            </ul>
          </section>

          <section className="space-y-3 no-section-separator">
            <h2 className="text-xl font-semibold text-foreground">Sumber dan Sitasi</h2>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Jika penyedia mendukung, web search dapat berjalan otomatis untuk memperkaya jawaban.</li>
              <li>Sumber yang dipakai AI ditampilkan di bawah balasan. Tanda sitasi bisa muncul sebagai penanda (marker) yang dapat diklik.</li>
              <li>Verifikasi tautan sebelum final. Untuk format sitasi dan daftar referensi, lihat bagian “Panduan Cepat”.</li>
            </ul>
          </section>

          <section className="space-y-3 no-section-separator">
            <h2 className="text-xl font-semibold text-foreground">Tips Pemakaian</h2>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Gunakan satu percakapan per topik/tugas agar riwayat fokus dan mudah dilanjutkan.</li>
              <li>Jika respons terlalu panjang, minta ringkasan atau pecah per bagian untuk menjaga ritme iterasi.</li>
              <li>Jika perlu verifikasi, minta AI menandai klaim yang butuh data primer atau bukti tambahan.</li>
            </ul>
          </section>
        </div>
      );

    case 'workflow':
      return (
        <div className="space-y-8">
          <div>
            <div className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-2">Fitur Utama</div>
            <h1 className="text-3xl font-semibold text-foreground">7 Fase Penulisan</h1>
            <p className="text-muted-foreground mt-2">Kerangka kerja ini jadi kompas percakapan, bukan pagar pembatas. Lu tetap bebas diskusi secara natural; fase membantu jaga arah dan kualitas.</p>
          </div>

          <section className="space-y-3 no-section-separator">
            <h2 className="text-xl font-semibold text-foreground">Orientasi Alur</h2>
            <p className="text-sm text-muted-foreground">Sebelum Fase 1, boleh ada obrolan “pre‑topic” untuk eksplorasi ide. Workflow formal dimulai saat topik mulai didefinisikan.</p>
          </section>

          <section className="space-y-2 no-section-separator">
            <h2 className="text-lg font-semibold text-foreground">Fase 1 — Topic Clarification</h2>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Tujuan: mengubah ide kasar jadi topik riset yang fokus dan layak.</li>
              <li>Yang terjadi: brainstorming, tanya‑jawab terarah, challenge ide yang terlalu luas.</li>
              <li>Peran AI: ajukan probing questions; sarankan fokus; tunjukkan trade‑off.</li>
              <li>Peran Anda: jelaskan konteks, batasan, dan tujuan akademik.</li>
              <li>Output: resume keputusan fase (topik, batasan, asumsi awal).</li>
            </ul>
          </section>

          <section className="space-y-2 no-section-separator">
            <h2 className="text-lg font-semibold text-foreground">Fase 2 — Evidence & RQs Framing</h2>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Tujuan: kumpulkan bukti awal dan menetapkan Research Questions (RQ).</li>
              <li>Yang terjadi: identifikasi tema literatur, rumuskan RQ, dan temukan gap.</li>
              <li>Peran AI: ringkas temuan, highlight gap, dan usulkan RQ terukur.</li>
              <li>Peran Anda: validasi relevansi sumber dan setujui RQ.</li>
              <li>Output: ringkasan bukti + daftar RQ yang disepakati.</li>
            </ul>
          </section>

          <section className="space-y-2 no-section-separator">
            <h2 className="text-lg font-semibold text-foreground">Fase 3 — Structure Planning (Outline)</h2>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Tujuan: desain outline lengkap (bagian, sub‑bagian, target kata, mapping RQ → section).</li>
              <li>Yang terjadi: iterasi struktur sampai logis dan comply standar akademik.</li>
              <li>Peran AI: susun outline, set target kata, beri alasan urutan.</li>
              <li>Peran Anda: review, minta revisi, lalu “kunci” outline.</li>
              <li>Output: <span className="font-medium">Outline — LOCKED</span> sebagai blueprint drafting.</li>
            </ul>
          </section>

          <section className="space-y-2 no-section-separator">
            <h2 className="text-lg font-semibold text-foreground">Fase 4 — Content Creation</h2>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Tujuan: tulis prose akademik per section sesuai outline.</li>
              <li>Yang terjadi: AI menulis tiap section (Bahasa Indonesia formal) dengan sitasi inline; Anda validasi sebelum lanjut.</li>
              <li>Peran AI: jaga word count ±10% dari target; pastikan alur dan sitasi konsisten.</li>
              <li>Peran Anda: beri revisi, minta alternatif, dan setujui tiap section.</li>
              <li>Output: draf bagian per bagian yang siap diintegrasikan.</li>
            </ul>
          </section>

          <section className="space-y-2 no-section-separator">
            <h2 className="text-lg font-semibold text-foreground">Fase 5 — Integration & Citation</h2>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Tujuan: harmonisasi gaya dan logika, susun transisi antarbagian, dan rapikan sitasi.</li>
              <li>Yang terjadi: gabungkan section, samakan istilah, cek konsistensi RQ‑to‑section, dan kompilasi “REFERENCES”.</li>
              <li>Peran AI: sinkronkan nada dan struktur; tandai klaim yang butuh bukti tambahan.</li>
              <li>Peran Anda: verifikasi sumber dan minta perbaikan bila ada lompatan logika.</li>
              <li>Output: draf terintegrasi lengkap dengan daftar referensi.</li>
            </ul>
          </section>

          <section className="space-y-2 no-section-separator">
            <h2 className="text-lg font-semibold text-foreground">Fase 6 — Academic Review / Polish</h2>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Tujuan: quality assurance—grammar, ketepatan istilah, konsistensi heading, dan standar sitasi.</li>
              <li>Yang terjadi: perapihan bahasa, penyeragaman format sitasi sesuai gaya yang diminta, dan final checks.</li>
              <li>Peran AI: laporkan perubahan (edit report) dan alasan perbaikan yang signifikan.</li>
              <li>Peran Anda: pilih gaya sitasi (APA/MLA/Chicago/Harvard) dan setujui hasil polish.</li>
              <li>Output: naskah polished yang siap diformat akhir.</li>
            </ul>
          </section>

          <section className="space-y-2 no-section-separator">
            <h2 className="text-lg font-semibold text-foreground">Fase 7 — Finalization & Packaging</h2>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Tujuan: memfinalkan format, memastikan kelengkapan referensi, dan menyiapkan berkas untuk pengumpulan.</li>
              <li>Yang terjadi: cek akhir formatting, ringkasan kontribusi, dan daftar periksa submission.</li>
              <li>Catatan implementasi: hasil akhir tersedia di percakapan; ekspor/salin sesuai kebutuhan Anda.</li>
              <li>Output: dokumen final siap dikumpulkan.</li>
            </ul>
          </section>

          <section className="space-y-2 no-section-separator">
            <h2 className="text-lg font-semibold text-foreground">Catatan</h2>
            <p className="text-sm text-muted-foreground">Fase adalah pedoman; UI chat tetap bebas. Minta AI menjelaskan alasan keputusan pada tiap fase untuk memastikan akuntabilitas akademik.</p>
          </section>
        </div>
      );

    

    

    case 'security':
      return (
        <div className="space-y-8">
          <div>
            <div className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-2">Panduan Lanjutan</div>
            <h1 className="text-3xl font-semibold text-foreground">Keamanan Data</h1>
            <p className="text-muted-foreground mt-2">Gambaran normatif praktik keamanan dan privasi yang umum pada aplikasi LLM Agent. Informasi ini bersifat ringkasan operasional; detail hukum mengacu pada Kebijakan Privasi.</p>
          </div>

          <section className="space-y-3 no-section-separator">
            <h2 className="text-xl font-semibold text-foreground">Prinsip Umum</h2>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Data diproses untuk menyediakan layanan (percakapan, penyusunan draf), bukan untuk menjual informasi pengguna.</li>
              <li>Minimasi data: hanya informasi yang diperlukan yang disimpan.</li>
              <li>Transparansi: sumber dan sitasi ditandai agar mudah diverifikasi.</li>
            </ul>
          </section>

          <section className="space-y-3 no-section-separator">
            <h2 className="text-xl font-semibold text-foreground">Data yang Disimpan</h2>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Riwayat percakapan dan preferensi dasar akun (mis. pengaturan tampilan) disimpan untuk kelanjutan pekerjaan.</li>
              <li>Lampiran file yang Anda unggah (gambar, teks, PDF, dokumen) disimpan untuk keperluan pemrosesan pada sesi terkait.</li>
              <li>Log teknis terbatas dapat tercatat untuk keandalan, audit keamanan, dan pencegahan penyalahgunaan.</li>
            </ul>
          </section>

          <section className="space-y-3 no-section-separator">
            <h2 className="text-xl font-semibold text-foreground">Pengolahan oleh Penyedia Model</h2>
            <p className="text-sm text-muted-foreground">Prompt dan keluaran dapat diproses oleh penyedia model (LLM provider) atau layanan web search bila fitur tersebut aktif.</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Penyedia dapat menyimpan log terbatas untuk keselamatan/penyalahgunaan. Kebijakan pelatihan model mengikuti ketentuan penyedia yang digunakan.</li>
              <li>Jangan sertakan rahasia sangat sensitif (mis. kredensial, nomor kartu, rekam medis) di dalam chat.</li>
              <li>Jika perlu memasukkan data sensitif, lakukan anonimisasi (hapus identitas personal, detail yang tidak relevan).</li>
            </ul>
          </section>

          <section className="space-y-3 no-section-separator">
            <h2 className="text-xl font-semibold text-foreground">Enkripsi dan Transport</h2>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Data dalam perjalanan dilindungi melalui koneksi terenkripsi (HTTPS/TLS).</li>
              <li>Data yang disimpan diamankan pada infrastruktur cloud standar industri dengan kontrol akses terbatas.</li>
            </ul>
          </section>

          <section className="space-y-3 no-section-separator">
            <h2 className="text-xl font-semibold text-foreground">Kontrol Akses</h2>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Akses administratif dibatasi dan diaudit. Kunci API dan rahasia disimpan sebagai variabel lingkungan, tidak ditaruh di kode.</li>
              <li>Untuk penyimpanan terkelola, kebijakan keamanan database (mis. Row Level Security/RLS) digunakan untuk membatasi akses data per pengguna.</li>
            </ul>
          </section>

          <section className="space-y-3 no-section-separator">
            <h2 className="text-xl font-semibold text-foreground">Retensi dan Penghapusan</h2>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Anda dapat menghapus percakapan dari halaman Chat; penghapusan akan menghilangkan data tersebut dari tampilan pengguna.</li>
              <li>Salinan cadangan dan log sistem dapat menyimpan jejak sementara sesuai praktik operasional yang wajar.</li>
            </ul>
          </section>

          <section className="space-y-3 no-section-separator">
            <h2 className="text-xl font-semibold text-foreground">Sesi dan Autentikasi</h2>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Sesi login menggunakan token yang dikelola aman; sistem dapat memperbarui token secara periodik untuk mencegah sesi kedaluwarsa tiba‑tiba.</li>
              <li>Keluar (logout) menutup sesi di perangkat tersebut. Hindari berbagi akun.</li>
            </ul>
          </section>

          <section className="space-y-3 no-section-separator">
            <h2 className="text-xl font-semibold text-foreground">Praktik yang Disarankan</h2>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Hindari mengunggah data personal yang tidak perlu; gunakan sampling atau ringkasan.</li>
              <li>Verifikasi klaim penting dan sumber eksternal sebelum dipublikasikan.</li>
              <li>Gunakan perangkat pribadi dan kata sandi yang kuat; aktifkan verifikasi email yang diminta sistem.</li>
            </ul>
          </section>

          <section className="space-y-3 no-section-separator">
            <h2 className="text-xl font-semibold text-foreground">Catatan</h2>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Ringkasan ini bukan nasihat hukum. Untuk detail pengelolaan data dan hak pengguna, lihat bagian “Kebijakan Privasi”.</li>
              <li>Hubungi dukungan bila perlu bantuan terkait penghapusan data atau pelaporan insiden.</li>
            </ul>
          </section>
        </div>
      );

    case 'privacy-policy':
      return (
        <div className="space-y-8">
          <div>
            <div className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-2">Panduan Lanjutan</div>
            <h1 className="text-3xl font-semibold text-foreground">Kebijakan Privasi (Ringkas)</h1>
            <p className="text-muted-foreground mt-2">Ringkasan normatif cara kami mengumpulkan, menggunakan, menyimpan, dan membagikan data saat Anda menggunakan layanan Makalah AI. Dokumen hukum lengkap akan tersedia pada rilis publik.</p>
          </div>

          <section className="space-y-3 no-section-separator">
            <h2 className="text-xl font-semibold text-foreground">Ruang Lingkup</h2>
            <p className="text-sm text-muted-foreground">Kebijakan ini berlaku untuk data yang diproses melalui situs dan layanan Makalah AI, termasuk percakapan, lampiran, pengaturan akun, dan data penggunaan.</p>
          </section>

          <section className="space-y-3 no-section-separator">
            <h2 className="text-xl font-semibold text-foreground">Data yang Dikumpulkan</h2>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Data akun: alamat email dan informasi profil dasar yang Anda berikan.</li>
              <li>Data percakapan: pesan, draf, dan lampiran yang Anda unggah.</li>
              <li>Data penggunaan: log teknis terbatas (waktu akses, perangkat, error) untuk keandalan dan keamanan.</li>
              <li>Cookie/teknologi serupa: untuk autentikasi sesi dan preferensi tampilan.</li>
            </ul>
          </section>

          <section className="space-y-3 no-section-separator">
            <h2 className="text-xl font-semibold text-foreground">Tujuan Penggunaan</h2>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Menyediakan layanan penyusunan makalah dan penyimpanan riwayat percakapan.</li>
              <li>Meningkatkan keandalan, keamanan, dan pengalaman pengguna.</li>
              <li>Memenuhi kewajiban hukum dan menanggapi permintaan yang sah.</li>
            </ul>
          </section>

          <section className="space-y-3 no-section-separator">
            <h2 className="text-xl font-semibold text-foreground">Berbagi Data</h2>
            <p className="text-sm text-muted-foreground">Kami tidak menjual data pengguna. Data dapat dibagikan dengan:</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Penyedia model dan layanan web search untuk memproses permintaan Anda; mereka dapat menyimpan log terbatas sesuai kebijakan masing‑masing.</li>
              <li>Penyedia infrastruktur (cloud, database, email) untuk operasional layanan.</li>
              <li>Otoritas yang berwenang bila diwajibkan oleh hukum.</li>
            </ul>
          </section>

          <section className="space-y-3 no-section-separator">
            <h2 className="text-xl font-semibold text-foreground">Retensi</h2>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Riwayat percakapan dan lampiran disimpan selama akun aktif atau sampai Anda menghapusnya.</li>
              <li>Cadangan dan log sistem dapat menyimpan jejak sementara untuk pemulihan bencana dan audit keamanan.</li>
            </ul>
          </section>

          <section className="space-y-3 no-section-separator">
            <h2 className="text-xl font-semibold text-foreground">Hak Pengguna</h2>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Mengakses dan memperbarui informasi akun Anda.</li>
              <li>Menghapus percakapan dari halaman Chat; meminta penghapusan akun sesuai prosedur layanan.</li>
              <li>Mengajukan pertanyaan terkait penggunaan data.</li>
            </ul>
          </section>

          <section className="space-y-3 no-section-separator">
            <h2 className="text-xl font-semibold text-foreground">Transfer Internasional</h2>
            <p className="text-sm text-muted-foreground">Data dapat diproses di wilayah hukum yang berbeda oleh penyedia layanan kami. Kami berupaya memastikan adanya perlindungan yang sepadan sesuai praktik industri.</p>
          </section>

          <section className="space-y-3 no-section-separator">
            <h2 className="text-xl font-semibold text-foreground">Anak‑Anak</h2>
            <p className="text-sm text-muted-foreground">Layanan tidak ditujukan bagi anak‑anak di bawah usia yang diizinkan oleh hukum yang berlaku. Jangan kirimkan data pribadi anak.</p>
          </section>

          <section className="space-y-3 no-section-separator">
            <h2 className="text-xl font-semibold text-foreground">Perubahan Kebijakan</h2>
            <p className="text-sm text-muted-foreground">Kami dapat memperbarui ringkasan ini dari waktu ke waktu. Versi terbaru akan ditampilkan di halaman ini beserta tanggal berlakunya.</p>
          </section>

          <section className="space-y-3 no-section-separator">
            <h2 className="text-xl font-semibold text-foreground">Kontak</h2>
            <p className="text-sm text-muted-foreground">Untuk permintaan terkait privasi atau penghapusan data, hubungi dukungan melalui alamat yang tersedia pada aplikasi.</p>
          </section>
        </div>
      );

    default:
      return (
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-semibold mb-4 text-foreground">Dokumentasi</h1>
            <p className="text-lg text-muted-foreground">Pilih topik dari sidebar untuk mempelajari Makalah AI.</p>
          </div>
        </div>
      );
  }
};

export default function DocumentationPage() {
  const [activeSection, setActiveSection] = useState('welcome');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchIndex = useMemo(() => buildSearchIndex(), []);
  const [results, setResults] = useState<SearchRecord[]>([]);

  const plainIncludesScore = (rec: SearchRecord, termsRaw: string[]) => {
    const text = baseNorm(rec.title + ' ' + rec.text);
    let s = 0;
    for (const t of termsRaw) {
      const tt = baseNorm(t);
      if (!tt) continue;
      if (text.includes(tt)) s += 1;
    }
    return s;
  };

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    const termsRaw = tokenize(q);
    const stems = termsRaw.map(stemToken).filter(Boolean);
    if (stems.length === 0) {
      setResults([]);
      return;
    }
    const scored = searchIndex
      .map((rec) => {
        const stemScore = scoreDoc(rec, stems);
        const rawScore = plainIncludesScore(rec, termsRaw);
        const baseScore = Math.max(stemScore, rawScore);
        const bias = rec.id === activeSection ? 0.5 : 0; // slight priority to active section
        return { rec, score: baseScore + bias };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((x) => x.rec);
    setResults(scored);
  }, [query, searchIndex, activeSection]);

  // Calculate Previous/Next logic for bottom navigation
  const allItems = navigationSections.flatMap(section => section.items);
  const currentIndex = allItems.findIndex(item => item.id === activeSection);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < allItems.length - 1;
  const previousItem = hasPrevious ? allItems[currentIndex - 1] : null;
  const nextItem = hasNext ? allItems[currentIndex + 1] : null;

  return (
    <div className="min-h-screen bg-background text-foreground">

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
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && results.length > 0) {
                    setActiveSection(results[0].id);
                  }
                }}
              />
            </div>
            {query && (
              <div className="mt-2 rounded border border-border bg-card/60">
                {results.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">Tidak ada hasil yang cocok</div>
                ) : (
                  <ul className="max-h-56 overflow-auto">
                    {results.map((r) => (
                      <li key={r.id}>
                        <button
                          onClick={() => {
                            setActiveSection(r.id);
                          }}
                          className={`w-full text-left px-3 py-2 hover:bg-muted/50 text-xs ${activeSection === r.id ? 'bg-muted/70' : ''}`}
                        >
                          <div className="font-medium text-foreground">{r.title}</div>
                          <div
                            className="text-muted-foreground line-clamp-2"
                            dangerouslySetInnerHTML={{
                              __html: highlightSnippet(
                                makeSnippetAdvanced(r.text, tokensFromText(query), query),
                                tokensFromText(query)
                              ),
                            }}
                          />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="px-3 py-1.5 text-[10px] text-muted-foreground border-t border-border">Tekan Enter untuk membuka hasil teratas</div>
              </div>
            )}
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
                          <Icon className="w-4 h-4 mr-3 shrink-0" />
                          <span className="flex-1 truncate text-left">{item.label}</span>
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
        <div className="flex-1 flex justify-center p-4 md:p-8">
          <div className="w-full max-w-4xl overflow-y-auto">
          {/* Mobile Header */}
          <div className="flex md:hidden items-center justify-between p-4 border-b border-border bg-background/95 backdrop-blur mb-4">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle Sidebar</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 overflow-y-auto" hideCloseButton>
                <div className="p-6 border-b border-border">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari dokumentasi..."
                      className="pl-10 border-border"
                      autoFocus={false}
                      tabIndex={-1}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && results.length > 0) {
                          setActiveSection(results[0].id);
                          setSidebarOpen(false);
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Mobile Navigation */}
                <nav className="p-6 space-y-8">
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
                                onClick={() => {
                                  setActiveSection(item.id);
                                  setSidebarOpen(false); // Auto-close sidebar
                                }}
                                className={`w-full flex items-center px-3 py-2 text-sm transition-colors hover:bg-muted/50 rounded ${
                                  isActive ? 'font-medium bg-muted/70 text-primary' : 'text-muted-foreground'
                                }`}
                              >
                                <Icon className="w-4 h-4 mr-3 shrink-0" />
                                <span className="flex-1 truncate text-left">{item.label}</span>
                                {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                      {query && (
                        <div className="mt-4 border-t border-border pt-4">
                          <div className="text-xs text-muted-foreground mb-2">Hasil pencarian</div>
                          <ul className="space-y-1">
                            {results.length === 0 ? (
                              <li className="text-xs text-muted-foreground">Tidak ada hasil</li>
                            ) : (
                              results.map((r) => (
                                <li key={r.id}>
                                  <button
                                    onClick={() => {
                                      setActiveSection(r.id);
                                      setSidebarOpen(false);
                                    }}
                                    className={`w-full text-left px-2 py-1.5 rounded hover:bg-muted/50 text-xs ${activeSection === r.id ? 'bg-muted/70' : ''}`}
                                  >
                                    <div className="font-medium text-foreground">{r.title}</div>
                                    <div
                                      className="text-muted-foreground line-clamp-2"
                                      dangerouslySetInnerHTML={{
                                        __html: highlightSnippet(
                                          makeSnippetAdvanced(r.text, tokensFromText(query), query),
                                          tokensFromText(query)
                                        ),
                                      }}
                                    />
                                  </button>
                                </li>
                              ))
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
            <h2 className="font-semibold text-foreground">Dokumentasi</h2>
          </div>

          {/* Main Content */}
          {renderContent(activeSection, setActiveSection)}

          {/* Bottom Navigation - mobile only */}
          <div className="md:hidden flex justify-between items-center mt-8 pt-4 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              disabled={!hasPrevious}
              onClick={() => previousItem && setActiveSection(previousItem.id)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Kembali
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasNext}
              onClick={() => nextItem && setActiveSection(nextItem.id)}
            >
              Lanjut
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
