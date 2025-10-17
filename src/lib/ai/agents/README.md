# Agen AI

Kode agen baru taruh di direktori ini biar terpisah dari kumpulan tools. Ikuti panduan di `__references__/agent_as_tool` dan standar AI SDK v5 waktu ngebangun agent (instruksi ringkas, tool tunggal, streaming writer). Buat satu file per agent dan ekspor dari `index.ts` nanti kalau sudah ada implementasi.

## Daftar Spesialis Saat Ini
- **Artifact Writer** — menangani generasi/penyegaran artefak akademik formal melalui tool `writeArtifact`. Semua permintaan update artefak harus di-handoff ke agent ini.
