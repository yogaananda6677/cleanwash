# Phase 2 Closing Gate Evidence & Sign-Off — CleanWash

| Field | Value |
| --- | --- |
| **Phase** | Phase 2 — Operasional Produksi, Penimbangan Ulang, Penyesuaian & Kompensasi Insiden |
| **Work Packages** | `P2-01` s.d. `P2-06` |
| **Branch Reviewed** | `feature/p2-06-wiring-gate` |
| **Target Merge** | `main` (Squash & Merge) |
| **SRS Scope** | `UC-10`, `UC-11`, `UC-12`, `UC-13`, `KK-01`, `KK-02`, `KK-04`, `KK-05`, `KK-08`, `KK-09` (*Activity 2*, *Sequence 2 & 3*, *Class Diagram*) |
| **Sign-Off Status** | `APPROVED` / `DONE` |
| **Approved Date** | 2026-11-10 |
| **Reviewers** | `product-manager` (Adversarial AC & SRS Audit) + Primary Agent (Execution & Merge Gate) |

---

## 1. Ringkasan Penyelesaian Work Package Phase 2

| Work Package | PIC | Deliverable Utama | Referensi Log |
| --- | --- | --- | --- |
| `P2-01` | `product-manager` + Primary Agent | Kunci aturan selisih ubah layanan, biaya pembatalan pasca pencucian, formula kompensasi (`5×`/`10×`), pelepasan `nomor_voucher`, & `AC-P2-01`..`AC-P2-12` ([PHASE_2_CONTRACTS.md](file:///home/yoga/Data/Kuliah/Sistem%20Informasi/docs/phases/PHASE_2_CONTRACTS.md)) | `WRITE.md` `#010` |
| `P2-02` | `cw-backend-dev` | `DecimalMoney::percentage()` & `prorateAndMultiply()`, `PembayaranService`, `ProduksiService` (`timbangUlang` `KK-01`+`KK-09`, state machine dinamis sesuai `TahapLayanan`), `ProduksiPolicy`, `ProduksiController`, + unit/feature tests | `WRITE.md` `#011` |
| `P2-03` | `cw-backend-dev` | `TransaksiAdjustmentService` (`ubahLayanan` `KK-02` & `batalkanTransaksi` `KK-08`), `VoucherService::lepaskan()`, `TransaksiService` options & audit logs, `TransaksiAdjustmentController`, + unit/feature tests | `WRITE.md` `#012` |
| `P2-04` | `cw-backend-dev` | `KompensasiService` (`estimateCompensation`, `hitungKompensasi`, 2-mode `laporInsiden`, `konfirmasiKompensasi`, anti-double-counting `potongKompensasi`), `LaporanKerusakanPolicy`, `InsidenController`, + unit/feature tests | `WRITE.md` `#013` |
| `P2-05` | `cw-frontend-dev` | Sinkronisasi `types/index.ts`, `lib/format.ts`, `Modal.tsx` (`<dialog>`), `StatusBadge.tsx`, `LaporkanInsidenModal.tsx`, `KonfirmasiKompensasiModal.tsx`, `AppLayout.tsx`, `Produksi/Index.tsx`, `Insiden/Index.tsx`, `Transaksi/Show.tsx` | `WRITE.md` `#014` |
| `P2-06` | `cw-fullstack-dev` + `product-manager` | `ProduksiService::getPegawaiDashboardMetrics()`, `DashboardController` (`Asia/Jakarta` + KPI lintas aktor), filter `status_transaksi`, `Dashboard/Index.tsx`, `Transaksi/{Index,Nota}.tsx`, hapus `shouldExist: false`, `Phase2EndToEndTest.php` tanpa `withoutVite()`, audit 6 Gerbang & sign-off | `WRITE.md` `#015`, `#016` |

---

## 2. Matriks Verifikasi Acceptance Criteria (`AC-P2-01` s.d. `AC-P2-12`)

| ID | Kriteria | Bukti Implementasi & Test Terverifikasi | Hasil |
| --- | --- | --- | --- |
| **`AC-P2-01`** | RBAC Produksi (`PEGAWAI`) & paginasi antrean tanpa N+1 query (`<= 18` query); lintas peran `403` | `routes/web.php` (`role:PEGAWAI`), `ProduksiPolicy.php`, `AppServiceProvider.php`, `ProduksiController.php`, `ProduksiService::{paginateQueue,getStageCounts}`; `tests/Feature/ProduksiOperationTest.php`, `InsidenTest.php`, `Phase2EndToEndTest.php` | `PASS` |
| **`AC-P2-02`** | Progres `RiwayatStatusProduksi` berurutan sesuai `TahapLayanan` (`perlu_setrika` true/false), simpan `id_pegawai` & waktu WIB, auto-`SELESAI` | `ProduksiService::ubahStatusProduksi()`, `TransaksiService::resolveOrderedTahapStages()`, `UpdateStatusProduksiRequest.php`; `tests/Unit/ProduksiServiceTest.php`, `tests/Feature/ProduksiOperationTest.php`, `Phase2EndToEndTest.php` | `PASS` |
| **`AC-P2-03`** | Tolak `422` lompat/ulang/mundur tahap, kirim `DISETRIKA` pada `perlu_setrika = false`, atau transaksi non-`AKTIF` | `ProduksiService::ubahStatusProduksi()`; `tests/Unit/ProduksiServiceTest.php`, `tests/Feature/ProduksiOperationTest.php`, `Phase2EndToEndTest.php` | `PASS` |
| **`AC-P2-04`** | **KK-01** & **KK-09**: `timbangUlang` memperbarui berat, menghitung ulang pakai `harga_satuan_snapshot`, kurangi voucher & kompensasi, audit log | `ProduksiService::timbangUlang()`, `TimbangUlangRequest.php`, `DecimalMoney`; `tests/Unit/ProduksiServiceTest.php`, `tests/Feature/ProduksiOperationTest.php`, `Phase2EndToEndTest.php` | `PASS` |
| **`AC-P2-05`** | **KK-01**: Turunkan `LUNAS -> BELUM_LUNAS` bila tagihan baru > dibayar, naikkan `DP -> LUNAS` bila <= dibayar; tolak `422` `JUMLAH` / pasca `DITERIMA` | `PembayaranService::resolveStatusPembayaranSetelahPenyesuaian()`, `ProduksiService::timbangUlang()`; `tests/Unit/ProduksiServiceTest.php`, `tests/Feature/ProduksiOperationTest.php`, `Phase2EndToEndTest.php` | `PASS` |
| **`AC-P2-06`** | **KK-02** & **KK-09**: `ubahLayanan` di `DITERIMA`/`DICUCI`, snapshot tarif baru, wajib kuantitas baru saat `BERAT <-> JUMLAH`, tolak `DIKERINGKAN`+ (`422`) | `TransaksiAdjustmentService::ubahLayanan()`, `TransaksiService::validateQuantityForLayanan()`, `UbahLayananRequest.php`, `TransaksiPolicy::ubahLayanan()`, `TransaksiAdjustmentController`; `TransaksiAdjustmentServiceTest.php`, `TransaksiAdjustmentTest.php`, `Phase2EndToEndTest.php` | `PASS` |
| **`AC-P2-07`** | **KK-08**: Batal di `DITERIMA` gratis (`0.00`), lepas voucher atomik (`nomor_voucher = null`, `TERSEDIA`/`KEDALUWARSA`) & siap pakai ulang | `TransaksiAdjustmentService::batalkanTransaksi()`, `VoucherService::lepaskan()`; `TransaksiAdjustmentServiceTest.php`, `TransaksiAdjustmentTest.php`, `Phase2EndToEndTest.php` | `PASS` |
| **`AC-P2-08`** | **KK-08**: Batal setelah cuci tolak `0.00` (`422`), default `50%` subtotal (`<= subtotal`), pertahankan `SUDAH_DIGUNAKAN`, tolak terminal states | `TransaksiAdjustmentService::batalkanTransaksi()`, `BatalkanTransaksiRequest.php`; `TransaksiAdjustmentServiceTest.php`, `TransaksiAdjustmentTest.php`, `Phase2EndToEndTest.php` | `PASS` |
| **`AC-P2-09`** | **KK-04** & **KK-05**: Lapor insiden `PEGAWAI` (`MENUNGGU_KONFIRMASI`) & `PETUGAS` (langsung konfirmasi); wajib `id_detail` milik nota & status `AKTIF`/`SELESAI` | `KompensasiService::laporInsiden()`, `StoreInsidenRequest.php`, `LaporanKerusakanPolicy.php`, `InsidenController.php`; `KompensasiServiceTest.php`, `InsidenTest.php`, `Phase2EndToEndTest.php` | `PASS` |
| **`AC-P2-10`** | **KK-04** & **KK-05**: Formula `5×`/`10×` integer cents, konfirmasi khusus `PETUGAS` (`PEGAWAI` `403`), status `LUNAS` saat sisa `'0.00'`, & anti-double-counting `kelebihan_ganti_rugi` | `KompensasiService::{estimateCompensation,hitungKompensasi,konfirmasiKompensasi,potongKompensasi}`, `DecimalMoney::prorateAndMultiply()`, `KonfirmasiKompensasiRequest.php`; `DecimalMoneyTest.php`, `KompensasiServiceTest.php`, `InsidenTest.php`, `Phase2EndToEndTest.php` | `PASS` |
| **`AC-P2-11`** | UI Phase 2 (`Produksi/Index`, `Insiden/Index`, `Transaksi/Show`, `AppLayout`, `StatusBadge`) sinkron TS strict; tanpa tombol `DISETRIKA` bila `!perlu_setrika` | `resources/js/types/index.ts`, `lib/format.ts`, `Components/{Modal,StatusBadge,LaporkanInsidenModal,KonfirmasiKompensasiModal}.tsx`, `AppLayout.tsx`, `Pages/Produksi/Index.tsx`, `Pages/Insiden/Index.tsx`, `Pages/Transaksi/Show.tsx`; `npx tsc --noEmit` (`0`), `npm run build` (`0`), `0` `shouldExist: false` | `PASS` |
| **`AC-P2-12`** | `DashboardController` tanggal WIB `Asia/Jakarta` + KPI lintas aktor, `Transaksi/{Index,Nota}` rincian insiden/batal, & `Phase2EndToEndTest` tanpa `withoutVite()` | `DashboardController.php`, `ProduksiService::getPegawaiDashboardMetrics()`, `TransaksiService::paginate()`, `TransaksiController::index()`, `Dashboard/Index.tsx`, `Transaksi/{Index,Nota}.tsx`; `tests/Feature/Phase2EndToEndTest.php` | `PASS` |

---

## 3. Verifikasi 6 Gerbang Kualitas (`napkin/PR_REVIEW_LIFECYCLE.md`)

| Gerbang | Standar Verifikasi | Status |
| --- | --- | --- |
| **Gerbang 1: Static & Hygiene** | `./vendor/bin/pint --test` (`passed`), `npx tsc --noEmit` (`0` errors, `strict: true`), `0` `console.log`/`: any` di `resources/js/`, `0` `dd`/`dump`/`var_dump`/`bcmath`/`(float)` di `app/` & `routes/` | `PASS` |
| **Gerbang 2: Automated Test Gate** | `php artisan test` -> `84 passed (2722 assertions)`, `0` skipped, `0` `shouldExist: false`, `npm run build` (`674 modules transformed`, `public/build/manifest.json`), `Phase1EndToEndTest` & `Phase2EndToEndTest` tanpa `$this->withoutVite()` | `PASS` |
| **Gerbang 3: Security & RBAC** | Middleware `role:...` aktif, Policy `ProduksiPolicy`, `TransaksiPolicy`, & `LaporanKerusakanPolicy` terdaftar di `AppServiceProvider`, FormRequest & `DB::transaction()` + `lockForUpdate()` aktif, `PEGAWAI` ditolak `403` pada konfirmasi kompensasi, `PENGANTAR` ditolak `403` pada `/produksi*` & `/insiden*` | `PASS` |
| **Gerbang 4: DB, Contract & SRS Sync** | `migrate:rollback && migrate --seed` (18 migrasi rollback & re-migrate + `CleanWashSeeder`) lulus, nominal `DECIMAL(12,2)` & integer cents, query `ProduksiService` aman MySQL 8.4 `ONLY_FULL_GROUP_BY`, `<= 18` query tanpa N+1, TS strict §3.3 sinkron 100% | `PASS` |
| **Gerbang 5: Mandatory Write `.md`** | `WRITE.md` mutakhir (`#010`–`#016`), `MEMORY.md` mencatat Phase 2 `DONE` & siap Phase 3 (`NOT_STARTED`), `.claude/napkin.md` mutakhir | `PASS` |
| **Gerbang 6: Cross-Agent & Merge Gate** | Audit adversarial silang oleh `product-manager` (`APPROVED`) + verifikasi lengkap & Squash Merge oleh Primary Agent ke `main` | `PASS` |

---

## 4. Catatan Tindak Lanjut Non-Blocking untuk Phase 3

1. Penyederhanaan tampilan `basisCents` pada [LaporkanInsidenModal.tsx](file:///home/yoga/Data/Kuliah/Sistem%20Informasi/resources/js/Components/LaporkanInsidenModal.tsx#L406-L410) menggunakan `centsToDecimalString(compensationPreview.basisCents)` agar seragam dengan `@/lib/format` (non-blocking, murni preview UI).
2. Saat membangun `PengantaranService` (`P3-02`) dan `SerahTerimaService` (`P3-03`), pastikan transaksi berstatus `DIBATALKAN` dikecualikan dari jadwal pengantaran, sisa tagihan membaca angka final pasca penyesuaian (`total_kompensasi` & `biaya_pembatalan`), serta pelunasan mendukung nota `BELUM_LUNAS` akibat `KK-01`/`KK-02`.
