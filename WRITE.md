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

### [#005] 2026-11-10 13:40 — Backend Developer (`cw-backend-dev`) — Phase 1 (`P1-04`)
- **Status:** `READY_FOR_REVIEW`
- **Ringkasan Kegiatan:**
  - Melakukan Context Sync (`PRD.md`, `AGENTS.md`, `MEMORY.md`, `WRITE.md` `#002`–`#004`, `.claude/napkin.md`, `napkin/PR_REVIEW_LIFECYCLE.md`, `docs/phases/PHASE_1_CONTRACTS.md`) dan membuat branch `feature/p1-04-master-crud` dari `main`.
  - Menerapkan TDD (Red $\rightarrow$ Green $\rightarrow$ Refactor): menulis `tests/Feature/MasterPelangganTest.php`, `tests/Feature/MasterJenisLayananTest.php`, dan `tests/Feature/MasterVoucherTest.php` (17 test gagal awal pada fase Red) sebelum implementasi layanan & endpoint.
  - Mengimplementasikan Master **`Pelanggan`**: `PelangganService` (paginasi + pencarian `nama`/`no_telepon` aman LIKE escaping via `App\Support\SqlLike`, create/update, blokir delete bila memiliki `Transaksi`), `BasePelangganRequest`/`StorePelangganRequest`/`UpdatePelangganRequest`, `PelangganPolicy`, dan `PelangganController` (`Pelanggan/Index`, kontrak §3.2).
  - Mengimplementasikan Master **`JenisLayanan` + `TahapLayanan`**: `JenisLayananService` (dalam `DB::transaction()`, normalisasi `harga_satuan` via `DecimalMoney`, sinkronisasi otomatis urutan kanonik atau validasi tahapan kustom tanpa `DISETRIKA` jika `perlu_setrika = false`, blokir delete bila dipakai `Transaksi`), `BaseJenisLayananRequest`/`StoreJenisLayananRequest`/`UpdateJenisLayananRequest` (pasangan wajib `BERAT <-> kg` & `JUMLAH <-> pcs`, unik `(nama_layanan, tingkat_kecepatan)`), `JenisLayananPolicy`, dan `JenisLayananController` (`Layanan/Index`, kontrak §3.3).
  - Mengimplementasikan Master **`Voucher`** & validasi **`KK-03`**: accessor `Voucher::$appends = ['effective_status']` (deteksi dinamis kedaluwarsa zona `Asia/Jakarta` walau status DB masih `TERSEDIA`), `VoucherService` (filter status efektif, normalisasi kode uppercase, proteksi ubah/hapus voucher `SUDAH_DIGUNAKAN` atau terhubung `Transaksi`, serta `cekValiditasPreview()`), `StoreVoucherRequest`/`UpdateVoucherRequest`/`ValidateVoucherRequest`, `VoucherPolicy`, dan `VoucherController` (`Voucher/Index` + `POST /voucher/validate` JSON `200`/`422`, kontrak §3.4).
  - Mendaftarkan route `/pelanggan`, `/layanan`, `/voucher`, dan `POST /voucher/validate` pada middleware `['auth', 'role:PETUGAS']` di `routes/web.php`, mendaftarkan Policies di `AppServiceProvider`, serta menjaga `resources/js/` dan `resources/css/` tidak tersentuh sama sekali.
- **File Dibuat / Diubah:**
  - `app/Support/SqlLike.php` — Helper escaping wildcard `LIKE` untuk pencarian master
  - `app/Models/Voucher.php` — Penambahan appended attribute `effective_status` (zona `Asia/Jakarta`)
  - `app/Providers/AppServiceProvider.php` — Registrasi eksplisit `PelangganPolicy`, `JenisLayananPolicy`, `VoucherPolicy`
  - `app/Policies/Concerns/ChecksPetugasRole.php`, `app/Policies/{PelangganPolicy,JenisLayananPolicy,VoucherPolicy}.php` — Otorisasi RBAC aktif `PETUGAS`
  - `app/Http/Requests/Concerns/AuthorizesPetugasRequest.php`, `app/Http/Requests/Master/{BasePelangganRequest,StorePelangganRequest,UpdatePelangganRequest,BaseJenisLayananRequest,StoreJenisLayananRequest,UpdateJenisLayananRequest,StoreVoucherRequest,UpdateVoucherRequest,ValidateVoucherRequest}.php` — FormRequest validation & normalisasi input
  - `app/Services/{PelangganService,JenisLayananService,VoucherService}.php` — Domain service layer CRUD master, sinkronisasi `TahapLayanan`, dan `cekValiditasPreview()`
  - `app/Http/Controllers/Controller.php`, `app/Http/Controllers/{PelangganController,JenisLayananController,VoucherController}.php`, `routes/web.php` — Controller Inertia/JSON, helper `executeWithFlashRedirect`, & proteksi route `role:PETUGAS`
  - `tests/Feature/{MasterPelangganTest,MasterJenisLayananTest,MasterVoucherTest}.php` — Feature tests mencakup `AC-P1-04`, `AC-P1-05`, `AC-P1-06`, dan `AC-P1-09`
  - `MEMORY.md`, `.claude/napkin.md`, `WRITE.md` — Update checklist `[x] P1-04`, aturan Policy `403` vs validasi bisnis `422`, & Entry `#005`
- **Verifikasi / Bukti Uji:**
  - `./vendor/bin/pint --test` -> `{"tool":"pint","result":"passed"}` (`exit code 0`)
  - `php artisan test` -> `36 passed (749 assertions)` pada MySQL 8.4 port `3307` (`cleanwash_testing`) (`exit code 0`)
  - `npx tsc --noEmit && npm run build` -> 0 error TS, Vite production build (`654 modules transformed`) (`exit code 0`)
  - `php artisan migrate:fresh --seed --no-interaction && php artisan migrate:rollback --no-interaction && php artisan migrate --seed --no-interaction` -> 18 migrasi + rollback + migrasi ulang + seed bersih (`exit code 0`)
  - `php artisan route:list --except-vendor` -> 18 route terdaftar lengkap (`pelanggan.*`, `layanan.*`, `voucher.*`, `voucher.validate`)
- **Keputusan / Blocker / Catatan Napkin:**
  - Ditambahkan catatan di `.claude/napkin.md` mengenai pemisahan Policy `403` (RBAC peran) vs `ValidationException` `422`/flash error (penolakan kondisi bisnis saat hapus data berelasi `Transaksi` atau ubah/hapus voucher `SUDAH_DIGUNAKAN`) dan evaluasi dinamis `Voucher.effective_status`.
  - Tidak ada blocker.
- **Next Exact Action:**
  1. Setelah review & merge `feature/p1-04-master-crud` ke `main`, delegasikan **`P1-05`** ke `cw-backend-dev` pada branch `feature/p1-05-reception-engine` dari `main` untuk membangun `VoucherService::validasiDanKunci()` (`DB::transaction()` + `lockForUpdate()`, `KK-03`), `TransaksiService::buatTransaksi()` (`nomor_nota`, `harga_satuan_snapshot` `KK-09`, `DetailPakaian` `1..*`, `RiwayatStatusProduksi = DITERIMA`, `audit_logs`), `PembayaranService::catatUangMuka()`, `TransaksiController`, dan automated tests (`AC-P1-07` s.d. `AC-P1-12`).
  2. Paralel **`P1-06`** (`frontend-developer`) dapat mengonsumsi kontrak `/pelanggan`, `/layanan`, `/voucher`, dan `POST /voucher/validate` yang telah siap.

### [#006] 2026-11-10 16:08 — Backend Developer (`cw-backend-dev`) — Phase 1 (`P1-05`)
- **Status:** `READY_FOR_REVIEW`
- **Ringkasan Kegiatan:**
  - Melakukan Context Sync (`PRD.md`, `AGENTS.md`, `MEMORY.md`, `WRITE.md` `#003`–`#005`, `.claude/napkin.md`, `napkin/PR_REVIEW_LIFECYCLE.md`, `docs/phases/PHASE_1_CONTRACTS.md` §3.5 & §4 `AC-P1-07`..`AC-P1-12`) serta menginspeksi seluruh TDD RED test eksisting (`tests/Unit/VoucherAtomicLockTest.php`, `tests/Feature/VoucherConcurrencyTest.php`, `tests/Feature/TransaksiReceptionTest.php`) pada branch `feature/p1-05-reception-engine`.
  - Memperbarui `app/Services/VoucherService.php`: menambahkan `validasiDanKunci(string $nomorVoucher, ?string $tanggalTransaksi = null): Voucher` di dalam `DB::transaction()` dengan `lockForUpdate()` (`SELECT ... FOR UPDATE`), berbagi logika deteksi validitas (`detectInvalidVoucher`) bersama `cekValiditasPreview()`, dan mengunci status `SUDAH_DIGUNAKAN` + `digunakan_pada`.
  - Membuat `app/Services/PembayaranService.php` (`resolveStatusPembayaranAwal`, `catatPembayaranAwal`) menggunakan `App\Support\DecimalMoney` (tanpa `float`/`bcmath`) untuk seluruh aturan `BELUM_BAYAR`, `DP`, `LUNAS`, dan penolakan overpay/negatif `422`.
  - Membuat `app/Services/TransaksiService.php` (`generateNomorNota` berurutan harian `CW-YYYYMMDD-XXXX` dengan `SqlLike::prefix()` + `lockForUpdate()`, `buatTransaksi` dalam `DB::transaction()` mencakup lock voucher `KK-03`, salin `harga_satuan_snapshot` `KK-09`, `DetailPakaian` `1..*`, entri awal `RiwayatStatusProduksi = DITERIMA` dengan `id_pegawai = null`, integrasi `PembayaranService`, dan `audit_logs` `TRANSAKSI_CREATED`, serta `paginate`, `getCreateOptions`, `findForDetail`, dan `formatTransaksiDetail` sinkron penuh dengan kontrak `TransaksiDetail` §3.5 tanpa query N+1).
  - Membuat `app/Http/Requests/Transaksi/StoreTransaksiRequest.php`, `app/Policies/TransaksiPolicy.php` (didaftarkan di `AppServiceProvider`), `app/Http/Controllers/TransaksiController.php` (`index`, `create`, `store`, `show`, `nota`), dan mendaftarkan route `/transaksi` (`transaksi.index`, `transaksi.create`, `transaksi.store`, `transaksi.nota`, `transaksi.show`) di `routes/web.php` di bawah middleware `['auth', 'role:PETUGAS']`.
  - Menambahkan penguatan edge-case test di `tests/Unit/VoucherAtomicLockTest.php` dan `tests/Feature/TransaksiReceptionTest.php`, serta menjaga `resources/js/` dan `resources/css/` tidak tersentuh sama sekali.
- **File Dibuat / Diubah:**
  - `app/Support/SqlLike.php` — Penambahan helper `escape()` dan `prefix()` untuk pencarian & prefix `nomor_nota`
  - `app/Services/VoucherService.php` — Penambahan `validasiDanKunci()` (`FOR UPDATE`) dan refactor `detectInvalidVoucher()`
  - `app/Services/PembayaranService.php` — Service resolusi status awal dan pencatatan pembayaran `DP`/`PELUNASAN` berbasis `DecimalMoney`
  - `app/Services/TransaksiService.php` — Engine penerimaan transaksi atomik, snapshot tarif `KK-09`, serialisasi `TransaksiDetail`, dan eager pagination
  - `app/Http/Requests/Transaksi/StoreTransaksiRequest.php` — Validasi FormRequest (`detail_pakaian` min 1, layanan aktif, integer `pcs` untuk `JUMLAH`, normalisasi input)
  - `app/Policies/TransaksiPolicy.php`, `app/Providers/AppServiceProvider.php` — Otorisasi peran aktif `PETUGAS` & registrasi policy
  - `app/Http/Controllers/TransaksiController.php`, `routes/web.php` — Endpoint `/transaksi` (`index`, `create`, `store`, `show`, `nota`)
  - `tests/Unit/VoucherAtomicLockTest.php`, `tests/Feature/VoucherConcurrencyTest.php`, `tests/Feature/TransaksiReceptionTest.php` — Unit test lock & DP, test konkurensi row-lock & dual-process MySQL 8.4, serta feature test reception & kontrak Inertia
  - `MEMORY.md`, `.claude/napkin.md`, `WRITE.md` — Update `[x] P1-05`, catatan lock ordering & CLI actor resolution, dan Entry `#006`
- **Verifikasi / Bukti Uji:**
  - `./vendor/bin/pint --test` -> `{"tool":"pint","result":"passed"}` (`exit code 0`)
  - `php artisan test` -> `53 passed (1182 assertions)` pada MySQL 8.4 port `3307` (`cleanwash_testing`), termasuk `VoucherConcurrencyTest` real InnoDB `FOR UPDATE` & dual-process race (`exit code 0`)
  - `npx tsc --noEmit && npm run build` -> 0 error TS, Vite production build (`654 modules transformed`) (`exit code 0`)
  - `php artisan migrate:fresh --seed --no-interaction && php artisan migrate:rollback --no-interaction && php artisan migrate --seed --no-interaction` -> 18 migrasi + rollback + migrasi ulang + seed bersih (`exit code 0`)
  - `php artisan route:list --except-vendor` -> 23 route terdaftar termasuk 5 route `transaksi.*`
- **Keputusan / Blocker / Catatan Napkin:**
  - Ditambahkan catatan #8 di `.claude/napkin.md` mengenai urutan lock (`validasiDanKunci()` sebelum `generateNomorNota()`) dan fallback `audit_logs.user_id` via `$petugas->user_id` untuk pemanggilan service dari proses CLI/worker.
  - Tidak ada blocker.
- **Next Exact Action:**
  1. Lakukan cross-agent review & merge `feature/p1-05-reception-engine` ke `main` sesuai `napkin/PR_REVIEW_LIFECYCLE.md`.
  2. Delegasikan **`P1-06`** ke subagent frontend (`cw-frontend-dev`) pada branch `feature/p1-06-frontend-ui` dari `main` untuk membangun UI Login, App Shell per peran, Master CRUD pages, serta halaman `Transaksi/Index`, `Transaksi/Create` (form dinamis `kg`/`pcs`, multi `DetailPakaian`, live `POST /voucher/validate`, input DP), dan `Transaksi/Show`.

### [#007] 2026-11-10 16:17 — Frontend Developer (`cw-frontend-dev`) — Phase 1 (`P1-06`)
- **Status:** `READY_FOR_REVIEW`
- **Ringkasan Kegiatan:**
  - Melakukan Context Sync (`PRD.md` §4/§7.1/§8/§11, `AGENTS.md`, `MEMORY.md`, `WRITE.md` `#003`–`#006`, `.claude/napkin.md`, `napkin/PR_REVIEW_LIFECYCLE.md`, `docs/phases/PHASE_1_CONTRACTS.md` §3) serta menginspeksi `DashboardController.php`, `PelangganController.php`, `JenisLayananController.php`, `VoucherController.php`, `TransaksiController.php`, dan service terkait pada branch `feature/p1-06-frontend-ui`.
  - Memperbarui kontrak TypeScript strict di `resources/js/types/index.ts` agar 100% sinkron dengan `PHASE_1_CONTRACTS.md` §3 dan `DashboardController.php` (`UserRole`, `AuthUser`, `SharedPageProps`, `Paginated`, `DashboardIndexProps`, `PelangganIndexProps`, `LayananIndexProps`, `VoucherValidateResponse`, `VoucherIndexProps`, `TransaksiDetail`, `TransaksiCreateProps`, `TransaksiIndexProps`, `TransaksiShowProps`, `TransaksiNotaProps`).
  - Mengonfigurasi `resources/js/bootstrap.ts` (`window.axios` dengan `withCredentials`, `withXSRFToken`, `X-XSRF-TOKEN`, `X-Requested-With: XMLHttpRequest`) dan mengimpornya di `resources/js/app.tsx`; membuat `resources/js/lib/format.ts` (`formatRupiah`, `formatTanggal`, `parseDecimalToCents`, `centsToDecimalString`, `calculatePreviewTotals` berbasis integer skala 100 bebas `float` drift).
  - Membangun `resources/js/Layouts/AppLayout.tsx` (sidebar desktop + drawer mobile adaptif peran `PETUGAS`, `PEGAWAI`, `PENGANTAR`, badge peran, flash banner `success`/`error`/`warning`, dan aksi `POST /logout`) serta komponen reusable `resources/js/Components/{Pagination,StatusBadge,Modal,EmptyState}.tsx`.
  - Mengimplementasikan seluruh halaman Phase 1 (`P1-06`): `Auth/Login.tsx`, `Dashboard/Index.tsx`, `Pelanggan/Index.tsx` (pencarian, modal tambah/edit, flag `boleh_bayar_akhir`, konfirmasi hapus), `Layanan/Index.tsx` (sinkronisasi otomatis `BERAT <-> kg` dan `JUMLAH <-> pcs` + preview tahap produksi tanpa `DISETRIKA` bila `perlu_setrika = false`), `Voucher/Index.tsx` (filter `effective_status`, guard edit/delete `SUDAH_DIGUNAKAN`), `Transaksi/Index.tsx` (pencarian nota/pelanggan/telepon & filter status pembayaran), `Transaksi/Create.tsx` (form kasir dinamis `kg` vs `pcs`, multi baris `DetailPakaian` min 1, cek voucher live `window.axios.post('/voucher/validate')`, DP quick-fill `Rp 0`/`50%`/`Lunas`, dan ringkasan estimasi tagihan integer-cents), dan `Transaksi/Show.tsx` (rincian lengkap nota, pembanding tarif snapshot `KK-09`, `DetailPakaian`, riwayat `Pembayaran`, & timeline `RiwayatStatusProduksi`).
  - Memastikan tidak ada satu pun file PHP backend (`app/`, `database/`, `routes/`, `config/`, `tests/`) yang disentuh.
- **File Dibuat / Diubah:**
  - `resources/js/bootstrap.ts`, `resources/js/app.tsx` — Konfigurasi global `window.axios` dengan CSRF/XSRF Laravel & registrasi di entrypoint
  - `resources/js/types/index.ts` — Kontrak TypeScript strict lengkap Phase 1
  - `resources/js/lib/format.ts` — Helper format Rupiah, tanggal `Asia/Jakarta`, dan kalkulasi preview kasir berbasis integer cents
  - `resources/js/Components/{StatusBadge,Modal,Pagination,EmptyState}.tsx` — Komponen UI reusable bersih tanpa duplikasi
  - `resources/js/Layouts/AppLayout.tsx` — Shell aplikasi responsif berbasis peran + flash banner & logout
  - `resources/js/Pages/Auth/Login.tsx`, `Dashboard/Index.tsx`, `Pelanggan/Index.tsx`, `Layanan/Index.tsx`, `Voucher/Index.tsx`, `Transaksi/{Index,Create,Show}.tsx` — 8 halaman UI Phase 1 (`P1-06`)
  - `MEMORY.md`, `.claude/napkin.md`, `WRITE.md` — Update `[x] P1-06`, catatan Axios XSRF `bootstrap.ts`, & Entry `#007`
- **Verifikasi / Bukti Uji:**
  - `npx tsc --noEmit` -> `0 errors` (`strict: true`) (`exit code 0`)
  - `npm run build` -> Vite production build (`669 modules transformed`, `public/build/manifest.json`) (`exit code 0`)
  - `./vendor/bin/pint --test` -> `{"tool":"pint","result":"passed"}` (`exit code 0`)
  - `php artisan test` -> `53 passed (1182 assertions)` (`exit code 0`)
- **Keputusan / Blocker / Catatan Napkin:**
  - Ditambahkan catatan di `.claude/napkin.md` tentang konfigurasi `window.axios` (`withXSRFToken = true`, `withCredentials = true`) via `resources/js/bootstrap.ts`.
  - Halaman cetak `Transaksi/Nota.tsx` sengaja diserahkan ke `P1-07` (`cw-fullstack-dev`) sesuai pembagian kerja.
  - Tidak ada blocker.
- **Next Exact Action:**
  1. Lakukan cross-agent review & merge `feature/p1-06-frontend-ui` ke `main` sesuai `napkin/PR_REVIEW_LIFECYCLE.md`.
  2. Delegasikan **`P1-07`** ke `cw-fullstack-dev` + `product-manager` pada branch `feature/p1-07-nota-gate` dari `main` untuk membuat halaman cetak `resources/js/Pages/Transaksi/Nota.tsx` (`@media print`), uji E2E alur penerimaan $\rightarrow$ voucher $\rightarrow$ DP $\rightarrow$ cetak nota $\rightarrow$ verifikasi `KK-09`, audit 6 Gerbang Kualitas, dan Phase 1 Sign-off.

### [#008] 2026-11-10 16:25 — Fullstack Developer (`P1-07`) — Phase 1 (`P1-07`)
- **Status:** `READY_FOR_REVIEW`
- **Ringkasan Kegiatan:**
  - Melakukan Context Sync (`PRD.md` §7.1/§8/§14, `AGENTS.md`, `MEMORY.md`, `WRITE.md` `#004`–`#007`, `.claude/napkin.md`, `napkin/PR_REVIEW_LIFECYCLE.md`, `docs/phases/PHASE_1_CONTRACTS.md` §3.5 `TransaksiNotaProps` & §4 `AC-P1-01..AC-P1-12`) serta membuat branch `feature/p1-07-nota-gate` dari `main`.
  - Mengimplementasikan halaman cetak nota resmi `resources/js/Pages/Transaksi/Nota.tsx` menggunakan kontrak `TransaksiNotaProps`, helper `formatRupiah`, `formatTanggal` (`Asia/Jakarta`), `parseDecimalToCents`, dan komponen badge (`StatusBadge.tsx`), serta aturan `@media print` / Tailwind `print:` utilities: baris aksi navigasi (`Kembali ke Detail`, `Daftar Transaksi`, tombol `Cetak Nota` memanggil `window.print()`) dengan kelas `print:hidden`; isi nota lengkap (`AC-P1-12`) mencakup header CleanWash, Nomor Nota `CW-...`, tanggal penerimaan WIB, petugas penerima, identitas pelanggan beserta penanda `PayLaterBadge` bila `boleh_bayar_akhir = true`, rincian layanan (`nama_layanan`, `tingkat_kecepatan`, `berat_atau_jumlah` + `satuan`, `harga_satuan_snapshot`, serta tahapan produksi layanan), tabel `DetailPakaian`, catatan khusus (bila ada), ringkasan finansial (`Subtotal Layanan`, `Potongan Voucher` + kode voucher, `Total Harga`, tabel `Riwayat Pembayaran / DP`, `Sisa Tagihan`), status pembayaran, tahap produksi terkini, dan footer tanda tangan resmi. Menambahkan aturan `@page` A4 & `print-color-adjust: exact` pada `resources/css/app.css`.
  - Menghapus seluruh parameter `shouldExist: false` pada `assertInertia()` di 6 file test eksisting (`ExampleTest.php`, `AuthAndRbacTest.php`, `MasterPelangganTest.php`, `MasterJenisLayananTest.php`, `MasterVoucherTest.php`, `TransaksiReceptionTest.php`) sehingga `config('inertia.testing.ensure_pages_exist') === true` memverifikasi keberadaan seluruh 9 file `.tsx` nyata di `resources/js/Pages/`.
  - Menulis test integrasi E2E `tests/Feature/Phase1EndToEndTest.php` **tanpa** `$this->withoutVite()` (memverifikasi `public/build/manifest.json` nyata dan seluruh 9 halaman Inertia Phase 1): login Petugas $\rightarrow$ `/dashboard` $\rightarrow$ buat `Pelanggan` (`boleh_bayar_akhir = false`) $\rightarrow$ buat `JenisLayanan` (`Cuci Sepatu Kilat`, `JUMLAH`/`pcs`, `perlu_setrika = false`, `30000.00`, `TahapLayanan` tanpa `DISETRIKA`) $\rightarrow$ buat `Voucher` (`CLEAN10K`, `10000.00`, +14 hari) $\rightarrow$ cek `POST /voucher/validate` (`200 valid`) $\rightarrow$ `POST /transaksi` (2 baris `DetailPakaian`, qty `2`, `CLEAN10K`, `nominal_dp = 20000.00`) $\rightarrow$ verifikasi redirect `/transaksi/{nota}`, buka `Transaksi/Show` & `Transaksi/Nota` (`subtotal = 60000.00`, `voucher = 10000.00`, `total_harga = 50000.00`, `total_dibayar = 20000.00`, `sisa_tagihan = 30000.00`, `status_pembayaran = DP`, voucher `SUDAH_DIGUNAKAN`) $\rightarrow$ verifikasi `KK-09` (ubah tarif master jadi `45000.00` via `PUT /layanan/{id}`, buka ulang `/transaksi/{nota}/nota`, snapshot tetap `30000.00` / `50000.00` / `30000.00`) $\rightarrow$ verifikasi `KK-03` (pakai ulang `CLEAN10K` via `/voucher/validate` & `POST /transaksi` ditolak `422`) $\rightarrow$ verifikasi RBAC lintas aktor (`PEGAWAI` & `PENGANTAR` ditolak `403` di `/transaksi/{nota}/nota`).
  - Memperbarui urutan langkah di `.github/workflows/ci.yml` agar `npx tsc --noEmit` dan `npm run build` dijalankan sebelum `php artisan test` sehingga manifest Vite tersedia untuk test E2E tanpa `withoutVite()`.
- **File Dibuat / Diubah:**
  - `resources/js/Pages/Transaksi/Nota.tsx` — Halaman cetak nota resmi CleanWash (`@media print` / `print:`)
  - `resources/css/app.css` — Aturan `@media print` (`@page` A4 & `print-color-adjust: exact`)
  - `tests/Feature/Phase1EndToEndTest.php` — E2E integration test Phase 1 lengkap tanpa `withoutVite()`
  - `tests/Feature/{ExampleTest,AuthAndRbacTest,MasterPelangganTest,MasterJenisLayananTest,MasterVoucherTest,TransaksiReceptionTest}.php` — Hapus `shouldExist: false` agar `ensure_pages_exist = true` aktif penuh
  - `.github/workflows/ci.yml` — Jalankan `npx tsc --noEmit` & `npm run build` sebelum `php artisan test`
  - `MEMORY.md`, `.claude/napkin.md`, `WRITE.md` — Update status `P1-07` siap PM Gate, catatan Vite manifest di CI/E2E, dan Entry `#008`
- **Verifikasi / Bukti Uji:**
  - `npm run build` -> Vite production build (`670 modules transformed`, `public/build/manifest.json`, `Nota-sCuLIZu-.js`) -> `exit code 0`
  - `./vendor/bin/pint --test` -> `{"tool":"pint","result":"passed"}` -> `exit code 0`
  - `npx tsc --noEmit` -> `0 errors` (`strict: true`) -> `exit code 0`
  - `php artisan test` -> `54 passed (1435 assertions)` pada MySQL 8.4 port `3307` (`cleanwash_testing`), termasuk `Phase1EndToEndTest` & `VoucherConcurrencyTest` -> `exit code 0`
  - `php artisan migrate:fresh --seed --no-interaction && php artisan migrate:rollback --no-interaction && php artisan migrate --seed --no-interaction` -> 18 migrasi + `CleanWashSeeder` + rollback 18 migrasi + re-migrate + re-seed bersih -> `exit code 0`
  - Audit hygiene (`grep` `console.log` di `resources/js`, `dd`/`dump`/`var_dump` di `app/`, `shouldExist` di `tests/`) -> `0` temuan; `git status` bersih tanpa `.env`/secret/file build tracked.
- **Keputusan / Blocker / Catatan Napkin:**
  - Checkbox `P1-07` & status `Phase 1 -> DONE` di `MEMORY.md` sengaja dibiarkan terbuka menunggu audit & tanda tangan Phase 1 Closing Gate oleh `product-manager`.
  - Ditambahkan catatan #7 di `.claude/napkin.md` mengenai penghapusan `shouldExist: false` setelah file `.tsx` tersedia dan keharusan menjalankan `npm run build` sebelum `php artisan test` di CI/lokal untuk test tanpa `withoutVite()`.
  - Tidak ada blocker.
- **Next Exact Action:**
  - Delegasikan ke **`product-manager`** untuk mengeksekusi audit **`AC-P1-01` s.d. `AC-P1-12`**, meninjau branch `feature/p1-07-nota-gate` terhadap 6 Gerbang Kualitas, menandatangani **Phase 1 Closing Gate** (`[x] P1-07` & `Phase 1 -> DONE` di `MEMORY.md` + entri `WRITE.md`), serta melakukan Squash & Merge ke `main` sebelum membuka `P2-01`.

### [#009] 2026-11-10 16:33 — Product Manager (`product-manager`) + Primary Agent — Phase 1 Closing Gate (`P1-07`)
- **Status:** `DONE`
- **Ringkasan Kegiatan:**
  - Melakukan Context Sync terhadap `PRD.md`, `AGENTS.md`, `MEMORY.md`, `WRITE.md` (`#001`–`#008`), `.claude/napkin.md`, `napkin/PR_REVIEW_LIFECYCLE.md`, dan `docs/phases/PHASE_1_CONTRACTS.md`.
  - Melaksanakan audit adversarial silang oleh `product-manager` atas implementasi aktual di branch `feature/p1-07-nota-gate` terhadap seluruh 12 Acceptance Criteria (`AC-P1-01` s.d. `AC-P1-12`), cakupan SRS Phase 1 (`UC-01` DP, `UC-03..UC-09`, `KK-03`, `KK-09`, *Activity 1*, *Sequence 1*), dan 6 Gerbang Kualitas di `napkin/PR_REVIEW_LIFECYCLE.md`.
  - Menyetujui (`APPROVED`) **Phase 1 Closing Gate**, menyusun dokumen bukti `docs/phases/PHASE_1_CLOSING_EVIDENCE.md`, memperbarui `MEMORY.md` (`[x] P1-07`, `Phase 1 -> DONE`, `Current Phase -> Phase 2`, `Current Status -> NOT_STARTED`), serta mengeksekusi Squash & Merge `feature/p1-07-nota-gate` ke `main`.
- **File Dibuat / Diubah:**
  - `docs/phases/PHASE_1_CLOSING_EVIDENCE.md` — Laporan audit adversarial, matriks bukti `AC-P1-01`..`AC-P1-12`, & sign-off 6 Gerbang Phase 1
  - `MEMORY.md` — Centang `[x] P1-07`, Phase 1 `DONE`, transisi Current Phase ke Phase 2 (`NOT_STARTED`)
  - `WRITE.md` — Penambahan Entry `#009`
- **Verifikasi / Bukti Uji:**
  - Audit silang dokumen & kode (`AC-P1-01`..`AC-P1-12`, 54 metode test aktual pada 12 berkas test, 0 `shouldExist: false`, 0 `console.log`, 0 `dd/dump`, 0 `bcmath`/`(float)`) -> `APPROVED`.
  - Full quality gate dijalankan ulang di `main` pasca Squash & Merge (`pint --test`, `tsc --noEmit`, `npm run build`, `php artisan test`, `migrate:fresh --seed && migrate:rollback && migrate --seed`) -> `exit code 0`.
- **Keputusan / Blocker / Catatan Napkin:**
  - **Phase 1 resmi `DONE`** dan seluruh Exit Criteria Phase 1 terpenuhi 100%.
  - Catatan non-blocking untuk Phase 2: seragamkan `now('Asia/Jakarta')->toDateString()` di `DashboardController.php` baris 36.
  - Tidak ada blocker.
- **Next Exact Action:**
  - Mulai **Phase 2** dari `main`: delegasikan **`P2-01`** ke subagent `product-manager` (pada branch `docs/p2-01-rules-contracts`) untuk menyusun `docs/phases/PHASE_2_CONTRACTS.md` yang mengunci aturan bisnis, formula keuangan, state machine, kontrak API/Inertia Props, dan Acceptance Criteria `AC-P2-*` untuk `UC-10`, `UC-11`, `UC-12`, `UC-13`, `KK-01`, `KK-02`, `KK-04`/`KK-05`, dan `KK-08`.

### [#010] 2026-11-10 16:45 — Product Manager (`product-manager`) + Primary Agent — Phase 2 (`P2-01`)
- **Status:** `DONE`
- **Ringkasan Kegiatan:**
  - Melakukan Context Sync terhadap `PRD.md` (§5, §7.2–7.3, §8 `FR-06`–`FR-08`/`FR-12`, §9–§11), `AGENTS.md`, `MEMORY.md`, `WRITE.md` (`#008`–`#009`), `.claude/napkin.md`, `docs/phases/PHASE_1_CONTRACTS.md`, `docs/phases/PHASE_1_CLOSING_EVIDENCE.md`, `Archive/Outputtts/UTS.pdf` (*Class Diagram*, *Activity 2*, *Sequence 2 & 3*), serta model, enum, service, controller, dan tipe TS aktual.
  - Menyusun kontrak lengkap Phase 2 pada `docs/phases/PHASE_2_CONTRACTS.md` meliputi breakdown `P2-01` s.d. `P2-06`, formula integer-cents `App\Support\DecimalMoney` (`percentage` & `prorateAndMultiply`), aturan tegas `timbangUlang()` (`KK-01`, tahap `DITERIMA` & metode `BERAT`), state machine `RiwayatStatusProduksi` (`UC-11`, `perlu_setrika`), `ubahLayanan()` (`KK-02`, tahap `DITERIMA`/`DICUCI` & konversi `BERAT <-> JUMLAH`), `batalkanTransaksi()` (`KK-08`, gratis + lepas voucher & `transaksi.nomor_voucher = null` di `DITERIMA`, biaya `50%` di `DICUCI`–`DISETRIKA`), serta `KompensasiService` (`KK-04`, `KK-05`, `UC-13`, alur 2-peran `Pegawai -> Petugas` via `id_petugas` nullability, formula `5×`/`10×`, dan anti-double-counting `kelebihan_ganti_rugi`).
  - Mengunci kontrak route, FormRequest, Inertia Props, TypeScript interfaces (`Produksi/Index.tsx`, `Insiden/Index.tsx`, `Transaksi/Show.tsx`, `DashboardController`), serta 12 Acceptance Criteria (`AC-P2-01` s.d. `AC-P2-12`).
- **File Dibuat / Diubah:**
  - `docs/phases/PHASE_2_CONTRACTS.md` — Spesifikasi aturan bisnis, formula finansial, kontrak API/TS, & `AC-P2-01`..`AC-P2-12`
  - `MEMORY.md` — Status Phase 2 `IN_PROGRESS` dan centang `[x] P2-01`
  - `.claude/napkin.md` — Penambahan aturan #9 pelepasan `nomor_voucher` (`UNIQUE(nomor_voucher)`) saat batal di `DITERIMA`
  - `WRITE.md` — Penambahan Entry `#010`
- **Verifikasi / Bukti Uji:**
  - Audit silang kontrak terhadap skema MySQL 8.4 Phase 1 (`16` tabel, tanpa butuh migrasi tambahan), SRS *Activity 2* & *Sequence 2–3*, serta formula `DecimalMoney` -> konsisten 100%.
  - Commit & Squash Merge `docs/p2-01-rules-contracts` -> `main` bersih.
- **Keputusan / Blocker / Catatan Napkin:**
  - Status konfirmasi laporan insiden memakai kolom `id_petugas` (`null` = `MENUNGGU_KONFIRMASI`, non-null = `TERKONFIRMASI`) tanpa migrasi tabel baru.
  - Tidak ada blocker.
- **Next Exact Action:**
  - Delegasikan **`P2-02`** ke `cw-backend-dev` pada branch `feature/p2-02-produksi-service` dari `main` untuk mengimplementasikan `ProduksiService` (`timbangUlang` `KK-01`, `ubahStatusProduksi` state machine sesuai `TahapLayanan`), `ProduksiPolicy`, `TimbangUlangRequest`, `UpdateStatusProduksiRequest`, `ProduksiController`, pembaruan `TransaksiService::detailRelations()` / `formatTransaksiDetail()`, dan TDD automated tests (`AC-P2-01` s.d. `AC-P2-05`).

### [#011] 2026-11-10 16:54 — Backend Developer (`cw-backend-dev`) — Phase 2 (`P2-02`)
- **Status:** `READY_FOR_REVIEW`
- **Ringkasan Kegiatan:**
  - Melakukan Context Sync (`PRD.md` §7.2/§8 `FR-06`–`FR-07`/§9.2, `AGENTS.md`, `MEMORY.md`, `WRITE.md` `#008`–`#010`, `.claude/napkin.md`, `napkin/PR_REVIEW_LIFECYCLE.md`, `docs/phases/PHASE_1_CONTRACTS.md`, dan `docs/phases/PHASE_2_CONTRACTS.md` §2.0–§2.2, §3.1–§3.3, §4 `AC-P2-01`..`AC-P2-05`) serta membuat branch `feature/p2-02-produksi-service` dari `main`.
  - Menerapkan TDD (**Red $\rightarrow$ Green $\rightarrow$ Refactor**): menulis unit tests baru di `tests/Unit/DecimalMoneyTest.php` (`percentage()` & `prorateAndMultiply()`), `tests/Unit/ProduksiServiceTest.php`, dan `tests/Feature/ProduksiOperationTest.php` (memakai `$this->withoutVite()` dan `shouldExist: false` karena `Produksi/Index.tsx` baru dibuat di `P2-05`) yang gagal di fase Red sebelum implementasi kode.
  - Memperbarui `app/Support/DecimalMoney.php` dengan `percentage()` dan `prorateAndMultiply()` berbasis integer skala 100 dengan pembulatan *half-up* dan *overflow guards* (bebas `float` dan `bcmath`).
  - Memperbarui `app/Services/PembayaranService.php` dengan helper terpusat `hitungTotalDibayar(Transaksi)` (zero extra query saat `pembayaran` sudah ter-load) dan `resolveStatusPembayaranSetelahPenyesuaian()` sesuai §2.0.C untuk dipakai lintas `P2-02`, `P2-03`, dan `P2-04`.
  - Memperbarui `app/Services/TransaksiService.php`: mengekspos `detailRelations()` dengan eager-loading `riwayatStatusProduksi.pegawai`, `laporanKerusakanKehilangan.detailPakaian`, `laporanKerusakanKehilangan.petugas`, dan `laporanKerusakanKehilangan.pegawaiPelapor`; menambahkan `resolveLatestRiwayatStatus()` & `resolveOrderedTahapStages()`; serta melengkapi `formatTransaksiDetail()` dengan seluruh properti turunan Phase 2 (§3.3) tanpa merusak kontrak Phase 1.
  - Mengimplementasikan `app/Services/ProduksiService.php` (`paginateQueue()`, `getStageCounts()`, `timbangUlang()` dengan `DB::transaction()` + `lockForUpdate()`, `KK-01` + `KK-09` snapshot + `AuditLog` `TIMBANG_ULANG` berflag `weight_changed`, dan `ubahStatusProduksi()` dengan validasi urutan `TahapLayanan`, larangan `DISETRIKA` jika `perlu_setrika = false`, `id_pegawai` non-null, `waktu_update` WIB, update `Transaksi.status_transaksi = SELESAI`, & `AuditLog` `PRODUKSI_STATUS_UPDATED`).
  - Membuat `AuthorizesPegawaiRequest`, `TimbangUlangRequest`, `UpdateStatusProduksiRequest`, `ChecksPegawaiRole`, `ProduksiPolicy` (terdaftar di `AppServiceProvider` untuk `RiwayatStatusProduksi` dan `Gate` `produksi.*`), `ProduksiController`, dan route `/produksi`, `/produksi/{nota}/timbang-ulang`, `/produksi/{nota}/status` di bawah `middleware(['auth', 'role:PEGAWAI'])`, tanpa menyentuh `resources/js/` atau `resources/css/`.
- **File Dibuat / Diubah:**
  - `app/Support/DecimalMoney.php` — Penambahan `percentage()` & `prorateAndMultiply()` integer-safe
  - `app/Services/PembayaranService.php` — Penambahan `hitungTotalDibayar()` & `resolveStatusPembayaranSetelahPenyesuaian()`
  - `app/Services/TransaksiService.php` — Eager-loading Phase 2, helper tahap layanan, & properti turunan §3.3 di `formatTransaksiDetail()`
  - `app/Services/ProduksiService.php` — Service antrean produksi, `getStageCounts()`, `timbangUlang()`, & state machine `ubahStatusProduksi()`
  - `app/Http/Requests/Concerns/AuthorizesPegawaiRequest.php`, `app/Http/Requests/Produksi/{TimbangUlangRequest,UpdateStatusProduksiRequest}.php` — Otorisasi & validasi FormRequest produksi
  - `app/Policies/Concerns/ChecksPegawaiRole.php`, `app/Policies/ProduksiPolicy.php`, `app/Providers/AppServiceProvider.php` — Policy & registrasi `Gate` produksi (`PEGAWAI` aktif)
  - `app/Http/Controllers/ProduksiController.php`, `routes/web.php` — Endpoint `produksi.index`, `produksi.timbang-ulang`, & `produksi.status`
  - `tests/Unit/DecimalMoneyTest.php`, `tests/Unit/ProduksiServiceTest.php`, `tests/Feature/ProduksiOperationTest.php` — Automated unit & feature tests `AC-P2-01` s.d. `AC-P2-05`
  - `MEMORY.md`, `.claude/napkin.md`, `WRITE.md` — Update `[x] P2-02`, aturan #10 query tahap produksi terakhir MySQL 8.4, & Entry `#011`
- **Verifikasi / Bukti Uji:**
  - `./vendor/bin/pint --test` -> `{"tool":"pint","result":"passed"}` (`exit code 0`)
  - `php artisan test` -> `67 passed (1743 assertions)` pada MySQL 8.4 port `3307` (`cleanwash_testing`), termasuk seluruh unit & feature tests Phase 1 + `AC-P2-01` s.d. `AC-P2-05` (`exit code 0`)
  - `npx tsc --noEmit` -> `0 errors` (`exit code 0`)
  - `npm run build` -> Vite production build (`670 modules transformed`, `public/build/manifest.json`) (`exit code 0`)
  - `php artisan migrate --no-interaction && php artisan migrate:rollback --no-interaction && php artisan migrate --seed --no-interaction` -> 18 migrasi rollback & re-migrate + seed bersih (`exit code 0`)
  - Hygiene check (`grep` `dd`/`dump`/`var_dump`/`bcmath`/`(float)` di `app/` & `routes/`) -> `0` temuan; `resources/js/` & `resources/css/` tidak tersentuh.
- **Keputusan / Blocker / Catatan Napkin:**
  - Ditambahkan catatan #10 di `.claude/napkin.md` mengenai subquery berkorelasi `(ORDER BY waktu_update DESC, id_status_produksi DESC LIMIT 1)` untuk membaca tahap produksi terakhir di MySQL 8.4 (`ONLY_FULL_GROUP_BY`) dan mengecualikan `DIAMBIL`/`DIBATALKAN` dari hitungan `stageCounts`.
  - Tidak ada blocker.
- **Next Exact Action:**
  1. Lakukan cross-agent review & Squash Merge `feature/p2-02-produksi-service` ke `main` sesuai `napkin/PR_REVIEW_LIFECYCLE.md`.
  2. Delegasikan **`P2-03`** ke `cw-backend-dev` pada branch `feature/p2-03-ubah-batal` dari `main` untuk mengimplementasikan `TransaksiAdjustmentService` (`ubahLayanan` `KK-02` & `batalkanTransaksi` `KK-08` dengan pelepasan atomik `nomor_voucher`), `UbahLayananRequest`, `BatalkanTransaksiRequest`, pembaruan `TransaksiPolicy` & `TransaksiController::show()` (`layananOptions`, `auditLogs`), `TransaksiAdjustmentController`, serta automated tests `AC-P2-06` s.d. `AC-P2-08`.

### [#012] 2026-11-10 17:03 — Backend Developer (`cw-backend-dev`) — Phase 2 (`P2-03`)
- **Status:** `READY_FOR_REVIEW`
- **Ringkasan Kegiatan:**
  - Melakukan Context Sync (`PRD.md` §7.2/§8 `FR-07`/`FR-12`/§9, `AGENTS.md`, `MEMORY.md`, `WRITE.md` `#009`–`#011`, `.claude/napkin.md`, `napkin/PR_REVIEW_LIFECYCLE.md`, `docs/phases/PHASE_1_CONTRACTS.md`, dan `docs/phases/PHASE_2_CONTRACTS.md` §2.0, §2.3–§2.4, §3.1–§3.3, §4 `AC-P2-06`..`AC-P2-08`, serta `TransaksiService` & `PembayaranService`) lalu membuat branch `feature/p2-03-ubah-batal` dari `main`.
  - Menerapkan TDD (**Red $\rightarrow$ Green $\rightarrow$ Refactor**): menulis `tests/Unit/TransaksiAdjustmentServiceTest.php` dan `tests/Feature/TransaksiAdjustmentTest.php` lebih dulu (9 test gagal pada fase Red) sebelum implementasi kode.
  - Memperbarui `app/Services/VoucherService.php` dengan `lepaskan()` (`DB::transaction()` + `lockForUpdate()`, mengembalikan status ke `TERSEDIA` bila `masa_berlaku >= today WIB` atau `KEDALUWARSA` bila lewat, serta `digunakan_pada = null`).
  - Memperbarui `app/Services/TransaksiService.php` dengan `getActiveLayananOptions()`, `getAuditLogs()` (beserta relasi `user:id,name` sesuai `AuditLogItem` §3.3), dan mengekspos `validateQuantityForLayanan()` agar dipakai bersama oleh penerimaan & perubahan layanan tanpa duplikasi logika.
  - Mengimplementasikan `app/Services/TransaksiAdjustmentService.php` (`ubahLayanan()` dan `batalkanTransaksi()` dalam `DB::transaction()` + `lockForUpdate()`):
    - `ubahLayanan()` (`KK-02`, `KK-09`): mengizinkan hanya pada `AKTIF` tahap `DITERIMA`/`DICUCI`, memvalidasi layanan aktif non-identik & kecocokan `TahapLayanan`, mewajibkan `berat_atau_jumlah_baru` valid saat pindah `BERAT <-> JUMLAH`, menyalin `harga_satuan_snapshot` baru, merekonsiliasi `total_harga` & `status_pembayaran` via `PembayaranService`, dan mencatat `AuditLog` (`LAYANAN_CHANGED`).
    - `batalkanTransaksi()` (`KK-08`): Cabang A (`DITERIMA`) menolak biaya `> 0`, menetapkan `biaya_pembatalan = '0.00'`, `total_harga = '0.00'`, melepas voucher secara atomik dengan mengosongkan `transaksi.nomor_voucher = null` & `nilai_voucher_snapshot = '0.00'` (aman dipakai ulang tanpa error `UNIQUE(nomor_voucher)`), dan merekonsiliasi `status_pembayaran`; Cabang B (`DICUCI`/`DIKERINGKAN`/`DISETRIKA`) menolak pembatalan gratis `422`, memakai default `50%` `subtotal_layanan` via `DecimalMoney::percentage()` atau override `0 < biaya <= subtotal_layanan`, mempertahankan voucher sebagai `SUDAH_DIGUNAKAN`, menghitung `total_harga = max(0, biaya_pembatalan - total_kompensasi)`, merekonsiliasi `status_pembayaran` & `kelebihan_bayar_tunai`, serta mencatat `AuditLog` (`TRANSAKSI_CANCELLED`).
  - Membuat `UbahLayananRequest` & `BatalkanTransaksiRequest` (menggunakan `AuthorizesPetugasRequest`), menambahkan `ubahLayanan()` & `batalkan()` pada `TransaksiPolicy`, memperluas `Controller::executeWithFlashRedirect()` agar mendukung `$routeParams`, membuat `TransaksiAdjustmentController`, memperbarui `TransaksiController::show()` (`layananOptions` + `auditLogs` sesuai `TransaksiShowProps`), dan mendaftarkan route `POST /transaksi/{nota}/ubah-layanan` & `POST /transaksi/{nota}/batalkan` di `routes/web.php` di bawah `role:PETUGAS`, tanpa menyentuh `resources/js/` maupun `resources/css/`.
- **File Dibuat / Diubah:**
  - `app/Services/TransaksiAdjustmentService.php` — Engine penyesuaian `ubahLayanan()` (`KK-02`) dan `batalkanTransaksi()` (`KK-08`)
  - `app/Services/VoucherService.php` — Penambahan `lepaskan()` dengan `lockForUpdate()` & cek tanggal kedaluwarsa WIB
  - `app/Services/TransaksiService.php` — Penambahan `getActiveLayananOptions()`, `getAuditLogs()`, & `validateQuantityForLayanan()`
  - `app/Http/Controllers/Controller.php` — Dukungan `$routeParams` opsional di `executeWithFlashRedirect()`
  - `app/Http/Requests/Transaksi/{UbahLayananRequest,BatalkanTransaksiRequest}.php` — FormRequest validation & otorisasi `PETUGAS` aktif
  - `app/Policies/TransaksiPolicy.php` — Penambahan kemampuan policy `ubahLayanan` & `batalkan`
  - `app/Http/Controllers/TransaksiAdjustmentController.php`, `app/Http/Controllers/TransaksiController.php`, `routes/web.php` — Endpoint `transaksi.ubah-layanan`, `transaksi.batalkan`, & props `Transaksi/Show` (`layananOptions`, `auditLogs`)
  - `tests/Unit/TransaksiAdjustmentServiceTest.php`, `tests/Feature/TransaksiAdjustmentTest.php` — Automated tests lengkap `AC-P2-06` s.d. `AC-P2-08`, RBAC `403`, `KK-09` pasca ubah layanan, & pakai ulang voucher bebas `UNIQUE(nomor_voucher)`
  - `MEMORY.md`, `WRITE.md` — Update `[x] P2-03` dan Entry `#012`
- **Verifikasi / Bukti Uji:**
  - `./vendor/bin/pint --test` -> `{"tool":"pint","result":"passed"}` (`exit code 0`)
  - `php artisan test` -> `76 passed (2012 assertions)` pada MySQL 8.4 port `3307` (`cleanwash_testing`), termasuk seluruh test Phase 1 (`TransaksiReceptionTest`, `Phase1EndToEndTest`), `P2-02`, dan `P2-03` (`exit code 0`)
  - `npx tsc --noEmit` -> `0 errors` (`exit code 0`)
  - `npm run build` -> Vite production build (`public/build/manifest.json`, `built in 1.98s`) (`exit code 0`)
  - `php artisan migrate --no-interaction && php artisan migrate:rollback --no-interaction && php artisan migrate --seed --no-interaction` -> 18 migrasi rollback & re-migrate + seed bersih (`exit code 0`)
  - `php artisan route:list --except-vendor` -> 28 route terdaftar termasuk `transaksi.ubah-layanan` & `transaksi.batalkan`; hygiene grep (`dd`/`dump`/`var_dump`/`bcmath`/`(float)`) -> `0` temuan; `resources/js/` & `resources/css/` tidak tersentuh.
- **Keputusan / Blocker / Catatan Napkin:**
  - Aturan #9 di `.claude/napkin.md` (`transaksi.nomor_voucher = null` saat batal di `DITERIMA`) diverifikasi berjalan bersih di MySQL 8.4 tanpa konflik constraint `UNIQUE(nomor_voucher)`.
  - Tidak ada blocker.
- **Next Exact Action:**
  1. Lakukan cross-agent review & Squash Merge `feature/p2-03-ubah-batal` ke `main` sesuai `napkin/PR_REVIEW_LIFECYCLE.md`.
  2. Delegasikan **`P2-04`** ke `cw-backend-dev` pada branch `feature/p2-04-kompensasi` dari `main` untuk mengimplementasikan `KompensasiService` (`LaporanKerusakanKehilangan` per `DetailPakaian`, `hitungKompensasi`, `potongKompensasi` tanpa double-counting `kelebihan_ganti_rugi`), `LaporanKerusakanPolicy`, `StoreInsidenRequest`, `KonfirmasiKompensasiRequest`, `InsidenController`, dan automated tests `AC-P2-09` s.d. `AC-P2-10`.

### [#013] 2026-11-10 17:15 — Backend Developer (`cw-backend-dev`) — Phase 2 (`P2-04`)
- **Status:** `READY_FOR_REVIEW`
- **Ringkasan Kegiatan:**
  - Melakukan Context Sync (`PRD.md` §5/§7.3/§8 `FR-08`/§10, `AGENTS.md`, `MEMORY.md`, `WRITE.md` `#010`–`#012`, `.claude/napkin.md`, `napkin/PR_REVIEW_LIFECYCLE.md`, `docs/phases/PHASE_1_CONTRACTS.md`, dan `docs/phases/PHASE_2_CONTRACTS.md` §2.0, §2.5, §3.1–§3.3, §4 `AC-P2-09`..`AC-P2-10`, plus `DecimalMoney`, `TransaksiService`, `PembayaranService`, `ProduksiService`, `ProduksiPolicy`, `ProduksiController`, `AppServiceProvider`, & `routes/web.php`) lalu membuat branch `feature/p2-04-kompensasi` dari `main` (`bd483c6`).
  - Menerapkan TDD (**Red $\rightarrow$ Green $\rightarrow$ Refactor**): menulis `tests/Unit/KompensasiServiceTest.php` dan `tests/Feature/InsidenTest.php` lebih dulu (7 test gagal pada fase Red) sebelum implementasi service, policy, request, controller, dan routes.
  - Mengimplementasikan `app/Services/KompensasiService.php` (bebas `float` dan `bcmath`, berbasis `App\Support\DecimalMoney`):
    - `estimateCompensation()` (formula tunggal yang dibagikan dengan `TransaksiService::formatLaporanInsiden()` tanpa duplikasi) & `hitungKompensasi()` (`5×` basis prorata item untuk `RUSAK`, `10×` untuk `HILANG`, floor `100` sen, imun `KK-09` snapshot tarif).
    - `laporInsiden()` dalam `DB::transaction()` + `lockForUpdate()` pada `Transaksi`: validasi `AKTIF`/`SELESAI` dan kepemilikan `id_detail` (`422` jika silang nota atau status `DIAMBIL`/`DIBATALKAN`); Mode 1 (`PEGAWAI`) membuat `MENUNGGU_KONFIRMASI` (`id_petugas = null`, nominal `'0.00'`, `AuditLog` `INSIDEN_REPORTED`); Mode 2 (`PETUGAS`) menghitung/memvalidasi kompensasi, mengeksekusi `potongKompensasi()`, dan mencatat `INSIDEN_REPORTED` + `KOMPENSASI_CONFIRMED`.
    - `konfirmasiKompensasi()` dalam `DB::transaction()` + `lockForUpdate()` pada `LaporanKerusakanKehilangan` dan `Transaksi`: menolak `422` (`"Laporan insiden sudah dikonfirmasi."`) bila `id_petugas !== null` atau status transaksi non-`AKTIF`/`SELESAI`, memotong tagihan lewat `potongKompensasi()`, dan mencatat `AuditLog` `KOMPENSASI_CONFIRMED` (beserta `keterangan_konfirmasi` bila diisi).
    - `potongKompensasi()`: menghitung `sisa_tagihan_sebelum`, `kelebihan_ganti_rugi = max(0, nilai_kompensasi - sisa_tagihan_sebelum)` anti-double-counting untuk multi-insiden, memperbarui `total_kompensasi`, `total_harga = max(0, tagihan_dasar - total_kompensasi_baru)`, dan `status_pembayaran` via `PembayaranService::resolveStatusPembayaranSetelahPenyesuaian()` (`-> LUNAS` saat sisa `'0.00'`).
    - Helper `GET /insiden` tanpa N+1 query: `paginateLaporan()` (pencarian `SqlLike` di `nomor_nota`, `keterangan`, `transaksi.pelanggan.nama`, `detailPakaian.jenis_pakaian`; filter `jenis_insiden` & `status_konfirmasi`), `countPending()`, `getEligibleTransaksiOptions()` (`EligibleInsidenTransaksiOption` hanya `AKTIF`/`SELESAI`), dan `formatLaporanDetail()` (`LaporanInsidenDetailItem`).
  - Memperbarui `app/Services/TransaksiService.php` agar `formatLaporanInsiden()` bersifat `public` dan memakai `KompensasiService::estimateCompensation()` secara langsung.
  - Membuat `app/Policies/LaporanKerusakanPolicy.php` (terdaftar di `AppServiceProvider` untuk `LaporanKerusakanKehilangan`): `viewAny` & `create` untuk `PETUGAS`/`PEGAWAI` aktif, `konfirmasi` khusus `PETUGAS` aktif (`PEGAWAI` & `PENGANTAR` ditolak `403`).
  - Membuat `StoreInsidenRequest` (menggabungkan/memvalidasi konsistensi parameter route `nota` di `prepareForValidation()`/`after()`) & `KonfirmasiKompensasiRequest`, `app/Http/Controllers/InsidenController.php` (memakai `executeWithFlashRedirect()`, membedakan fallback redirect `PEGAWAI` ke `produksi.index` & `PETUGAS` ke `transaksi.show` pada `storeForTransaksi`), serta mendaftarkan `GET /insiden`, `POST /insiden`, `POST /transaksi/{nota}/insiden` di group `role:PETUGAS,PEGAWAI` dan `POST /insiden/{laporan}/konfirmasi` di group `role:PETUGAS` pada `routes/web.php`.
- **File Dibuat / Diubah:**
  - `app/Services/KompensasiService.php` — Engine kompensasi (`estimateCompensation`, `hitungKompensasi`, `laporInsiden`, `konfirmasiKompensasi`, `potongKompensasi`, `paginateLaporan`, `countPending`, `getEligibleTransaksiOptions`, `formatLaporanDetail`)
  - `app/Services/TransaksiService.php` — Berbagi formula `KompensasiService::estimateCompensation()` & expose `formatLaporanInsiden()`
  - `app/Policies/LaporanKerusakanPolicy.php`, `app/Providers/AppServiceProvider.php` — Policy & registrasi Gate `LaporanKerusakanKehilangan`
  - `app/Http/Requests/Insiden/{StoreInsidenRequest,KonfirmasiKompensasiRequest}.php` — FormRequest otorisasi & validasi insiden/konfirmasi
  - `app/Http/Controllers/InsidenController.php`, `routes/web.php` — Endpoint `insiden.index`, `insiden.store`, `transaksi.insiden.store`, dan `insiden.konfirmasi`
  - `tests/Unit/KompensasiServiceTest.php`, `tests/Feature/InsidenTest.php` — Automated tests `AC-P2-09`, `AC-P2-10`, multi-insiden anti-double-counting `kelebihan_ganti_rugi`, RBAC `403`, cross-nota `422`, dan proteksi N+1
  - `MEMORY.md`, `WRITE.md` — Update `[x] P2-04` dan Entry `#013`
- **Verifikasi / Bukti Uji:**
  - `./vendor/bin/pint --test` -> `{"tool":"pint","result":"passed"}` (`exit code 0`)
  - `npx tsc --noEmit` -> `0 errors` (`exit code 0`)
  - `php artisan test` -> `83 passed (2274 assertions)` pada MySQL 8.4 port `3307` (`cleanwash_testing`), termasuk seluruh unit & feature tests Phase 1, `P2-02`, `P2-03`, dan `P2-04` (`exit code 0`)
  - `npm run build` -> Vite production build (`670 modules transformed`, `public/build/manifest.json`, `built in 2.02s`) (`exit code 0`)
  - `php artisan migrate --no-interaction && php artisan migrate:rollback --no-interaction && php artisan migrate --seed --no-interaction` -> 18 migrasi rollback & re-migrate + `CleanWashSeeder` bersih (`exit code 0`)
  - `php artisan route:list --except-vendor` -> 32 route terdaftar termasuk `insiden.index`, `insiden.store`, `transaksi.insiden.store`, dan `insiden.konfirmasi`; hygiene grep (`dd`/`dump`/`var_dump`/`bcmath`/`(float)`) -> `0` temuan; `resources/js/`, `resources/css/`, & `Archive/` tidak tersentuh.
- **Keputusan / Blocker / Catatan Napkin:**
  - Assertion Inertia `GET /insiden` pada `tests/Feature/InsidenTest.php` menggunakan `$this->withoutVite()` dan `->component('Insiden/Index', shouldExist: false)` dengan komentar `// Temporary shouldExist: false until P2-05 creates Insiden/Index.tsx`; wajib dihapus di `P2-05` setelah `resources/js/Pages/Insiden/Index.tsx` dibuat (sekaligus `Produksi/Index.tsx` pada `ProduksiOperationTest.php`).
  - Tidak ada blocker.
- **Next Exact Action:**
  1. Lakukan cross-agent review & Squash Merge `feature/p2-04-kompensasi` ke `main` sesuai `napkin/PR_REVIEW_LIFECYCLE.md`.
  2. Delegasikan **`P2-05`** ke `cw-frontend-dev` pada branch `feature/p2-05-frontend-ui` dari `main` untuk membangun UI `Produksi/Index.tsx`, `Insiden/Index.tsx`, pembaruan `Transaksi/Show.tsx`, `AppLayout.tsx`, `StatusBadge.tsx`, `format.ts`, dan `types/index.ts`, serta menghapus `shouldExist: false` pada `ProduksiOperationTest.php` dan `InsidenTest.php`.

### [#014] 2026-11-10 17:25 — Frontend Developer (`cw-frontend-dev`) — Phase 2 (`P2-05`)
- **Status:** `READY_FOR_REVIEW`
- **Ringkasan Kegiatan:**
  - Melakukan Context Sync (`PRD.md`, `AGENTS.md`, `MEMORY.md`, `WRITE.md` `#011`–`#013`, `.claude/napkin.md`, `docs/phases/PHASE_2_CONTRACTS.md` §3.1/§3.3/`AC-P2-11`, serta `SKILL.md` `modern-web-guidance` `search`/`retrieve` untuk `dialog`, `forms`, `responsive-table`, `accessibility`) dan menginspeksi kontrak UI serta controller (`ProduksiController.php`, `InsidenController.php`, `TransaksiController.php`, `TransaksiAdjustmentController.php`, `TransaksiService.php`, `KompensasiService.php`, `ProduksiService.php`) pada branch baru `feature/p2-05-frontend-ui` dari `main` (`171cb01`).
  - Memperbarui kontrak TypeScript strict di `resources/js/types/index.ts` sesuai `PHASE_2_CONTRACTS.md` §3.3 (`JenisInsiden`, `StatusKonfirmasiInsiden`, `RiwayatStatusProduksiItem.pegawai?`, `LaporanInsidenItem`, `LaporanInsidenDetailItem`, `AuditLogItem`, properti Phase 2 `TransaksiDetail`, `TransaksiShowProps`, `ProduksiIndexProps`, `EligibleInsidenTransaksiOption`, `InsidenIndexProps`), serta menandai field baru Phase 2 pada `DashboardPetugasSummary`, `DashboardPegawaiSummary`, dan `TransaksiIndexProps.filters.status_transaksi` sebagai opsional (`?`) sementara hingga wiring `P2-06`.
  - Memperbarui `resources/js/lib/format.ts` (`formatJenisInsiden`, `formatStatusKonfirmasi`, `formatTahapProduksi`, `formatAuditAction`, `calculateMultiplyQuantityCents`, `calculatePercentageCents`, `estimateCompensationPreview` berbasis integer cents tanpa float drift, dan `toEligibleInsidenOption`).
  - Memperbarui `resources/js/Components/StatusBadge.tsx` (`JenisInsidenBadge`, `StatusKonfirmasiBadge`, `TahapProduksiBadge` + preservasi penuh seluruh badge Phase 1) dan `resources/js/Layouts/AppLayout.tsx` (aktifkan `/insiden` + keep Phase 3 `Pengantaran`/`Serah Terima` disabled untuk `PETUGAS`, aktifkan `/produksi` & `/insiden` untuk `PEGAWAI`, `aria-current="page"`, serta dukungan `Escape` di mobile drawer).
  - Meningkatkan `resources/js/Components/Modal.tsx` ke elemen native `<dialog>` (`showModal()`, `useId()` untuk `aria-labelledby`, handle `cancel`/`Esc`, `closedby` + fallback pointer luar untuk browser non-Chromium, serta CSS wajib `dialog:modal` & `dialog::backdrop` `overscroll-behavior: contain` di `resources/css/app.css`), serta mengekstrak `LaporkanInsidenModal.tsx` dan `KonfirmasiKompensasiModal.tsx` agar bebas duplikasi lintas halaman.
  - Membangun `resources/js/Pages/Produksi/Index.tsx` (5 kartu ringkasan `stageCounts` interaktif sebagai filter cepat dengan sinkronisasi `status_transaksi`, pencarian & filter `tahap_status`/`status_transaksi`, rincian pelanggan/layanan/snapshot/pakaian/pipeline terurut + nama & waktu pegawai terakhir, **guard ketat `AC-P2-11` tanpa tombol atau opsi `DISETRIKA` saat `perlu_setrika = false`**, Modal Timbang Ulang `KK-01`/`KK-09` dengan peringatan `LUNAS -> BELUM_LUNAS`, dan Modal Lapor Insiden per `DetailPakaian`).
  - Membangun `resources/js/Pages/Insiden/Index.tsx` (header badge `pendingCount` + Modal `+ Laporkan Insiden` berbasis `eligibleTransaksiOptions` & role-aware Mode 1 vs Mode 2, filter search/jenis/status, tabel semantik `<caption>` + `scope` + scrollable `role="region"`, tautan `/transaksi/{nota}` khusus `PETUGAS`, dan Modal Konfirmasi & Potong Saldo khusus `PETUGAS` dengan peringatan `kelebihan_ganti_rugi`).
  - Memperbarui `resources/js/Pages/Transaksi/Show.tsx` (preservasi fitur Phase 1, nama `pegawai` di `RiwayatStatusProduksi`, banner biaya batal/kompensasi/pending/total pengembalian pelanggan, Modal Ubah Layanan `KK-02`, Modal Batalkan Transaksi `KK-08` gratis + lepas voucher di `DITERIMA` vs biaya proses `50%` pasca cuci, Modal Lapor Insiden, kartu Daftar Insiden & Kompensasi dengan konfirmasi langsung, serta kartu Audit Trail Transaksi `auditLogs`).
  - Mematuhi larangan tegas untuk tidak menyentuh `app/`, `database/`, `routes/`, `tests/`, maupun `Archive/`.
- **File Dibuat / Diubah:**
  - `resources/css/app.css` — Aturan `dialog:modal` & `dialog::backdrop` (`overscroll-behavior: contain`, `overflow: hidden`)
  - `resources/js/Components/Modal.tsx` — Native `<dialog>` (`showModal()`), unique `useId()`, & `Esc`/backdrop handling
  - `resources/js/Components/StatusBadge.tsx` — Ekspor `JenisInsidenBadge`, `StatusKonfirmasiBadge`, & `TahapProduksiBadge`
  - `resources/js/Components/LaporkanInsidenModal.tsx` — Modal reusable pelaporan insiden Mode 1 (`PEGAWAI`) & Mode 2 (`PETUGAS`)
  - `resources/js/Components/KonfirmasiKompensasiModal.tsx` — Modal reusable konfirmasi & pemotongan saldo kompensasi (`PETUGAS`)
  - `resources/js/Layouts/AppLayout.tsx` — Navigasi aktif `/produksi` & `/insiden` per peran + item Phase 3 disabled untuk `PETUGAS`
  - `resources/js/lib/format.ts` — Formatter Phase 2 & kalkulasi preview integer cents
  - `resources/js/types/index.ts` — Kontrak TypeScript strict Phase 2 (§3.3)
  - `resources/js/Pages/Produksi/Index.tsx` — Workspace antrean produksi `PEGAWAI`, timbang ulang, & lapor insiden
  - `resources/js/Pages/Insiden/Index.tsx` — Halaman bersama insiden & konfirmasi kompensasi
  - `resources/js/Pages/Transaksi/Show.tsx` — Penyesuaian Ubah/Batal, Insiden, & Audit Trail Transaksi
  - `MEMORY.md`, `WRITE.md` — Update `[x] P2-05` dan Entry `#014`
- **Verifikasi / Bukti Uji:**
  - `npx tsc --noEmit` -> `0 errors` (`strict: true`) (`exit code 0`)
  - `npm run build` -> Vite production build (`674 modules transformed`, `public/build/manifest.json`, aset `Produksi/Index`, `Insiden/Index`, `Transaksi/Show` terbangun bersih dalam `2.07s`) (`exit code 0`)
  - `./vendor/bin/pint --test` -> `{"tool":"pint","result":"passed"}` (`exit code 0`)
  - `php artisan test` -> `83 passed (2274 assertions)` pada MySQL 8.4 port `3307` (`cleanwash_testing`) (`exit code 0`)
  - Audit hygiene (`grep` `console.log` & `: any` di `resources/js`) -> `0` temuan; tidak ada file di `app/`, `database/`, `routes/`, `tests/`, atau `Archive/` yang dimodifikasi.
- **Keputusan / Blocker / Catatan Napkin:**
  - `resources/js/Pages/Produksi/Index.tsx` dan `resources/js/Pages/Insiden/Index.tsx` kini telah tersedia di filesystem sehingga parameter sementara `shouldExist: false` pada `tests/Feature/ProduksiOperationTest.php` dan `tests/Feature/InsidenTest.php` siap dihapus pada langkah review/`P2-06` (sengaja tidak disentuh di `P2-05` karena batas direktori eksklusif frontend).
  - Tidak ada blocker.
- **Next Exact Action:**
  1. Lakukan cross-agent review branch `feature/p2-05-frontend-ui` dan merge ke `main`.
  2. Lanjutkan **`P2-06`** (`fullstack-developer` + `product-manager`) untuk menghapus `shouldExist: false` di `ProduksiOperationTest.php` & `InsidenTest.php`, me-wire KPI Phase 2 di `DashboardController.php` + `Dashboard/Index.tsx`, memperbarui `Transaksi/Index.tsx` & `Transaksi/Nota.tsx`, menyusun `Phase2EndToEndTest.php` tanpa `withoutVite()`, serta mengeksekusi **Phase 2 Closing Gate (`AC-P2-01` s.d. `AC-P2-12`)**.

### [#015] 2026-11-10 17:35 — Fullstack Developer (`P2-06`) — Phase 2 (`P2-06`)
- **Status:** `READY_FOR_REVIEW`
- **Ringkasan Kegiatan:**
  - Melakukan Context Sync (`PRD.md`, `AGENTS.md`, `MEMORY.md`, `WRITE.md` `#012`–`#014`, `.claude/napkin.md`, `napkin/PR_REVIEW_LIFECYCLE.md`, `docs/phases/PHASE_1_CONTRACTS.md`, dan `docs/phases/PHASE_2_CONTRACTS.md` §1.2, §3.3, `AC-P2-01`..`AC-P2-12`), membuat branch `feature/p2-06-wiring-gate` dari `main` (`d37e8fd`), serta menginspeksi seluruh controller, service, page TSX, types, dan feature tests terkait.
  - **Cross-Layer Wiring Backend:**
    - Memperbarui `app/Services/ProduksiService.php`: mengekstrak konstanta `LATEST_STAGE_SUBQUERY` untuk dipakai bersama pada `paginateQueue()`, `getStageCounts()`, dan helper baru `getPegawaiDashboardMetrics()` (single query `ONLY_FULL_GROUP_BY`-safe di MySQL 8.4 untuk `perlu_timbang_ulang` dan `siap_proses_berikutnya`).
    - Memperbarui `app/Http/Controllers/DashboardController.php`: menyeragamkan pemeriksaan masa berlaku voucher ke `now('Asia/Jakarta')->toDateString()` (baris 36) serta mengisi KPI Phase 2 `PETUGAS` (`insiden_menunggu_konfirmasi`, `transaksi_selesai_siap_ambil`) dan `PEGAWAI` (`perlu_timbang_ulang`, `siap_proses_berikutnya`).
    - Memperbarui `app/Services/TransaksiService.php` (`paginate()`) dan `app/Http/Controllers/TransaksiController.php` (`index()`): mendukung filter opsional `$statusTransaksi` (`AKTIF`, `SELESAI`, `DIAMBIL`, `DIBATALKAN`) dan mengirim `filters.status_transaksi`.
  - **Cross-Layer Wiring Frontend (`types` + UI):**
    - Memperbarui `resources/js/types/index.ts`: menjadikan `insiden_menunggu_konfirmasi`, `transaksi_selesai_siap_ambil`, `perlu_timbang_ulang`, `siap_proses_berikutnya` required pada `DashboardPetugasSummary` & `DashboardPegawaiSummary`, serta `status_transaksi` required pada `TransaksiIndexProps.filters`.
    - Memperbarui `resources/js/Pages/Dashboard/Index.tsx`: menampilkan alert/badge kuning ke `/insiden?status_konfirmasi=MENUNGGU_KONFIRMASI` saat `insiden_menunggu_konfirmasi > 0`, KPI `transaksi_selesai_siap_ambil`, & shortcut `/insiden` + `/transaksi` untuk `PETUGAS`; serta mengganti banner *Roadmap Phase 2* `PEGAWAI` dengan KPI `perlu_timbang_ulang` (`/produksi?tahap_status=DITERIMA`), `siap_proses_berikutnya` (`/produksi`), dan kartu aksi cepat `Antrean Produksi` + `Lapor Insiden`.
    - Memperbarui `resources/js/Pages/Transaksi/Index.tsx`: menambahkan dropdown filter `status_transaksi` (`Semua Status`, `AKTIF`, `SELESAI`, `DIAMBIL`, `DIBATALKAN`), sinkronisasi state filter via `useEffect`, badge `tahap_produksi_terakhir`, badge peringatan saat `insiden_pending_count > 0`, serta indikator pembatalan/kompensasi/pengembalian.
    - Memperbarui `resources/js/Pages/Transaksi/Nota.tsx`: menambahkan nama `Pegawai` pelaksana pada `Tahap Produksi Terkini` & tabel `Riwayat Status Produksi`, ringkasan status pembatalan & `biaya_pembatalan` saat `status_transaksi === 'DIBATALKAN'`, tabel rincian `laporan_insiden` (jenis insiden, item pakaian, keterangan, status konfirmasi, nilai kompensasi, kelebihan ganti rugi), dan rincian `total_kompensasi`, `kelebihan_bayar_tunai`, `total_kelebihan_ganti_rugi`, serta `total_pengembalian_pelanggan` dalam `Ringkasan Finansial` bila `> 0`.
  - **Cleanup & Phase 2 E2E Tests:**
    - Menghapus seluruh `shouldExist: false` (beserta komentar sementara) di `tests/Feature/ProduksiOperationTest.php` dan `tests/Feature/InsidenTest.php` sehingga `config('inertia.testing.ensure_pages_exist') === true` aktif di semua test suite.
    - Membuat `tests/Feature/Phase2EndToEndTest.php` **tanpa** `$this->withoutVite()` yang memverifikasi `public/build/manifest.json` nyata dan seluruh `AC-P2-01` s.d. `AC-P2-12` melalui 3 skenario penuh (`KK-01`, `KK-02`, `KK-04`, `KK-05`, `KK-08`, `KK-09`, `perlu_setrika = false`, `PEGAWAI -> PETUGAS` kompensasi + `kelebihan_ganti_rugi`, pelepasan atomik & pakai ulang voucher, RBAC `PENGANTAR` `403`, filter `status_transaksi`, & batas tanggal WIB `Asia/Jakarta` di `DashboardController`).
- **File Dibuat / Diubah:**
  - `app/Services/ProduksiService.php` — Ekstraksi `LATEST_STAGE_SUBQUERY` & helper `getPegawaiDashboardMetrics()`
  - `app/Http/Controllers/DashboardController.php` — Tanggal `Asia/Jakarta` & pengisian KPI Phase 2 `PETUGAS`/`PEGAWAI`
  - `app/Services/TransaksiService.php`, `app/Http/Controllers/TransaksiController.php` — Filter opsional `status_transaksi` di `/transaksi`
  - `resources/js/types/index.ts` — Field KPI Phase 2 & `TransaksiIndexProps.filters.status_transaksi` wajib (strict)
  - `resources/js/Pages/Dashboard/Index.tsx` — KPI lintas aktor, alert kuning insiden pending, & quick action `PEGAWAI`/`PETUGAS`
  - `resources/js/Pages/Transaksi/Index.tsx` — Dropdown filter `status_transaksi`, badge `tahap_produksi_terakhir`, `insiden_pending_count`, & indikator batal/kompensasi
  - `resources/js/Pages/Transaksi/Nota.tsx` — Nama pelaksana `RiwayatStatusProduksi`, ringkasan batal, tabel `laporan_insiden`, & rincian pengembalian finansial
  - `tests/Feature/ProduksiOperationTest.php`, `tests/Feature/InsidenTest.php` — Cleanup seluruh `shouldExist: false`
  - `tests/Feature/Phase2EndToEndTest.php` — E2E integration test Phase 2 penuh tanpa `$this->withoutVite()`
  - `MEMORY.md`, `WRITE.md` — Update snapshot kesiapan PM Gate (tanpa mencentang `P2-06` sebelum sign-off PM) & Entry `#015`
- **Verifikasi / Bukti Uji:**
  - `./vendor/bin/pint --test` -> `{"tool":"pint","result":"passed"}` (`exit code 0`)
  - `npx tsc --noEmit` -> `0 errors` (`strict: true`) (`exit code 0`)
  - `npm run build` -> Vite production build (`674 modules transformed`, `public/build/manifest.json`, `built in 2.13s`) (`exit code 0`)
  - `php artisan test` -> `84 passed (2722 assertions)` pada MySQL 8.4 port `3307` (`cleanwash_testing`), termasuk `Phase1EndToEndTest` & `Phase2EndToEndTest` tanpa `withoutVite()` (`exit code 0`)
  - `php artisan migrate --no-interaction && php artisan migrate:rollback --no-interaction && php artisan migrate --seed --no-interaction` -> 18 migrasi rollback & re-migrate + `CleanWashSeeder` bersih (`exit code 0`)
  - `php artisan route:list --except-vendor` -> `Showing [32] routes` (`exit code 0`)
  - Audit hygiene (`grep` `shouldExist` di `tests/`, `bcmath`/`(float)`/`floatval`/`dd`/`dump`/`var_dump` di `app/` & `routes/`, `console.log` & `: any` di `resources/js/`) -> `0` temuan.
- **Keputusan / Blocker / Catatan Napkin:**
  - Checkbox `[x] P2-06` dan status `Phase 2 -> DONE` di `MEMORY.md` sengaja dibiarkan terbuka menunggu audit & tanda tangan **Phase 2 Closing Gate** oleh `product-manager`.
  - Tidak ada blocker.
- **Next Exact Action:**
  - Delegasikan ke **`product-manager`** untuk mengeksekusi audit **`AC-P2-01` s.d. `AC-P2-12`**, meninjau branch `feature/p2-06-wiring-gate` terhadap 6 Gerbang Kualitas (`napkin/PR_REVIEW_LIFECYCLE.md`), menyusun `docs/phases/PHASE_2_CLOSING_EVIDENCE.md`, menandatangani **Phase 2 Closing Gate** (`[x] P2-06` & `Phase 2 -> DONE` di `MEMORY.md` + entri `WRITE.md`), dan melakukan Squash & Merge ke `main`.

### [#016] 2026-11-10 17:40 — Product Manager & Primary Agent (`Phase 2 Closing Gate`) — Phase 2 (`P2-06` & Gate)
- **Status:** `DONE` (`APPROVED` — **Phase 2 Resmi Ditutup & Siap Masuk Phase 3**)
- **Ringkasan Kegiatan:**
  - `product-manager` mengeksekusi **Adversarial Phase 2 Closing Gate Audit** pada branch `feature/p2-06-wiring-gate` (`b7a92e9`), memeriksa seluruh implementasi backend, frontend, FormRequest, Policy, migrasi, serta unit/feature/E2E test terhadap **`AC-P2-01` s.d. `AC-P2-12`**, **SRS (`UC-10..UC-13`, `KK-01`, `KK-02`, `KK-04`, `KK-05`, `KK-08`, `KK-09`)**, dan **6 Gerbang Kualitas** di `napkin/PR_REVIEW_LIFECYCLE.md`.
  - Menerbitkan verdict **`APPROVED`** (0 temuan blocker; 2 catatan optimasi minor non-blocking diteruskan ke Phase 3) dan mencatat matriks bukti lengkap ke `docs/phases/PHASE_2_CLOSING_EVIDENCE.md`.
  - Menandai `P2-06` selesai (`[x]`), menutup status **Phase 2** menjadi `DONE` di `MEMORY.md`, memindahkan `Current Phase` ke **Phase 3 (`NOT_STARTED`)**, dan mengeksekusi **Squash & Merge** `feature/p2-06-wiring-gate` ke `main`.
- **File Dibuat / Diubah:**
  - `docs/phases/PHASE_2_CLOSING_EVIDENCE.md` — Berita acara bukti audit `AC-P2-01`..`AC-P2-12` & 6 Gerbang Kualitas Phase 2
  - `MEMORY.md` — Menandai `[x] P2-06`, status `Phase 2 -> DONE`, dan `Current Phase -> Phase 3` (`NOT_STARTED`)
  - `WRITE.md` — Menambahkan Entry `#016`
- **Verifikasi / Bukti Uji:**
  - Verifikasi silang penuh pada branch `feature/p2-06-wiring-gate` dan ulang pasca-merge di `main`: `./vendor/bin/pint --test` (`passed`), `npx tsc --noEmit` (`0 errors`), `npm run build` (`674 modules`, `public/build/manifest.json`), `php artisan test` (`84 passed (2722 assertions)`), `migrate:rollback && migrate --seed` (18 migrasi rollback & re-migrate + `CleanWashSeeder`), `rg -n "shouldExist" tests/` (`CLEAN`), dan `git status` bersih pada `main`.
- **Keputusan / Blocker / Catatan Napkin:**
  - Catatan non-blocking untuk Phase 3: (1) gunakan `centsToDecimalString()` di preview `basisCents` pada `LaporkanInsidenModal.tsx`; (2) pastikan `PengantaranService` (`P3-02`) & `SerahTerimaService` (`P3-03`) mengecualikan transaksi `DIBATALKAN` dan mendukung pelunasan saldo penyesuaian `BELUM_LUNAS` / potongan `total_kompensasi`.
  - Tidak ada blocker.
- **Next Exact Action:**
  - Mulai **Phase 3 (`P3-01` s.d. `P3-05`)**: delegasikan **`P3-01`** ke `product-manager` untuk menyusun `docs/phases/PHASE_3_CONTRACTS.md` (spesifikasi detail `PengantaranService` `KK-07`, `SerahTerimaService` `KK-06`, `PembayaranService::catatPelunasan()`, kontrak endpoint/FormRequest/TS strict, serta Matriks UAT 14 Use Case & 9 Kondisi Khusus).

### [#017] 2026-11-10 17:48 — Product Manager & Primary Agent (`P3-01`) — Phase 3 (`P3-01`)
- **Status:** `DONE` (`PHASE_3_CONTRACTS.md` Terkunci)
- **Ringkasan Kegiatan:**
  - `product-manager` mengaudit [PRD.md](file:///home/yoga/Data/Kuliah/Sistem%20Informasi/PRD.md), [PHASE_2_CLOSING_EVIDENCE.md](file:///home/yoga/Data/Kuliah/Sistem%20Informasi/docs/phases/PHASE_2_CLOSING_EVIDENCE.md), migrasi `pengantaran` & `item_pengantaran`, seluruh Enum/Model/Service terkait (`Pengantaran`, `ItemPengantaran`, `PetugasPengantaran`, `PembayaranService`, `TransaksiService`), serta `resources/js/types/index.ts`.
  - Mengunci dokumen kontrak penuh **`docs/phases/PHASE_3_CONTRACTS.md`**:
    - Kepemilikan eksklusif file `P3-01` s.d. `P3-05` tanpa tumpang tindih.
    - Aturan detail `PengantaranService` (`buatJadwal`, `mulaiPengantaran`, `updateStatusItem`, sinkronisasi header `Pengantaran`, pengecekan `cekHakBayarAkhir` saat kurir memilih `DITERIMA`, dan `jadwalkanUlang` terisolasi `KK-07` dengan proteksi double-reschedule).
    - Aturan detail `PembayaranService::catatPelunasan()` + `updateStatusLunas()` (`PELUNASAN_RECORDED`) & `SerahTerimaService` (`ambilPakaian`, `cekHakBayarAkhir`, `serahkanPakaian` `KK-06` termasuk penutupan item `MENUNGGU -> GAGAL` bila diambil di loket serta blokir bila `DIAMBIL`/`DALAM_PERJALANAN`).
    - Endpoint `/pengantaran*`, `/serah-terima`, `/transaksi/{nota}/{pembayaran,serah-terima}`, `/audit`, KPI `DashboardController` (`PETUGAS` & `PENGANTAR`), FormRequest, kontrak TS strict, tindak lanjut cleanup `LaporkanInsidenModal.tsx` (`centsToDecimalString`), `AC-P3-01`..`AC-P3-12`, dan **Matriks UAT 14 Use Case + 9 Kondisi Khusus**.
- **File Dibuat / Diubah:**
  - `docs/phases/PHASE_3_CONTRACTS.md` — Kontrak bisnis, endpoint, Policy, FormRequest, TS strict, `AC-P3-01`..`AC-P3-12`, dan Matriks UAT 14 UC + 9 KK
  - `MEMORY.md` — Menandai `Phase 3 -> IN_PROGRESS`, `[x] P3-01`
  - `WRITE.md` — Menambahkan Entry `#017`
- **Verifikasi / Bukti Uji:**
  - Seluruh jalur route, model, enum (`DIJADWALKAN`/`BERJALAN`/`SELESAI`, `MENUNGGU`/`DIAMBIL`/`DALAM_PERJALANAN`/`DITERIMA`/`GAGAL`), dan nama `AuditLog` (`PELUNASAN_RECORDED`, `SERAH_TERIMA`) terverifikasi sinkron 100% dengan kode & migrasi `main` (`d2c87ba`).
- **Keputusan / Blocker / Catatan Napkin:**
  - Zero migrasi baru (memanfaatkan penuh 16 tabel MySQL 8.4 eksisting); `SerahTerimaService::cekHakBayarAkhir()` dapat diekstrak/dibuat sejak `P3-02` agar `PengantaranService::updateStatusItem()` memanggil sumber kebenaran tunggal sejak awal.
  - Tidak ada blocker.
- **Next Exact Action:**
  - Delegasikan **`P3-02`** ke `cw-backend-dev` pada branch `feature/p3-02-pengantaran-service` untuk mengimplementasikan `PengantaranService`, `SerahTerimaService::cekHakBayarAkhir()`, `PengantaranPolicy`, `StorePengantaranRequest`/`UpdateItemPengantaranStatusRequest`/`JadwalkanUlangRequest`, `PengantaranController`, route pengantaran di `routes/web.php`, penambahan properti pengantaran di `TransaksiService`, serta unit & feature test (`AC-P3-01`..`AC-P3-05`).

### [#018] 2026-11-10 18:00 — Backend Developer (`cw-backend-dev`) — Phase 3 (`P3-02`)
- **Status:** `READY_FOR_REVIEW`
- **Ringkasan Kegiatan:**
  - Melakukan Context Sync (`MEMORY.md`, `WRITE.md` `#015`–`#017`, `.claude/napkin.md`, `PRD.md`, `AGENTS.md`, `napkin/PR_REVIEW_LIFECYCLE.md`, `docs/phases/PHASE_1_CONTRACTS.md`, dan `docs/phases/PHASE_3_CONTRACTS.md` §1.2, §2.0, §2.1, §2.3, §3.1–§3.4, `AC-P3-01`..`AC-P3-05`) serta membuat branch fitur `feature/p3-02-pengantaran-service` dari `main` (`6d6a824`).
  - Menambahkan `DecimalMoney::formatRupiah()` untuk pemformatan nominal `Rp` berbasis integer skala 100 tanpa `float`/`bcmath`, lalu mengimplementasikan `SerahTerimaService::cekHakBayarAkhir(Transaksi $transaksi): array` sebagai sumber kebenaran tunggal pengecekan hak bayar akhir (`KK-06`).
  - Mengimplementasikan `PengantaranService`: `buatJadwal()` multi-pelanggan dengan row lock deterministik `Transaksi::orderBy('nomor_nota')->lockForUpdate()`, `mulaiPengantaran()` (`DIJADWALKAN -> BERJALAN`), `updateStatusItem()` dengan state machine ketat (`MENUNGGU -> DIAMBIL -> DALAM_PERJALANAN -> DITERIMA | GAGAL`), gerbang `cekHakBayarAkhir()` saat `DITERIMA` (`KK-06`, update `DIAMBIL`, `diambil_pada` WIB, `BELUM_LUNAS`/`LUNAS`, `AuditLog('SERAH_TERIMA')`), `syncStatusPengantaran()`, `jadwalkanUlang()` independen (`KK-07` dengan isolasi mutlak item lain + Anti-Double-Reschedule Guard), serta query helper bebas N+1 (`paginatePengantaran`, `getStatusCounts` terisolasi per kurir untuk `PENGANTAR`, `getKurirOptions`, `getEligibleTransaksiOptions`, `formatPengantaranDetail`, `formatItemDetail`).
  - Memperbarui `TransaksiService`: eager-load `'itemPengantaran'` (urut `id_item_antar`) + `'itemPengantaran.pengantaran.petugasPengantaran'` di `detailRelations()` serta menambahkan `bisa_pelunasan`, `bisa_serah_terima_loket`, `sedang_diantar_kurir`, `pengantaran_aktif`, dan `riwayat_pengantaran` pada `formatTransaksiDetail()`.
  - Menambahkan `ChecksPengantarRole`, `PengantaranPolicy` (terdaftar di `AppServiceProvider`), `AuthorizesPengantarRequest`, FormRequest (`StorePengantaranRequest`, `UpdateItemPengantaranStatusRequest`, `JadwalkanUlangRequest` dengan pengecekan kepemilikan kurir dan normalisasi input), `PengantaranController` (redirect sukses ke `pengantaran.show` sesi baru & error ke `pengantaran.index` / `pengantaran.show` sesi asal), dan mendaftarkan 6 route `/pengantaran*` di `routes/web.php` (`/pengantaran/item/*` sebelum `/pengantaran/{pengantaran}` dengan `whereNumber`).
  - Menulis dan menjalankan TDD unit & feature test (`tests/Unit/PengantaranServiceTest.php`, `tests/Feature/PengantaranOperationTest.php`, dan `tests/Unit/DecimalMoneyTest.php`) mencakup seluruh `AC-P3-01` s.d. `AC-P3-05`, proteksi N+1 (`<= 18` queries), `SqlLike`, `403`/`404`/`422`, serta kepatuhan larangan menyentuh `resources/js/`, `resources/css/`, `Archive/`, maupun file eksklusif `P3-03`.
- **File Dibuat / Diubah:**
  - `app/Support/DecimalMoney.php` — Helper `formatRupiah()` berbasis integer cents
  - `app/Services/SerahTerimaService.php` — Single source of truth `cekHakBayarAkhir(Transaksi $transaksi): array` (`KK-06`)
  - `app/Services/PengantaranService.php` — Domain service pengantaran multi-pelanggan, state machine item, `syncStatusPengantaran()`, `jadwalkanUlang()` (`KK-07`), & query helper bebas N+1
  - `app/Services/TransaksiService.php` — Eager-load `itemPengantaran` & field `TransaksiDetailPhase3Additions`
  - `app/Policies/Concerns/ChecksPengantarRole.php`, `app/Policies/PengantaranPolicy.php`, `app/Providers/AppServiceProvider.php` — Otorisasi peran `PETUGAS` & kepemilikan kurir `PENGANTAR`
  - `app/Http/Requests/Concerns/AuthorizesPengantarRequest.php`, `app/Http/Requests/Pengantaran/{StorePengantaranRequest,UpdateItemPengantaranStatusRequest,JadwalkanUlangRequest}.php` — Validasi & normalisasi payload
  - `app/Http/Controllers/PengantaranController.php`, `routes/web.php` — Endpoint `pengantaran.{index,store,show,mulai,item.status,item.jadwalkan-ulang}`
  - `tests/Unit/{DecimalMoneyTest,PengantaranServiceTest}.php`, `tests/Feature/PengantaranOperationTest.php` — Unit & feature test `AC-P3-01`..`AC-P3-05`
  - `MEMORY.md`, `WRITE.md` — Update `[x] P3-02` dan Entry `#018`
- **Verifikasi / Bukti Uji:**
  - `./vendor/bin/pint --test` -> `{"tool":"pint","result":"passed"}` (`exit code 0`)
  - `npx tsc --noEmit` -> `0 errors` (`exit code 0`)
  - `npm run build` -> Vite production build (`674 modules transformed`, `public/build/manifest.json`, `built in 1.92s`) (`exit code 0`)
  - `php artisan test` -> `95 passed (3105 assertions)` pada MySQL 8.4 port `3307` (`cleanwash_testing`), termasuk `PengantaranServiceTest` & `PengantaranOperationTest` (`exit code 0`)
  - `php artisan migrate --no-interaction && php artisan migrate:rollback --no-interaction && php artisan migrate --seed --no-interaction` -> 18 migrasi rollback & re-migrate + `CleanWashSeeder` bersih (`exit code 0`)
  - `php artisan route:list --except-vendor` -> `Showing [38] routes` termasuk 6 route `/pengantaran*`; audit hygiene (`dd`/`dump`/`var_dump`/`bcmath`/`(float)`/`floatval`) -> `HYGIENE_CLEAN`.
- **Keputusan / Blocker / Catatan Napkin:**
  - Pada `PengantaranSummary`, `item_selesai_count` menghitung item yang sudah berstatus terminal (`DITERIMA` atau `GAGAL`) pada sesi tersebut sehingga `item_selesai_count === total_item` saat `Pengantaran` berstatus `SELESAI`, sedangkan `item_gagal_count` menghitung item `GAGAL` secara terpisah.
  - `PengantaranOperationTest.php` memakai `$this->withoutVite()` dan `shouldExist: false` sementara pada `Pengantaran/Index` dan `Pengantaran/Show` (`// Temporary shouldExist: false until P3-04 creates Pengantaran UI`); wajib dibersihkan pada `P3-05` setelah `P3-04` membuat komponen TSX-nya.
  - Tidak ada blocker.
- **Next Exact Action:**
  1. Lakukan cross-agent review & Squash Merge `feature/p3-02-pengantaran-service` ke `main` sesuai `napkin/PR_REVIEW_LIFECYCLE.md`.
  2. Delegasikan **`P3-03`** ke `cw-backend-dev` pada branch `feature/p3-03-settlement-handover-audit` dari `main` untuk mengimplementasikan `PembayaranService::catatPelunasan()` + `updateStatusLunas()`, melengkapi `SerahTerimaService` (`ambilPakaian`, `serahkanPakaian` `KK-06` + penutupan item `MENUNGGU -> GAGAL` via `PengantaranService::syncStatusPengantaran()`), `AuditLogService`, `DashboardController` KPI Phase 3, `SerahTerimaController`/`PembayaranController`/`AuditController`, serta TDD tests (`AC-P3-06`..`AC-P3-09`).




