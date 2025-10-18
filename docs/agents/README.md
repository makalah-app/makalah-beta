# Dokumentasi Agen

Folder ini nyimpen dokumen teknis buat agen-agen AI yang jalan di aplikasi. Simpan catatan desain, acceptance criteria, dan SOP routing biar gampang sinkron sama kebijakan di `__references__/agent_as_tool`. Tambahkan file baru setiap kali ada agen spesifik supaya histori keputusan tetap rapi.

## System Context & Branding

- Library `@ai-sdk-tools/agents` otomatis menyisipkan prefix sistem ketika agen punya `handoffs`. Default-nya nyebut “AI SDK Agents”, bikin identitas Makalah ilang di percakapan.  
- Ada patch lokal di `patches/@ai-sdk-tools+agents+0.2.2.patch` yang ngeganti prefix jadi “Makalah AI” untuk file `dist/index.js` dan `dist/index.cjs`.  
- `package.json` jalanin `patch-package` di hook `postinstall`, jadi pastiin langkah install selalu lewat `npm install` / `npm ci` supaya patch ke-apply. Kalau upgrade versi paket, regenerate patch ini biar branding tetap konsisten.
- Agen juga pakai working memory persist di tabel Supabase `working_memory` lewat provider `src/lib/ai/memory/supabase-memory-provider.ts`. Pastikan migrasi tetap jaga kolom `id`, `scope`, `chat_id`, `user_id`, `content`, `updated_at`.

## Streaming Artifact (UX Notes)

- Agent policy: inisiasi stream lebih dulu (payload minimal), lalu persist per-section, stream update, dan finalize terakhir.
- Tool `writeArtifact` mendukung `finalize?: boolean` (default `true`). Gunakan `finalize=false` untuk menampilkan panel lebih awal; panggil lagi dengan `finalize=true` saat siap.
- Default perilaku non-final adalah streaming word-by-word (chunk kecil) tanpa perlu env flag. Opsi lain `progressive: 'paragraph' | 'sentence'` tersedia bila ingin mengganti granularity.
- Working memory autosummarizer berjalan pada onFinish di chat route dan tidak terpengaruh alur streaming artifact.
