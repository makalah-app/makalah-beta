# Repository Guidelines

Dokumen ini bantu lo ngerti cara kontribusi di repo makalahApp biar alur kerja gue-lo tetap rapi dan konsisten.

## Struktur Proyek & Organisasi Modul
- `app/` nyimpen Next.js App Router (chat, tutorial, admin, api).
- `src/` isi komponen bersama (`components/`), hooks, dan utilitas.
- `public/` buat aset statis; `docs/` dan `documentation/` pegang referensi konten.
- `tests/` sama `test-utils/` nyiapin suite Jest/Playwright; `scripts/` simpen utilitas CLI termasuk MCP.

## Perintah Build, Test, dan Pengembangan
- `npm run dev` jalanin server lokal di `http://localhost:3000`.
- `npm run build` bikin bundel produksi; lanjutin dengan `npm run start` kalau lo mau verifikasi.
- `npm run lint` dan `npm run type-check` wajib sebelum push.
- `npx jest --coverage` evaluasi unit/integration; `npx playwright test` buat e2e (instal browser dulu via `npx playwright install`).

## Gaya Koding & Konvensi Penamaan
- Bahasa utama TypeScript + React 18, indent 2 spasi, panjang baris ~100 karakter.
- Komponen pakai PascalCase (`src/components/GlobalHeader.tsx`), hooks camelCase (`useThemeToggle`).
- Modul/lib folder lowercase-kebab (`src/lib/api-client.ts`).
- Patuhin ESLint & Prettier yang udah dikonfigurasi; jangan masukin karakter non-ASCII kecuali udah ada konteksnya.

## Panduan Testing
- Unit/integration jalan di Jest dengan setup `jest.setup.js`; simpan file test di `src/**/*.{test,spec}.tsx` atau `src/__tests__/`.
- E2E pegang Playwright; konfigurasi ada di `playwright.config.ts`.
- Target coverage dicek manual via `npx jest --coverage`; fail yang flakey harus lo stabilin sebelum merge.

## Pedoman Commit & Pull Request
- Ikutin Conventional Commits (`feat:`, `fix:`, `docs:`) dan jelasin perubahan singkat tapi konkret.
- PR wajib ada ringkasan, link issue kalau relevan, bukti testing (`npm run lint`, `npm run type-check`), plus screenshot UI bila ada update visual.
- Jangan gabung sebelum CI aman; kalau ada perubahan perilaku, tambahin atau update test.

## Keamanan & Konfigurasi
- Salin `.env.local.example` ke `.env.local`; rahasiain kredensial Supabase/Upstash.
- Operasi Supabase pakai `node scripts/mcp-with-crypto.mjs "<SQL>"` biar crypto polyfill aktif; hindarin tool MCP lain.
- Pastikan port 3000 kosong sebelum jalanin Playwright dan hormatin RLS saat akses database.
