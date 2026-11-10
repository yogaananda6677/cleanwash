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

### [#002] 2026-11-10 13:00 — Product Manager (`product-manager`) + Primary Agent — Phase 1 (`P1-01`)
- **Status:** `DONE`
- **Ringkasan Kegiatan:**
  - Melakukan Context Sync terhadap `PRD.md`, `AGENTS.md`, `MEMORY.md`, `WRITE.md` (`#001`), `.claude/napkin.md`, serta audit ulang diagram `Archive/Outputtts/UTS.pdf` dan `Archive/Use Case.xmi`.
  - Menyusun dokumen kontrak `docs/phases/PHASE_1_CONTRACTS.md` pada branch `docs/p1-01-contracts` mencakup breakdown `P1-01` s.d. `P1-07`, cetak biru skema 16 tabel MySQL 8.4 (`DECIMAL(12,2)`, port `3307`, tanpa `bcmath`/`pdo_sqlite`), kontrak route/FormRequest/TypeScript Props Phase 1, serta `AC-P1-01` s.d. `AC-P1-12` (`UC-01` DP, `UC-03..UC-09`, `KK-03`, `KK-09`).
  - Memperbarui `MEMORY.md` (Phase 1 `IN_PROGRESS`, `[x] P1-01`) dan menambahkan catatan gotcha PHP 8.4 / MySQL `3307` / runtime subagent di `.claude/napkin.md`.
- **File Dibuat / Diubah:**
  - `docs/phases/PHASE_1_CONTRACTS.md` — Kontrak skema, route, FormRequest, TS types, & 12 Acceptance Criteria Phase 1
  - `MEMORY.md` — Status Phase 1 menjadi `IN_PROGRESS` dan checklist `P1-01` selesai
  - `.claude/napkin.md` — Penambahan gotcha `pdo_sqlite`, `bcmath`, MySQL port `3307`, dan tool runtime subagent
  - `WRITE.md` — Penambahan Entry `#002`
- **Verifikasi / Bukti Uji:**
  - Audit silang kontrak terhadap `PRD.md` (§5, §8, §9, §10, §11) dan `Archive/Outputtts/UTS.pdf` (*Class Diagram*, *Activity 1*, *Sequence 1*) -> konsisten 100%.
  - Commit & merge branch `docs/p1-01-contracts` -> `main` bersih.
- **Keputusan / Blocker / Catatan Napkin:**
  - Subagent `product-manager` auto-discovered dari `.agents/agents/product-manager.md` hanya memiliki tool baca/cari di runtime sesi ini sehingga penyusunan kontrak dilakukan oleh `product-manager` dan penulisan/commit dieksekusi oleh Primary Agent; untuk `P1-02` dan seterusnya, gunakan subagent bernama unik via `define_subagent(..., enable_write_tools=true)`.
  - Aritmatika keuangan PHP dikunci memakai integer skala 100 (`App\Support\DecimalMoney`) tanpa `ext-bcmath`, dan test DB memakai MySQL 8.4 port `3307` tanpa `ext-pdo_sqlite`.
- **Next Exact Action:**
  - Delegasikan **`P1-02`** ke subagent fullstack (`cw-fullstack-dev` dengan `enable_write_tools=true`) pada branch `feature/p1-02-scaffolding` dari `main` untuk inisialisasi proyek Laravel 12 + MySQL 8.4 (`3307`) + `App\Support\DecimalMoney` + Inertia React TS + Pint + CI workflow.

### [#003] 2026-11-10 13:10 — Fullstack Developer (`cw-fullstack-dev`) — Phase 1 (`P1-02`)
- **Status:** `READY_FOR_REVIEW`
- **Ringkasan Kegiatan:**
  - Melakukan Context Sync (`PRD.md`, `AGENTS.md`, `MEMORY.md`, `WRITE.md`, `.claude/napkin.md`, `napkin/PR_REVIEW_LIFECYCLE.md`, `docs/phases/PHASE_1_CONTRACTS.md`) dan membuat branch `feature/p1-02-scaffolding` dari `main`.
  - Melakukan scaffolding **Laravel 12** (`laravel/laravel:^12.0` -> `laravel/framework v12.71.0`) secara non-destruktif melalui `/tmp/cleanwash_scaffold` tanpa menimpa dokumen governance, arsip `Archive/`, maupun `.git/`, serta menggabungkan `.gitignore` dan menghapus folder sementara.
  - Menyiapkan container MySQL 8.4 terisolasi (`cleanwash-mysql` via `docker-compose.yml` + `docker/mysql/init.sql`) pada `127.0.0.1:3307:3306` (tanpa menyentuh `pesenhub-mysql-1` di port `3306`), membuat database `cleanwash` dan `cleanwash_testing`, mengonfigurasi `.env.example`, `.env`, `.env.testing` (ter-ignore), `phpunit.xml`, `config/database.php`, dan timezone `Asia/Jakarta` di `config/app.php`.
  - Memasang `inertiajs/inertia-laravel` (`v3.7.0`), `react`, `react-dom`, `@inertiajs/react` (`3.11.0`), `typescript`, `@types/react`, `@types/react-dom`, dan `@vitejs/plugin-react` (`^5.2.0` kompatibel Vite 7), mengonfigurasi `HandleInertiaRequests`, `bootstrap/app.php`, `config/inertia.php` (`resources/js/Pages`), `tsconfig.json` (`strict: true`), `vite.config.js`, `resources/css/app.css` (Tailwind v4), `resources/views/app.blade.php`, `resources/js/app.tsx`, `resources/js/types/index.ts`, halaman smoke `resources/js/Pages/Welcome.tsx`, `pint.json` (`laravel` preset), dan `.github/workflows/ci.yml`.
  - Mengimplementasikan `App\Support\DecimalMoney` berbasis integer skala 100 (tanpa `ext-bcmath` dan tanpa `float`) beserta unit tests `tests/Unit/DecimalMoneyTest.php` dengan alur TDD (Red -> Green), serta memperbarui `tests/Feature/ExampleTest.php` untuk memverifikasi Inertia `Welcome`, timezone `Asia/Jakarta`, dan koneksi MySQL 8.4 port `3307` (`cleanwash_testing`).
- **File Dibuat / Diubah:**
  - `docker-compose.yml`, `docker/mysql/init.sql` — Container MySQL 8.4 terisolasi port `3307` (`cleanwash` & `cleanwash_testing`)
  - `.gitignore`, `.env.example`, `phpunit.xml`, `config/app.php`, `config/database.php`, `config/inertia.php` — Konfigurasi environment MySQL `3307`, timezone `Asia/Jakarta`, dan path Inertia `resources/js/Pages`
  - `bootstrap/app.php`, `app/Http/Middleware/HandleInertiaRequests.php`, `routes/web.php` — Registrasi middleware Inertia & shared props (`auth.user`, `flash`)
  - `composer.json`, `composer.lock`, `package.json`, `package-lock.json`, `vite.config.js`, `tsconfig.json`, `pint.json`, `.github/workflows/ci.yml` — Dependensi Laravel 12 + Inertia React TS, formatter Pint, dan CI GitHub Actions
  - `resources/css/app.css`, `resources/views/app.blade.php`, `resources/js/app.tsx`, `resources/js/types/index.ts`, `resources/js/Pages/Welcome.tsx` — Entrypoint frontend Inertia React TypeScript strict & halaman smoke
  - `app/Support/DecimalMoney.php`, `tests/Unit/DecimalMoneyTest.php`, `tests/Feature/ExampleTest.php` — Helper aritmatika uang integer-scaled & test suite awal
  - `MEMORY.md`, `.claude/napkin.md`, `WRITE.md` — Update status `P1-02`, ADR-010, dan gotcha runtime baru
- **Verifikasi / Bukti Uji:**
  - `docker compose up -d --wait` -> `cleanwash-mysql` (`mysql:8.4`) `Healthy` pada `127.0.0.1:3307->3306/tcp` -> `exit code 0`
  - `php artisan migrate:fresh --no-interaction` -> 3 migrasi default sukses pada `cleanwash` (`3307`) -> `exit code 0`
  - `php artisan migrate:rollback --no-interaction && php artisan migrate --no-interaction` -> rollback & migrate ulang bersih -> `exit code 0`
  - `./vendor/bin/pint --test` -> `{"tool":"pint","result":"passed"}` -> `exit code 0`
  - `npx tsc --noEmit` -> 0 error (`strict: true`) -> `exit code 0`
  - `php artisan test` -> `9 passed (63 assertions)` (6 `DecimalMoneyTest`, 1 `Unit\ExampleTest`, 2 `Feature\ExampleTest` di `cleanwash_testing` port `3307`) -> `exit code 0`
  - `npm run build` -> Vite production build (`654 modules transformed`, `public/build/manifest.json`) -> `exit code 0`
  - `git status` -> tidak ada `.env`, `.env.testing`, `vendor/`, `node_modules/`, `public/build/`, maupun `Archive/` yang ikut ter-stage.
- **Keputusan / Blocker / Catatan Napkin:**
  - Dicatat ADR-010 di `MEMORY.md` dan 3 gotcha baru di `.claude/napkin.md` (`laravel/laravel:^12.0`, `inertia.php` `resources/js/Pages` pada v3, dan `@vitejs/plugin-react@^5.2.0` untuk Vite 7).
  - Tidak ada blocker.
- **Next Exact Action:**
  - Setelah review/merge `feature/p1-02-scaffolding` ke `main`, delegasikan **`P1-03`** ke subagent backend (`cw-backend-dev` dengan `enable_write_tools=true`) pada branch `feature/p1-03-schema-auth` dari `main` untuk membuat migrasi penuh seluruh 16 tabel domain Phase 1–3 (`DECIMAL(12,2)` di MySQL `3307`), seeder aktor (`Petugas`, `Pegawai`, `PetugasPengantaran`), Eloquent Models, Auth (`/login`, `/logout`, `/dashboard`), middleware RBAC `role:...`, dan feature tests + uji `migrate && migrate:rollback`.

### [#004] 2026-11-10 13:30 — Backend Developer (`cw-backend-dev`) — Phase 1 (`P1-03`)
- **Status:** `READY_FOR_REVIEW`
- **Ringkasan Kegiatan:**
  - Melakukan Context Sync (`PRD.md`, `AGENTS.md`, `MEMORY.md`, `WRITE.md` `#001`–`#003`, `.claude/napkin.md`, `napkin/PR_REVIEW_LIFECYCLE.md`, `docs/phases/PHASE_1_CONTRACTS.md`) dan membuat branch `feature/p1-03-schema-auth` dari `main`.
  - Menerapkan TDD (Red $\rightarrow$ Green $\rightarrow$ Refactor) dengan menulis test skema/relasi/seeder (`tests/Unit/DomainSchemaRelationsTest.php`) dan feature test Auth/RBAC (`tests/Feature/AuthAndRbacTest.php`) terlebih dahulu sebelum implementasi.
  - Memperbarui migrasi `users` (`role` indexed, `is_active` default `true`, drop order `down()` aman) serta membuat 15 migrasi tabel domain Phase 1–3 (`petugas`, `pegawai`, `petugas_pengantaran`, `pelanggan`, `jenis_layanan`, `tahap_layanan`, `voucher`, `transaksi`, `detail_pakaian`, `pembayaran`, `riwayat_status_produksi`, `laporan_kerusakan_kehilangan`, `pengantaran`, `item_pengantaran`, `audit_logs`) menggunakan engine `InnoDB`, `DECIMAL(12,2)` untuk seluruh nominal uang, `DECIMAL(8,2)` untuk kuantitas/berat, FK constraint ketat, dan `down()` rollback bersih.
  - Membuat 12 PHP 8.4 backed string Enums di `app/Enums/` (+ trait `HasValues` dan `TahapProduksi::canonicalSequence()`), memperbarui `User` + `UserFactory`, serta membuat 15 Eloquent Models lainnya lengkap dengan `$table` singular, `$primaryKey`, `$incrementing = false` & `$keyType = 'string'` (`Transaksi`, `Voucher`), `$fillable`, `$casts` (`decimal:2` via `Brick\Math\BigDecimal` tanpa `bcmath` maupun `float`), dan relasi `hasOne`/`hasMany`/`belongsTo`/`belongsToMany`.
  - Membuat `CleanWashSeeder` idempoten (3 staf aktif + profil `Petugas`, `Pegawai`, `PetugasPengantaran` dengan email `@cleanwash.local`, sampel `Pelanggan` reguler & `boleh_bayar_akhir=true`, `JenisLayanan` `Cuci Setrika` & `Cuci Sepatu` `perlu_setrika=false` tanpa tahap `DISETRIKA`, dan `Voucher` awal) serta menghubungkannya ke `DatabaseSeeder`.
  - Mengimplementasikan `EnsureUserHasRole` (alias `'role'` di `bootstrap/app.php`, HTTP `403` untuk role tidak sesuai atau `is_active = false`), memperbarui `HandleInertiaRequests` (`auth.user` mengirim `{ id, name, email, role, is_active, actor_id }`), `LoginRequest`, `AuthController` (`showLogin`, `login`, `logout`), `DashboardController` (ringkasan role-specific aman), dan `routes/web.php` (`/` redirect `/dashboard` atau `/login`, `/login`, `/logout`, `/dashboard`).
  - Memastikan `resources/js/` dan `resources/css/` tidak disentuh sama sekali.
- **File Dibuat / Diubah:**
  - `database/migrations/0001_01_01_000000_create_users_table.php` & `2026_11_10_000001` s.d. `2026_11_10_000015` — Skema penuh 16 tabel domain CleanWash MySQL 8.4
  - `app/Enums/Concerns/HasValues.php`, `UserRole.php`, `TingkatKecepatan.php`, `MetodeHitung.php`, `SatuanLayanan.php`, `TahapProduksi.php`, `VoucherStatus.php`, `StatusPembayaran.php`, `StatusTransaksi.php`, `JenisBayar.php`, `JenisInsiden.php`, `StatusPengantaran.php`, `StatusItemPengantaran.php` — 12 Enum domain PHP 8.4 + trait helper
  - `app/Models/{User,Petugas,Pegawai,PetugasPengantaran,Pelanggan,JenisLayanan,TahapLayanan,Voucher,Transaksi,DetailPakaian,Pembayaran,RiwayatStatusProduksi,LaporanKerusakanKehilangan,Pengantaran,ItemPengantaran,AuditLog}.php` — 16 Eloquent Models lengkap relasi & casts
  - `database/factories/UserFactory.php`, `database/seeders/CleanWashSeeder.php`, `database/seeders/DatabaseSeeder.php` — Factory states peran & seeder idempoten
  - `app/Http/Middleware/EnsureUserHasRole.php`, `app/Http/Middleware/HandleInertiaRequests.php`, `bootstrap/app.php` — Middleware RBAC `role:...`, shared Inertia props (`actor_id`), dan redirect auth/guest
  - `app/Http/Requests/Auth/LoginRequest.php`, `app/Http/Controllers/Auth/AuthController.php`, `app/Http/Controllers/DashboardController.php`, `routes/web.php` — Endpoint Auth, Logout, dan Dashboard per peran
  - `tests/Unit/DomainSchemaRelationsTest.php`, `tests/Feature/AuthAndRbacTest.php`, `tests/Feature/ExampleTest.php` — Automated tests untuk skema, presisi `DECIMAL`, relasi, seeder, login, akun nonaktif `422`, dan RBAC `403`
  - `MEMORY.md`, `.claude/napkin.md`, `WRITE.md` — Update status `[x] P1-03`, gotcha test Inertia/CI, dan Entry `#004`
- **Verifikasi / Bukti Uji:**
  - `./vendor/bin/pint --test` -> `{"tool":"pint","result":"passed"}` (`exit code 0`)
  - `php artisan test` -> `19 passed (364 assertions)` pada MySQL 8.4 port `3307` (`cleanwash_testing`) (`exit code 0`)
  - `php artisan migrate:fresh --seed --no-interaction` -> 18 file migrasi + `CleanWashSeeder` sukses (`exit code 0`)
  - `php artisan migrate:rollback --no-interaction && php artisan migrate --seed --no-interaction` -> rollback 18 migrasi dengan data seed terisi & migrasi ulang + seed bersih (`exit code 0`)
  - `npx tsc --noEmit && npm run build` -> 0 error TS, Vite production build (`654 modules transformed`) (`exit code 0`)
- **Keputusan / Blocker / Catatan Napkin:**
  - Dikonfirmasi Eloquent cast `'decimal:2'` pada Laravel 12 memakai `Brick\Math\BigDecimal` tanpa memerlukan `ext-bcmath` atau `float`, tetap sinkron dengan `App\Support\DecimalMoney` untuk aritmatika bisnis.
  - Ditambahkan gotcha #6 di `.claude/napkin.md` mengenai pemakaian `$this->withoutVite()` dan `shouldExist: false` pada `assertInertia()` sebelum halaman TSX `P1-06` dibuat.
  - Tidak ada blocker.
- **Next Exact Action:**
  1. Setelah review & merge `feature/p1-03-schema-auth` ke `main`, delegasikan **`P1-04`** ke `backend-developer` pada branch `feature/p1-04-master-crud` untuk membangun `PelangganService`/`Controller`/`Policy`, `JenisLayananService`/`Controller` (sinkronisasi `TahapLayanan`), dan `VoucherService::cekValiditasPreview()` + `VoucherController` (`POST /voucher/validate`) beserta automated tests (`AC-P1-04` s.d. `AC-P1-06`).
  2. Secara paralel setelah `P1-03` di-merge, **`P1-06`** (`frontend-developer`) dapat mulai membangun `resources/js/types/` sinkron dengan `PHASE_1_CONTRACTS.md` §3, `AppLayout` per peran, `Auth/Login.tsx`, dan `Dashboard/Index.tsx`, lalu terintegrasi dengan `P1-04` & `P1-05`.
