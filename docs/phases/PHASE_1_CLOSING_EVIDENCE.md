# Phase 1 Closing Gate Evidence & Sign-Off — CleanWash

| Field | Value |
| --- | --- |
| **Phase** | Phase 1 — Fondasi Sistem, Master Data & Penerimaan Transaksi (DP & Voucher) |
| **Work Packages** | `P1-01` s.d. `P1-07` |
| **Branch Reviewed** | `feature/p1-07-nota-gate` |
| **Target Merge** | `main` (Squash & Merge) |
| **SRS Scope** | `UC-01` (bagian DP), `UC-03`, `UC-04`, `UC-05`, `UC-06`, `UC-07`, `UC-08`, `UC-09`, `KK-03`, `KK-09`, *Activity 1*, *Sequence 1*, *Class Diagram* |
| **Sign-Off Status** | `APPROVED` / `DONE` |
| **Approved Date** | 2026-11-10 |
| **Reviewers** | `product-manager` (Adversarial AC & SRS Audit) + Primary Agent (Execution & Merge Gate) |

---

## 1. Ringkasan Penyelesaian Work Package Phase 1

| Work Package | PIC | Deliverable Utama | Referensi Log |
| --- | --- | --- | --- |
| `P1-01` | `product-manager` + Primary Agent | Breakdown backlog, skema 16 tabel, kontrak TS/FormRequest, `AC-P1-01`..`AC-P1-12` (`docs/phases/PHASE_1_CONTRACTS.md`) | `WRITE.md` `#002` |
| `P1-02` | `cw-fullstack-dev` | Laravel 12, MySQL 8.4 terisolasi port `3307`, `App\Support\DecimalMoney`, Inertia React TS strict, Pint, CI | `WRITE.md` `#003` |
| `P1-03` | `cw-backend-dev` | 18 file migrasi (16 tabel domain `DECIMAL(12,2)`), 12 Enum, 16 Model, `CleanWashSeeder`, Auth & RBAC `EnsureUserHasRole` | `WRITE.md` `#004` |
| `P1-04` | `cw-backend-dev` | CRUD `Pelanggan`, `JenisLayanan` + `TahapLayanan`, `Voucher`, `POST /voucher/validate`, Policies & Feature tests | `WRITE.md` `#005` |
| `P1-05` | `cw-backend-dev` | `TransaksiService`, `VoucherService::validasiDanKunci()` (`FOR UPDATE`), `PembayaranService`, snapshot `KK-09`, audit log, concurrency & reception tests | `WRITE.md` `#006` |
| `P1-06` | `cw-frontend-dev` | `AppLayout` per peran, `Auth/Login`, `Dashboard/Index`, Master CRUD UI, `Transaksi/{Index,Create,Show}` + integer-cents preview & Axios XSRF | `WRITE.md` `#007` |
| `P1-07` | `cw-fullstack-dev` + `product-manager` | `Transaksi/Nota.tsx` (`@media print`), hapus `shouldExist: false`, `Phase1EndToEndTest.php` tanpa `withoutVite()`, update `.github/workflows/ci.yml`, audit 6 Gerbang & sign-off | `WRITE.md` `#008`, `#009` |

---

## 2. Matriks Verifikasi Acceptance Criteria (`AC-P1-01` s.d. `AC-P1-12`)

| ID | Kriteria | Bukti Implementasi & Test Terverifikasi | Hasil |
| --- | --- | --- | --- |
| `AC-P1-01` | Laravel 12 + Inertia React TS tanpa `pdo_sqlite`/`bcmath`, MySQL `8.4` port `3307`, Pint/TSC/Test/Build lulus | `composer.json`, `package.json`, `tsconfig.json`, `docker-compose.yml`, `phpunit.xml`, `.github/workflows/ci.yml`, `app/Support/DecimalMoney.php`; `tests/Unit/DecimalMoneyTest.php`, `tests/Feature/ExampleTest.php` | `PASS` |
| `AC-P1-02` | 16 tabel Phase 1–3 migrasi & rollback bersih di MySQL `3307`; seluruh nominal uang `DECIMAL(12,2)` | `database/migrations/0001_01_01_000000_create_users_table.php` & `2026_11_10_000001..000015`; `tests/Unit/DomainSchemaRelationsTest.php`, `CleanWashSeeder.php` | `PASS` |
| `AC-P1-03` | Auth & RBAC (`PETUGAS` \| `PEGAWAI` \| `PENGANTAR`); akun nonaktif ditolak; non-`PETUGAS` `403` | `LoginRequest.php`, `AuthController.php`, `DashboardController.php`, `HandleInertiaRequests.php`, `EnsureUserHasRole.php`, `routes/web.php`, `Login.tsx`, `AppLayout.tsx`, `Dashboard/Index.tsx`; `AuthAndRbacTest.php` & RBAC tests di `Master*`/`TransaksiReceptionTest`/`Phase1EndToEndTest` | `PASS` |
| `AC-P1-04` | CRUD `Pelanggan` + `boleh_bayar_akhir`, tolak duplikat `no_telepon` (`422`) & tolak hapus jika bertransaksi | `PelangganService.php`, `PelangganController.php`, `PelangganPolicy.php`, `Base/Store/UpdatePelangganRequest.php`, `Pelanggan/Index.tsx`; `MasterPelangganTest.php` | `PASS` |
| `AC-P1-05` | CRUD `JenisLayanan` (`BERAT<->kg`, `JUMLAH<->pcs`) & `TahapLayanan` (`perlu_setrika=false` tanpa `DISETRIKA`) | `JenisLayananService.php`, `JenisLayananController.php`, `JenisLayananPolicy.php`, `Base/Store/UpdateJenisLayananRequest.php`, `Layanan/Index.tsx`; `MasterJenisLayananTest.php`, `Phase1EndToEndTest.php` | `PASS` |
| `AC-P1-06` | CRUD `Voucher` + proteksi ubah/hapus voucher `SUDAH_DIGUNAKAN` | `Voucher.php` (`effective_status`), `VoucherService.php`, `VoucherController.php`, `VoucherPolicy.php`, `Store/UpdateVoucherRequest.php`, `Voucher/Index.tsx`; `MasterVoucherTest.php` | `PASS` |
| `AC-P1-07` | `POST /transaksi`: nota unik `CW-YYYYMMDD-XXXX`, `DetailPakaian` `min:1`, integer `JUMLAH`, `DITERIMA`, `audit_logs` | `TransaksiService.php`, `StoreTransaksiRequest.php`, `TransaksiPolicy.php`, `TransaksiController.php`, `Transaksi/{Index,Create,Show}.tsx`; `TransaksiReceptionTest.php`, `VoucherAtomicLockTest.php` | `PASS` |
| `AC-P1-08` | **KK-09**: `harga_satuan_snapshot` imun terhadap perubahan tarif master `JenisLayanan` | `TransaksiService::buatTransaksi()` & `formatTransaksiDetail()`, `Show.tsx`, `Nota.tsx`; `TransaksiReceptionTest::test_kk09_updating_master_layanan_price_does_not_alter_existing_transaksi_snapshot_or_totals`, `Phase1EndToEndTest.php` | `PASS` |
| `AC-P1-09` | **KK-03**: Penolakan `422` `NOT_FOUND` / `EXPIRED` / `ALREADY_USED` di `/voucher/validate` & `/transaksi` | `VoucherService::cekValiditasPreview()` & `detectInvalidVoucher()`, `ValidateVoucherRequest.php`, `Create.tsx` + `bootstrap.ts`; `MasterVoucherTest.php`, `VoucherAtomicLockTest.php`, `TransaksiReceptionTest.php`, `Phase1EndToEndTest.php` | `PASS` |
| `AC-P1-10` | **KK-03**: Klaim voucher atomik `DB::transaction()` + `lockForUpdate()`, hanya 1 transaksi lolos pada race condition | `VoucherService::validasiDanKunci()`, `TransaksiService::buatTransaksi()`, `UNIQUE(nomor_voucher)` di `transaksi`; `VoucherAtomicLockTest.php`, `VoucherConcurrencyTest.php` (MySQL `FOR UPDATE` timeout 1205 & dual-process race) | `PASS` |
| `AC-P1-11` | `UC-01` (DP): Status `BELUM_BAYAR`, `DP`, `LUNAS` (`nominal_dp == total_harga` atau `total == 0`), tolak overpay `422` | `PembayaranService.php`; `VoucherAtomicLockTest.php`, `TransaksiReceptionTest.php::test_dp_payment_status_rules_for_belum_bayar_dp_lunas_and_overpay_rejection` | `PASS` |
| `AC-P1-12` | Halaman cetak `GET /transaksi/{nota}/nota` (`@media print`) sinkron penuh dengan MySQL 8.4 & manifest Vite nyata | `TransaksiController::nota()`, `resources/js/Pages/Transaksi/Nota.tsx`, `resources/css/app.css`, `public/build/manifest.json`; `TransaksiReceptionTest.php`, `Phase1EndToEndTest.php` | `PASS` |

---

## 3. Verifikasi 6 Gerbang Kualitas (`napkin/PR_REVIEW_LIFECYCLE.md`)

| Gerbang | Standar Verifikasi | Status |
| --- | --- | --- |
| **Gerbang 1: Static & Hygiene** | `./vendor/bin/pint --test`, `npx tsc --noEmit` (`strict: true`), 0 `console.log`, 0 `dd/dump/var_dump`, 0 `bcmath`/`(float)` di `app/` | `PASS` |
| **Gerbang 2: Automated Test Gate** | `php artisan test` -> `54 passed (1435 assertions)`, 0 skipped, 0 `shouldExist: false`, `npm run build` lulus (`public/build/manifest.json`) | `PASS` |
| **Gerbang 3: Security & RBAC** | Route terproteksi `auth` + `role:PETUGAS`, 4 Policy terdaftar di `AppServiceProvider`, 16 Model `$fillable` eksplisit, FormRequest aktif, 0 secret di Git | `PASS` |
| **Gerbang 4: DB, Contract & SRS Sync** | 18 migrasi & `migrate:rollback` bersih di MySQL 8.4 (`3307`), tipe TS `resources/js/types/index.ts` sinkron 100% dengan `PHASE_1_CONTRACTS.md` & `PRD.md` | `PASS` |
| **Gerbang 5: Mandatory Write `.md`** | `WRITE.md` Entry `#002`–`#009`, `MEMORY.md` status Phase 1 `DONE` & Phase 2 `NOT_STARTED`, `.claude/napkin.md` mutakhir | `PASS` |
| **Gerbang 6: Cross-Agent & Merge Gate** | Review silang oleh `product-manager` (`APPROVED`) + eksekusi Squash & Merge oleh Primary Agent ke `main` | `PASS` |

---

## 4. Catatan Tindak Lanjut Non-Blocking untuk Phase 2

1. Seragamkan pemanggilan `now()->toDateString()` pada `DashboardController.php` baris 36 menjadi `now('Asia/Jakarta')->toDateString()` saat pengayaan statistik produksi di Phase 2 agar eksplisit seperti `VoucherService`.
2. Pertahankan seluruh kontrak nominal uang dalam format `string` fixed 2 desimal (`DECIMAL(12,2)`) pada backend & Inertia props agar `parseDecimalToCents()` di frontend selalu melalui jalur integer parser tanpa konversi `number`.
