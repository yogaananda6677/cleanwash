# CleanWash — Laundry Management System

<p align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/washing-machine.svg" width="80" height="80" alt="CleanWash Logo" />
</p>

<p align="center">
  <strong>Sistem Informasi Manajemen Laundry Berbasis Web (Laravel 12 + Inertia React TS + MySQL 8.4)</strong><br />
  Diimplementasikan secara ketat berdasarkan Software Requirements Specification (SRS) & PRD (14 Use Cases & 9 Kondisi Khusus).
</p>

<p align="center">
  <a href="https://github.com/yogaananda6677/cleanwash/actions"><img src="https://img.shields.io/badge/PHP-8.2+-777BB4?logo=php&logoColor=white" alt="PHP 8.2+"></a>
  <a href="https://laravel.com"><img src="https://img.shields.io/badge/Laravel-12.x-FF2D20?logo=laravel&logoColor=white" alt="Laravel 12"></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=black" alt="React 19"></a>
  <a href="https://inertiajs.com"><img src="https://img.shields.io/badge/Inertia.js-2.x-9553E9?logo=inertia&logoColor=white" alt="Inertia.js"></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" alt="TypeScript"></a>
  <a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/Tailwind_CSS-3.x-38B2AC?logo=tailwind-css&logoColor=white" alt="Tailwind CSS"></a>
  <a href="https://www.mysql.com"><img src="https://img.shields.io/badge/MySQL-8.4_LTS-4479A1?logo=mysql&logoColor=white" alt="MySQL 8.4"></a>
  <a href="https://pestphp.com"><img src="https://img.shields.io/badge/Pest_PHP-114_Passed_(4156_assertions)-10B981" alt="Pest Tests"></a>
  <a href="https://playwright.dev"><img src="https://img.shields.io/badge/Playwright-6%2F6_E2E_Passed-2EAD33?logo=playwright&logoColor=white" alt="Playwright E2E"></a>
</p>

---

## 📌 Ringkasan Sistem

**CleanWash** adalah sistem informasi operasional binatu modern (*laundry management system*) yang mencakup seluruh siklus bisnis binatu: mulai dari loket kasir penerimaan pakaian, alur produksi dinamis di lantai kerja, manajemen penimbangan ulang & insiden ganti rugi, hingga pengantaran rute multi-pelanggan dan pelunasan akhir.

Sistem dirancang dengan arsitektur **Domain Service Layer**, presisi finansial desimal `DECIMAL(12,2)` tanpa floating-point error, kepatuhan WCAG AA, dan antarmuka *Crisp Laundry-Tech Atelier* dengan font lokal Plus Jakarta Sans & JetBrains Mono.

---

## 🎯 Cakupan SRS & Fitur Unggulan

### 1. Kepatuhan 14 Use Cases (SRS)
- **`UC-01` Pencatatan Pembayaran:** Pembayaran Uang Muka (DP) & Pelunasan Akhir di loket maupun kurir.
- **`UC-02` Penyerahan Pakaian:** Validasi hak serah terima di loket dengan verifikasi lunas/piutang.
- **`UC-03` Pengelolaan Data Pelanggan:** CRUD pelanggan lengkap dengan hak kredit `boleh_bayar_akhir`.
- **`UC-04` Pengelolaan Jenis Layanan:** Pengaturan tarif dasar (kg / pcs) dan integrasi tahapan kerja.
- **`UC-05` Pengelolaan Tahap Layanan:** Konfigurasi urutan proses (`DITERIMA`, `DICUCI`, `DIKERINGKAN`, `DISETRIKA`, `SELESAI`) serta flag `perlu_setrika`.
- **`UC-06` Pengelolaan Data Voucher:** Kode promo unik, kuota klaim, masa berlaku, dan potongan desimal.
- **`UC-07` Penerimaan Pakaian:** Pencatatan multi-item `DetailPakaian`, pilihan layanan, dan auto-generate nomor nota resmi (`CW-YYYYMMDD-XXXX`).
- **`UC-08` Penggunaan Voucher:** Validasi diskon langsung dengan penguncian atomik transaksi.
- **`UC-09` Cetak Nota:** Cetak nota resmi A4 dengan rincian biaya, status DP, QR/kode nota, dan tanda tangan kasir.
- **`UC-10` Pembatalan & Perubahan Layanan:** Pembatalan berbayar pasca cuci / gratis sebelum cuci dan pengalihan jenis layanan dinamis.
- **`UC-11` Pembaruan Status Produksi:** Papan kerja produksi pegawai dengan validasi tahapan berurutan.
- **`UC-12` Penimbangan Ulang:** Koreksi berat aktual kotor vs bersih di lantai produksi.
- **`UC-13` Pencatatan Kerusakan/Kehilangan:** Pelaporan insiden per item pakaian (`RUSAK`/`HILANG`) dan kalkulasi ganti rugi presisi.
- **`UC-14` Pengantaran Pakaian:** Manajemen sesi kurir rute multi-pelanggan dan penjadwalan ulang otomatis bila gagal antar.

### 2. Kepatuhan 9 Kondisi Khusus (KK)
| Kode | Deskripsi Kondisi Khusus | Implementasi Teknis |
| :--- | :--- | :--- |
| **`KK-01`** | **Penimbangan Ulang & Tagihan Naik:** Jika berat bertambah saat penimbangan ulang, total tagihan naik dan status pembayaran `LUNAS` otomatis turun kembali ke `BELUM_LUNAS`. | `ProduksiService::timbangUlang()` + rekalkulasi `status_pembayaran`. |
| **`KK-02`** | **Perubahan Layanan Fleksibel:** Layanan dapat diubah sebelum tahap pencucian selesai, menyesuaikan tarif snapshot dan selisih tagihan. | `ProduksiService::ubahLayanan()` + validasi batas tahap. |
| **`KK-03`** | **Pencegahan Voucher Dobel / Kedaluwarsa:** Voucher yang sudah dipakai atau kedaluwarsa ditolak secara atomik dengan pesan jelas. | `VoucherService::validasiDanKlaimVoucher()` dengan DB `lockForUpdate`. |
| **`KK-04`** | **Kompensasi Kerusakan Pakaian:** Insiden rusak memotong tagihan nota secara presisi berdasarkan formula estimasi ganti rugi. | `KompensasiService::catatInsiden()` tipe `RUSAK`. |
| **`KK-05`** | **Kompensasi Kehilangan Pakaian:** Insiden hilang memotong sisa tagihan atau mencatat piutang ganti rugi bersih bagi pelanggan. | `KompensasiService::catatInsiden()` tipe `HILANG`. |
| **`KK-06`** | **Hak Ambil Pelanggan Paylater (`boleh_bayar_akhir`):** Pelanggan reguler wajib lunas sebelum pakaian diserahkan; pelanggan berhak paylater dapat menerima pakaian dengan pencatatan piutang. | `SerahTerimaService::cekHakAmbil()` + filter audit piutang. |
| **`KK-07`** | **Penjadwalan Ulang Kurir Terisolasi:** Gagal antar pada salah satu pelanggan dapat dijadwalkan ulang tanpa memengaruhi pelanggan lain dalam sesi kurir yang sama. | `PengantaranService::jadwalkanUlangItem()` per `ItemPengantaran`. |
| **`KK-08`** | **Biaya Pembatalan Berbasis Tahap:** Batal pada tahap `DITERIMA` bebas biaya (0%); batal setelah masuk tahap `DICUCI` dikenakan biaya operasional sesuai kebijakan. | `ProduksiService::batalkanTransaksi()` dengan tarif dinamis. |
| **`KK-09`** | **Snapshot Harga Atomik:** Perubahan tarif master layanan di masa depan tidak akan pernah mengubah total nota transaksi yang telah dibuat. | `harga_satuan_snapshot` tersimpan permanen di `Transaksi`. |

---

## 👥 Multi-Role Workspace

Aplikasi memisahkan alur kerja menjadi 3 peran staf dengan hak akses terisolasi (Laravel Policies & Middleware):

1. **`PETUGAS` (Kasir / Front Office):**
   - Penerimaan laundry baru, input multi-item pakaian, pengecekan kupon live, input DP, cetak nota resmi A4.
   - Serah terima loket & audit piutang pelanggan berhak bayar akhir (`boleh_bayar_akhir`).
   - Penjadwalan sesi kurir pengantaran multi-pelanggan.
   - Manajemen master pelanggan, jenis layanan, tahapan layanan, dan voucher promo.
2. **`PEGAWAI` (Lantai Produksi):**
   - Papan antrean kerja produksi (*kanban-style step progression*).
   - Eksekusi tahapan kerja berurutan (otomatis melewati tahap setrika untuk layanan seperti Cuci Sepatu / Cuci Kering Lipat).
   - Penimbangan ulang berat pakaian aktual (`KK-01`).
   - Pelaporan kerusakan atau kehilangan pakaian per item pakaian spesifik (`KK-04`, `KK-05`).
3. **`PENGANTAR` (Kurir Pengantaran):**
   - Daftar rute pengantaran harian aktif (dioptimalkan untuk mobile viewport `390×844`).
   - Verifikasi serah terima di lokasi pelanggan & pelunasan tunai kurir.
   - Pencatatan gagal antar dengan alasan wajib + auto reschedule (`KK-07`).

---

## 🏗️ Arsitektur & Teknologi

```
├── app/
│   ├── Enums/            # RoleUser, StatusTransaksi, StatusPembayaran, TahapProduksi, StatusPengantaran, dll.
│   ├── Http/
│   │   ├── Controllers/  # TransaksiController, ProduksiController, PengantaranController, SerahTerimaController, dll.
│   │   ├── Middleware/   # EnsureUserHasRole, InertiaHandleRequests, SetLocale
│   │   └── Requests/     # FormRequest tervalidasi ketat per Use Case
│   ├── Models/           # 16 Eloquent Models (DECIMAL(12,2) casts, strictly guarded)
│   ├── Policies/         # Otorisasi granular berbasis peran
│   └── Services/         # TransaksiService, ProduksiService, VoucherService, KompensasiService, PengantaranService
├── database/
│   ├── migrations/       # 18 skema migrasi MySQL 8.4 (reversibel via migrate:rollback)
│   └── seeders/          # DatabaseSeeder, RoleUserSeeder, MasterLayananSeeder, VoucherSeeder, TransaksiSeeder
├── docs/
│   ├── design/           # DESIGN_SYSTEM.md & PAGE_BLUEPRINTS.md
│   ├── phases/           # PHASE_1..3_CONTRACTS.md & CLOSING_EVIDENCE.md
│   └── qa/               # QA_REGRESSION_REPORT.md & 28 live browser screenshots
├── resources/
│   ├── js/
│   │   ├── Components/   # AppLayout, UI Kit (Button, Badge, Modal, FormInput, Table, Tabs)
│   │   ├── Pages/        # Auth, Dashboard, Pelanggan, Layanan, Voucher, Transaksi, Produksi, Pengantaran, SerahTerima, Audit
│   │   └── types/        # TypeScript Definitions sinkron dengan model backend
└── tests/
    ├── Feature/          # 114 Pest/PHPUnit tests (KK-01..KK-09, Policy, Services, Edge Cases)
    └── e2e/              # 6 Playwright Live Browser Regression Suites (REG-00..REG-05)
```

---

## 🚀 Panduan Instalasi & Menjalankan Aplikasi

### Prasyarat
- **PHP** >= 8.2 (ekstensi `pdo_mysql`, `mbstring`, `bcmath`, `curl`)
- **Composer** >= 2.x
- **Node.js** >= 20.x & **npm**
- **Docker** & **Docker Compose** (untuk MySQL 8.4)

### Langkah 1: Clone Repository
```bash
git clone https://github.com/yogaananda6677/cleanwash.git
cd cleanwash
```

### Langkah 2: Konfigurasi Environment
```bash
cp .env.example .env
php artisan key:generate
```

Pastikan konfigurasi database di `.env` mengarah ke container MySQL:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3307
DB_DATABASE=cleanwash
DB_USERNAME=cleanwash
DB_PASSWORD=cleanwash_secret
```

### Langkah 3: Jalankan Database Docker
```bash
docker compose up -d
```

### Langkah 4: Install Dependensi Backend & Frontend
```bash
composer install
npm install
```

### Langkah 5: Migrasi Database & Seeding Data Awal
```bash
php artisan migrate:fresh --seed
```

### Langkah 6: Kompilasi Aset & Jalankan Web Server
```bash
# Terminal 1: Build aset frontend
npm run build

# Terminal 2: Jalankan web server Laravel
php artisan serve
```
Akses aplikasi melalui browser di **`http://127.0.0.1:8000`**.

---

## 🔑 Akun Uji Coba Default (Seeder)

Seluruh akun default menggunakan kata sandi: **`password`**

| Peran Staf | Email Login | Hak Akses Utama |
| :--- | :--- | :--- |
| **Petugas (Kasir)** | `petugas@cleanwash.test` | Loket Kasir, Transaksi Baru, Nota A4, Master Data, Sesi Kurir, Serah Terima Loket, Audit |
| **Pegawai (Produksi)** | `pegawai@cleanwash.test` | Papan Antrean Produksi, Timbang Ulang, Lapor Insiden Rusak/Hilang |
| **Petugas Pengantaran** | `kurir@cleanwash.test` | Rute Kurir Harian, Pelunasan Lapangan, Penjadwalan Ulang Gagal Antar |

---

## 🧪 Pengujian Otomatis & Quality Gates

Sistem memiliki cakupan pengujian otomatis berstandar enterprise:

### 1. PHP Code Style (Laravel Pint)
```bash
./vendor/bin/pint --test
```

### 2. TypeScript Static Typecheck
```bash
npx tsc --noEmit
```

### 3. Backend Unit & Feature Test Suite (Pest / PHPUnit)
```bash
php artisan test
```
*Hasil:* **`114 passed (4156 assertions)`** tanpa error atau regresi.

### 4. Live Browser End-to-End Regression Suite (Playwright)
```bash
npx playwright test --reporter=list
```
*Hasil:* **`6 passed (REG-00 s.d. REG-05)`** terhadap server live `http://127.0.0.1:8000` (termasuk verifikasi 0 `console.error`, responsivitas mobile `390×844`, dan regenerasi 28 screenshot bukti di `docs/qa/screenshots/`).

---

## 🤖 Tim Subagent Multi-Role (Agents Lifecycle)

Proyek ini dirancang dan dibangun dengan orkestrasi 6 Subagent independen:
- **`product-manager`**: Penjaga integritas SRS/PRD, kontrak data Phase 1–3, dan *Phase Closing Gate*.
- **`ui-ux-designer`**: Perancang sistem visual *Crisp Laundry-Tech Atelier*, ergonomi multi-peran, dan kepatuhan WCAG AA.
- **`backend-developer`**: Pengembang migrasi MySQL 8.4, Eloquent Models, Domain Services, Policies, dan test unit.
- **`frontend-developer`**: Pengembang komponen Inertia React, TypeScript contracts, Tailwind CSS, dan form interaktif.
- **`fullstack-developer`**: Integrator end-to-end BE-FE, cetak nota A4, router, dan root-cause debugger.
- **`qa-engineer`**: Otomasi pengujian peramban live Playwright, penangkapan screenshot bukti langkah, dan triage defek.

---

## 📄 Lisensi

Sistem Informasi CleanWash dirilis di bawah lisensi [MIT License](LICENSE).
