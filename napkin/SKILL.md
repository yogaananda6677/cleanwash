---
name: napkin
description: |
  Maintain a per-repo napkin as a continuously curated runbook paired with
  mandatory WRITE.md activity logging and MEMORY.md phase tracking. Activates
  EVERY session and subagent invocation for CleanWash (Laravel 12 + MySQL 8.4
  + Inertia React TS). Read and curate before work, enforce mandatory
  WRITE.md logging after every activity, keep only recurring high-value
  guidance in `.claude/napkin.md`, organize by priority-sorted categories, and
  cap each category at top 10 items.
author: Napkin Community, AGENTS Core & CleanWash Architecture
version: 7.0.0
date: 2026-11-10
---

# Napkin: Persistent Agent Memory, Curated Runbook & Zero-Context-Loss Protocol

Skill ini diadaptasi dari `blader/napkin` dan standar `PTT_app`, lalu **diperluas khusus untuk CleanWash** agar AI Agent (Primary Agent maupun 4 Subagent: *Product Manager, Backend Developer, Frontend Developer, Fullstack Developer*) tidak pernah kehilangan konteks lintas sesi dan tidak mengulangi kesalahan teknis maupun pelanggaran aturan SRS.

**Skill ini WAJIB aktif pada setiap sesi dan setiap pemanggilan subagent.**

---

## 1. Arsitektur Memori Tiga Lapis (Aturan Tambahan Wajib)

Untuk mencegah konflik antara *runbook aturan* dan *log aktivitas harian*, memori proyek dibagi menjadi 3 file dengan tanggung jawab tegas:

1. **`.claude/napkin.md` (Curated Operational Runbook):**
   - Menyimpan aturan berulang, gotcha toolchain (Laravel 12, MySQL 8.4, Vite/Inertia), dan batasan arsitektur dalam format `Do instead:`.
   - **Bukan** tempat mencatat kronologi pekerjaan harian.
2. **`WRITE.md` (Mandatory Activity & Handoff Ledger — WAJIB HUKUMNYA):**
   - Menyimpan catatan kronologis terstruktur setiap selesai aktivitas/subtask (apa yang diubah, file disentuh, perintah & hasil verifikasi, blocker, dan *next exact action*).
   - Menjamin subagent berikutnya langsung menyambung konteks tanpa kehilangan jejak.
3. **`MEMORY.md` (Project Snapshot, ADR & 3-Phase Checklist):**
   - Menyimpan status Phase 1–3, keputusan arsitektur (ADR), dan daftar periksa fitur/exit criteria.

---

## 2. Siklus Awal Sesi & Sebelum Bertindak (Ingestion & Curation)

Setiap kali Primary Agent atau Subagent memulai tugas:
1. **Baca Konteks Wajib:**
   - Baca `.claude/napkin.md` (internalisasi aturan & gotcha aktif).
   - Baca `WRITE.md` (minimal 3 entri terakhir untuk memahami posisi kerja terakhir).
   - Baca `MEMORY.md` (cek Phase aktif dan Invariants) serta bagian relevan di `PRD.md`.
2. **Terapkan Secara Eksplisit:** Gunakan aturan yang relevan langsung saat bekerja.
3. **Kurasi `.claude/napkin.md` secara berkala:**
   - Urutkan item dari prioritas paling kritis di paling atas.
   - Gabungkan catatan duplikat dan hapus catatan usang (*stale*).
   - Pastikan setiap item punya tindakan konkret `"Do instead:"`.
   - Batasi maksimal **10 item per kategori** (*top-10 cap*).

---

## 3. Siklus Akhir Kegiatan (Mandatory Write & Continuous Update)

Sebelum mengakhiri giliran, melakukan handoff antar subagent, atau menyatakan tugas selesai:
1. **Wajib Tulis `WRITE.md`:** Tambahkan entri baru pada `WRITE.md` berisi ringkasan kegiatan, daftar file yang diubah, bukti exit code 0 perintah verifikasi, dan langkah lanjutan untuk agent berikutnya. **Tugas dianggap belum selesai jika `WRITE.md` belum diperbarui.**
2. **Perbarui `MEMORY.md`:** Jika ada item phase checklist yang selesai (`[x]`), perubahan status phase, atau ADR baru.
3. **Perbarui `.claude/napkin.md`:** Jika selama bekerja ditemukan bug berulang, koreksi dari user/reviewer, atau jebakan toolchain/SRS baru.

### Yang Wajib Dicatat di `.claude/napkin.md`:
- Gotcha perilaku Laravel 12, PHP 8.2+, MySQL 8.4, Inertia.js, React/TypeScript, atau Vite.
- Pelajaran dari pelanggaran invarian SRS CleanWash (mis. lupa snapshot tarif, float untuk nominal uang, lupa lock voucher, melewati batas tahap produksi).
- Preferensi/direktif Owner atau aturan orkestrasi multi-subagent yang berulang.

### Yang Tidak Boleh Dicatat di `.claude/napkin.md` (Catat di `WRITE.md`!):
- Kronologi aktivitas harian (*"Jam 13.00 saya membuat controller X"* $\rightarrow$ masuk ke **`WRITE.md`**).
- Penjelasan panjang tanpa aksi solusi `"Do instead:"`.

---

## 4. Format Standar Entri `.claude/napkin.md`

```markdown
1. **[YYYY-MM-DD] Judul Masalah / Aturan Singkat**
   Do instead: Tindakan konkret, repeatable, dan dapat dieksekusi langsung.
```

*Contoh Entri CleanWash:*
```markdown
1. **[2026-11-10] Kalkulasi nominal uang memakai float menyebabkan selisih pembulatan**
   Do instead: Gunakan kolom `DECIMAL(12,2)` pada migrasi MySQL 8.4 dan lakukan seluruh kalkulasi harga, diskon voucher, DP, serta kompensasi di Service Layer backend tanpa mengandalkan float JS.
```

---

## 5. Kebijakan Kategori `.claude/napkin.md` (4 Kategori Prioritas)

1. **Execution, Testing & Context Continuity (Prioritas Tertinggi):** Uji Laravel/MySQL/Frontend, migration rollback, dan kewajiban tulis `WRITE.md`.
2. **Shell & Command Reliability:** Perintah CLI non-interaktif, Composer/Artisan/NPM flags, dan keamanan git.
3. **CleanWash Domain & Architecture Guardrails:** Invarian SRS (14 Use Case, 9 Kondisi Khusus), snapshot tarif, voucher lock, RBAC 3 peran, pemisahan BE–FE.
4. **Multi-Agent Orchestration & Workspace Directives:** Kepemilikan direktori antar 4 subagent, aturan handoff, dan batas ruang kerja.
