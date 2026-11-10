# WRITE.md — Active Context & Mandatory Activity Ledger

> **HUKUM WAJIB TULIS `.md` (NON-NEGOTIABLE):**
> Setiap agent (Primary Agent maupun Subagent: `product-manager`, `backend-developer`, `frontend-developer`, `fullstack-developer`) **WAJIB membaca minimal 3 entri terakhir** file ini di awal tugas, dan **WAJIB menambahkan entri baru di bagian paling bawah** setiap kali selesai melakukan kegiatan, menyelesaikan subtask, menemukan blocker, atau sebelum handoff/mengakhiri giliran.
>
> **Tujuan:** Menjamin **zero context loss** di antara sesi maupun perpindahan antar subagent.

---

## Aturan Pengisian & Pemeliharaan

1. **Jangan menimpa entri sebelumnya:** Selalu tambahkan entri baru secara berurutan (`#001`, `#002`, `#003`, dst.).
2. **Wajib Berisi Fakta Terverifikasi:** Hanya tuliskan file yang benar-benar dibuat/diubah serta perintah uji dan exit code yang benar-benar dijalankan.
3. **Selalu Sertakan `Next Exact Action`:** Agent berikutnya harus tahu persis langkah selanjutnya tanpa menebak.
4. **Kebijakan Arsip (Anti-Bloat):** Jika jumlah entri melebihi **30 entri**, pindahkan entri #1 s.d. #20 ke `docs/logs/ARCHIVE_YYYY-MM.md`, sisakan ringkasan milestone di atas dan 10 entri terakhir di file ini.

### Template Entri Standar

```markdown
### [#NNN] YYYY-MM-DD HH:MM — [Role / Subagent] — [Phase & Task ID]
- **Status:** `IN_PROGRESS` | `HANDOFF` | `READY_FOR_REVIEW` | `DONE` | `BLOCKED`
- **Ringkasan Kegiatan:** Jelaskan apa yang dikerjakan secara ringkas dan faktual.
- **File Dibuat / Diubah:**
  - `path/to/file` — keterangan singkat
- **Verifikasi / Bukti Uji:**
  - `<command>` -> `exit code 0` / ringkasan hasil
- **Keputusan / Blocker / Catatan Napkin:** Sebutkan ADR baru, perubahan kontrak, atau gotcha baru yang juga ditambahkan ke `.claude/napkin.md`.
- **Next Exact Action:** Langkah konkret berikutnya beserta target role/subagent.
```

---

## Log Aktivitas Proyek

### [#001] 2026-11-10 12:35 — System Architect / Primary Agent — Phase 0 (Baseline Docs & Agent Framework)
- **Status:** `DONE`
- **Ringkasan Kegiatan:**
  - Melakukan audit dokumen SRS CleanWash pada `Archive/Outputtts/UTS.pdf` (10 halaman UML: *Class Diagram*, *Activity 0–3*, *Sequence 0–4*) dan naskah lengkap di `Archive/2UTS_CleanWash_Revisi_Parafrase_Format_Gambar_Jernih.docx` serta `Archive/Use Case.xmi`.
  - Menyusun dokumen produk `PRD.md` dengan pemetaan penuh 4 Aktor, 14 Use Case, 13 Class (+ `TahapLayanan`), dan 9 Kondisi Khusus (`KK-01` s.d. `KK-09`) pada stack Laravel 12 + PHP 8.2+ + MySQL 8.4 + Inertia.js (React + TypeScript + Tailwind CSS).
  - Menyusun `AGENTS.md` dengan pembagian **3 Phase**, siklus kerja **6 Tahap**, orkestrasi **4 Subagent**, dan protokol wajib tulis `.md`.
  - Mengadaptasi dan memperkuat sistem `napkin` dari referensi `PTT_app/napkin/` dan `/home/yoga/Data/AGENTS/skills/napkin-memory/` menjadi `napkin/SKILL.md`, `napkin/PR_REVIEW_LIFECYCLE.md`, dan `.claude/napkin.md` (menambahkan quality gate Laravel/MySQL/Inertia, aturan wajib tulis `WRITE.md`, batas kepemilikan 4 subagent, dan invarian domain CleanWash).
  - Menyusun 4 definisi subagent (`product-manager`, `backend-developer`, `frontend-developer`, `fullstack-developer`) di `.agents/agents/` (+ symlink `.claude/agents/`), workspace rule `.agents/rules/mandatory-context-write.md`, `CLAUDE.md`, `MEMORY.md`, `WRITE.md`, `.gitignore`, dan inisialisasi repositori Git branch `main`.
- **File Dibuat / Diubah:**
  - `PRD.md` — Product Requirement Document lengkap berbasis SRS CleanWash
  - `AGENTS.md` — Konstitusi agent, siklus kerja 6 tahap, 3-Phase roadmap, & matriks delegasi subagent
  - `CLAUDE.md` — Entrypoint kompatibilitas menunjuk ke `AGENTS.md` & dokumen konteks
  - `MEMORY.md` — Snapshot status proyek, 10 invarian, 9 ADR, dan checklist Phase 1–3
  - `WRITE.md` — Ledger aktivitas wajib anti-hilang konteks (file ini)
  - `napkin/SKILL.md` — Skill memori persisten teradaptasi dengan aturan 3-lapis memori & subagent handoff
  - `napkin/PR_REVIEW_LIFECYCLE.md` — 6 Gerbang Kualitas untuk Laravel 12 / MySQL 8.4 / Inertia React TS & wajib `WRITE.md`
  - `.claude/napkin.md` — Runbook aktif terkurasi khusus CleanWash
  - `.agents/agents/product-manager.md`, `backend-developer.md`, `frontend-developer.md`, `fullstack-developer.md` (serta symlink di `.claude/agents/`)
  - `.agents/rules/mandatory-context-write.md` — Rule always-on agar setiap sesi wajib membaca dan menulis `.md`
  - `.gitignore` — Konfigurasi ignore Laravel, Node, `.env`, dan file lock sementara
- **Verifikasi / Bukti Uji:**
  - Verifikasi silang path SRS, kelengkapan 14 Use Case, 13 Class (+ `TahapLayanan`), dan 9 Kondisi Khusus -> tervalidasi lengkap.
  - Verifikasi struktur file, symlink `.claude/agents/`, dan status `git status` -> bersih.
- **Keputusan / Blocker / Catatan Napkin:**
  - ADR-001 s.d. ADR-009 dikunci di `MEMORY.md`. Tidak ada blocker.
  - Catatan penting: Berkas SRS asli kini tersimpan di `Archive/` dan harus diperlakukan read-only.
- **Next Exact Action:**
  1. Mulai **Phase 1**: delegasikan **`P1-01`** ke subagent `product-manager` untuk memecah task detail & kontrak props/payload Phase 1.
  2. Setelah kontrak siap, delegasikan **`P1-02`** ke subagent `fullstack-developer` pada branch `feature/p1-02-scaffolding` untuk inisialisasi proyek Laravel 12 + MySQL 8.4 + Inertia React TS + Pint + CI.
