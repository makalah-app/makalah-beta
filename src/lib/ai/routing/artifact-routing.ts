const WHITESPACE_PATTERN = /\s+/g;

const OPERATION_KEYWORDS = [
  'tambahkan',
  'tambah',
  'tulis',
  'perbarui',
  'perbaruan',
  'update',
  'revisi',
  'ubah',
  'modifikasi',
  'ganti',
  'hapus',
  'hapuskan',
  'validasi',
  'perbaiki',
  'perbaikan',
  'rapikan',
  'rapihkan',
  'ringkas',
  'lengkapi',
  'lengkapkan',
  'sinkronkan',
  'seragamkan',
];

const SECTION_KEYWORDS = [
  'ringkasan',
  'abstrak',
  'analisis',
  'analisa',
  'kesimpulan',
  'strategi',
  'rekomendasi',
  'referensi',
  'daftar pustaka',
  'sumber',
  'link',
  'kutipan',
  'bagian',
  'paragraf',
  'synopsis',
  'outline',
  'struktur',
  'section',
  'subbab',
  'judul',
  'headline',
];

const ARTIFACT_TERMS = [
  'artefak',
  'artifact',
  'makalah',
  'paper',
  'dokumen',
  'naskah',
  'konten',
  'laporan',
  'analisis',
  'analisa',
  'teks',
  'hasil',
];

const OPERATION_PATTERN = new RegExp(`\\b(${OPERATION_KEYWORDS.join('|')})\\b`);
const SECTION_PATTERN = new RegExp(`\\b(${SECTION_KEYWORDS.join('|')})\\b`);
const ARTIFACT_PATTERN = new RegExp(`\\b(${ARTIFACT_TERMS.join('|')})\\b`);
const CHAT_PATTERN = /\b(chat|obrolan|percakapan|balas|reply)\b/;

export function shouldRouteToArtifactWriter(rawMessage: string): boolean {
  if (!rawMessage) return false;
  const text = rawMessage.toLowerCase().replace(WHITESPACE_PATTERN, ' ').trim();
  if (!text) return false;

  if (text.includes('tanpa artefak') || text.includes('jangan artefak')) {
    return false;
  }

  if (text.startsWith('/artifact') || text.startsWith('/analisis')) {
    return true;
  }

  const hasOperation = OPERATION_PATTERN.test(text);
  const hasSection = SECTION_PATTERN.test(text);
  const hasArtifactTerm = ARTIFACT_PATTERN.test(text);
  const mentionsChat = CHAT_PATTERN.test(text);

  if (hasOperation && hasSection) {
    if (mentionsChat && !hasArtifactTerm) {
      return false;
    }
    return true;
  }

  if (hasOperation && hasArtifactTerm) {
    return true;
  }

  if (hasSection && (text.includes('update') || text.includes('tambahkan') || text.includes('hapus'))) {
    if (mentionsChat && !hasArtifactTerm) {
      return false;
    }
    return true;
  }

  if (hasOperation && (text.includes('link') || text.includes('referensi') || text.includes('sumber'))) {
    return true;
  }

  if (hasSection && (text.includes('ringkas') || text.includes('lengkapi') || text.includes('perbaiki'))) {
    return true;
  }

  return false;
}

export function describeArtifactRouting(message: string): string {
  return shouldRouteToArtifactWriter(message) ? 'route:artifact-writer' : 'route:orchestrator';
}
