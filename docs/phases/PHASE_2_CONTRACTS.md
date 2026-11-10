# Phase 2 Contracts, Business Rules & Acceptance Criteria — CleanWash

| Field | Value |
| --- | --- |
| **Task ID** | `P2-01` |
| **Phase** | Phase 2 — Operasional Produksi, Penimbangan Ulang, Penyesuaian & Kompensasi Insiden |
| **SRS Scope** | `UC-10`, `UC-11`, `UC-12`, `UC-13`, `KK-01`, `KK-02`, `KK-04`, `KK-05`, `KK-08`, `KK-09` (preservasi), *Activity 2*, *Sequence 2 & 3*, *Class Diagram* |
| **Database Baseline** | 16 tabel domain MySQL 8.4 terisolasi port `3307` (sudah bermigrasi penuh di Phase 1 — **tidak memerlukan migrasi tabel baru**) |
| **Arithmetic Guardrail** | Integer-scaled decimal cents (`App\Support\DecimalMoney`, skala `100`), **tanpa `float`** dan **tanpa `ext-bcmath`** |
| **Status** | Locked Baseline for `P2-02` s.d. `P2-06` |

---

## 1. Breakdown Work Package `P2-01` s.d. `P2-06` & Urutan Ketergantungan

### 1.1 Graf Ketergantungan

`P2-01 (PM)` $\rightarrow$ `P2-02 (BE)` $\rightarrow$ `P2-03 (BE)` $\rightarrow$ `P2-04 (BE)` $\rightarrow$ `P2-06 (FS + PM)`  
*(Catatan: `P2-05 (FE)` dapat mulai paralel setelah `P2-02` & `P2-03` di-merge berdasarkan kontrak TypeScript §3 pada dokumen ini, lalu terintegrasi penuh dengan `P2-04` sebelum `P2-06` mengeksekusi E2E dan Phase 2 Gate.)*

### 1.2 Rincian Atomik Per Work Package

1. **`P2-01` (`product-manager`) — Rules, Financial Formulas, Contracts & AC (`docs/p2-01-rules-contracts`)**
   - Mengunci aturan operasional, state machine, formula `App\Support\DecimalMoney`, pelepasan voucher `UNIQUE(nomor_voucher)`, formula anti-double-counting `kelebihan_ganti_rugi`, kontrak route/FormRequest/TypeScript, serta `AC-P2-01`..`AC-P2-12`.
2. **`P2-02` (`backend-developer`) — `ProduksiService` (`timbangUlang` & State Machine `RiwayatStatusProduksi`) (`feature/p2-02-produksi-service`)**
   - Perbarui `TransaksiService::detailRelations()` & `formatTransaksiDetail()` (eager-load `riwayatStatusProduksi.pegawai`, `laporanKerusakanKehilangan`, serta properti turunan Phase 2 tanpa merusak kontrak Phase 1).
   - Implementasi `ProduksiService` (`paginateQueue`, `getStageCounts`, `timbangUlang`, `ubahStatusProduksi`) dengan `DB::transaction()` + `lockForUpdate()`, `ProduksiPolicy` (`role:PEGAWAI`), `TimbangUlangRequest`, `UpdateStatusProduksiRequest`, dan `ProduksiController` (`GET /produksi`, `POST /produksi/{nota}/timbang-ulang`, `POST /produksi/{nota}/status`).
   - TDD unit & feature tests untuk `AC-P2-01` s.d. `AC-P2-05` (`KK-01`, `KK-09`, `UC-11`, `UC-12`).
3. **`P2-03` (`backend-developer`) — Perubahan Layanan (`KK-02`) & Pembatalan Transaksi (`KK-08`) (`feature/p2-03-ubah-batal`)**
   - Tambahkan helper integer-safe `DecimalMoney::percentage()` dan `DecimalMoney::prorateAndMultiply()` (+ unit tests di `DecimalMoneyTest.php`).
   - Implementasi `TransaksiAdjustmentService` (`ubahLayanan`, `batalkanTransaksi`) dalam `DB::transaction()` + `lockForUpdate()` (termasuk lock & pelepasan atomik `Voucher` saat batal di `DITERIMA` dengan mengosongkan `transaksi.nomor_voucher = null`), `UbahLayananRequest`, `BatalkanTransaksiRequest`, pembaruan `TransaksiPolicy`, dan `TransaksiAdjustmentController` (`POST /transaksi/{nota}/ubah-layanan`, `POST /transaksi/{nota}/batalkan`).
   - Perbarui `TransaksiController::show()` agar mengirim `layananOptions` dan `auditLogs`.
   - TDD unit & feature tests untuk `AC-P2-06` s.d. `AC-P2-08` (`UC-10`, `KK-02`, `KK-08`, `KK-09`).
4. **`P2-04` (`backend-developer`) — `KompensasiService` & Laporan Insiden (`KK-04`, `KK-05`, `UC-13`) (`feature/p2-04-kompensasi`)**
   - Implementasi `KompensasiService` (`paginate`, `getEligibleTransaksiOptions`, `hitungKompensasi`, `buatLaporan`, `konfirmasiKompensasi`, `potongKompensasi`), `LaporanKerusakanPolicy`, `StoreInsidenRequest`, `KonfirmasiKompensasiRequest`, dan `InsidenController` (`GET /insiden`, `POST /insiden`, `POST /transaksi/{nota}/insiden`, `POST /insiden/{laporan}/konfirmasi`).
   - TDD unit & feature tests untuk `AC-P2-09` & `AC-P2-10` (termasuk multi-insiden pada satu nota tanpa double-counting `kelebihan_ganti_rugi`, otorisasi `PEGAWAI` vs `PETUGAS`, dan `id_detail` silang nota).
5. **`P2-05` (`frontend-developer`) — UI Produksi, Insiden & Penyesuaian Nota (`feature/p2-05-frontend-ui`)**
   - Perbarui `resources/js/types/index.ts`, `resources/js/lib/format.ts` (preview `50%` batal & estimasi kompensasi integer-cents), `resources/js/Components/StatusBadge.tsx`, dan `resources/js/Layouts/AppLayout.tsx` (aktifkan navigasi `/produksi` & `/insiden` untuk `PEGAWAI`, tambahkan `/insiden` untuk `PETUGAS`).
   - Bangun `resources/js/Pages/Produksi/Index.tsx` (filter tahap/search, tombol transisi tahap dinamis tanpa `DISETRIKA` untuk `perlu_setrika = false`, modal Timbang Ulang khusus layanan `BERAT` di tahap `DITERIMA`, modal Ajukan Laporan Insiden per `DetailPakaian`).
   - Bangun `resources/js/Pages/Insiden/Index.tsx` (daftar insiden, filter status konfirmasi & jenis insiden, form ajukan laporan, modal Konfirmasi & Potong Kompensasi khusus `PETUGAS` dengan preview hasil `hitungKompensasi()`).
   - Perbarui `resources/js/Pages/Transaksi/Show.tsx` (modal `Ubah Layanan` dengan input kuantitas wajib saat `BERAT <-> JUMLAH`, modal `Batalkan Transaksi` menampilkan gratis vs biaya proses berjalan `50%`, kartu daftar `Laporan Insiden & Kompensasi` + tombol konfirmasi, serta `Jejak Audit Transaksi`).
6. **`P2-06` (`fullstack-developer` + `product-manager`) — Cross-Actor Wiring, Dashboard WIB & Phase 2 Gate (`feature/p2-06-wiring-gate`)**
   - Perbarui `DashboardController.php` (seragamkan `now('Asia/Jakarta')->toDateString()` pada `Voucher::whereDate('masa_berlaku', '>=', ...)` serta tambahkan KPI lintas aktor Phase 2 untuk `PETUGAS` & `PEGAWAI`) dan `Dashboard/Index.tsx` (hilangkan banner *Roadmap Phase 2* untuk `PEGAWAI`, tambahkan quick action & metrik produksi/insiden).
   - Perbarui `Transaksi/Index.tsx` (filter opsional `status_transaksi` & indikator badge insiden/batal) dan `Transaksi/Nota.tsx` (tampilkan tabel ringkas `Laporan Insiden`, `Total Kelebihan Ganti Rugi` / `Total Pengembalian Tunai`, nama `Pegawai` pelaksana tahap produksi, serta keterangan penyesuaian untuk nota `DIBATALKAN`).
   - Tulis `tests/Feature/Phase2EndToEndTest.php` **tanpa** `$this->withoutVite()` (menguji penuh alur lintas aktor + `public/build/manifest.json` nyata).
   - Jalankan seluruh 6 Gerbang Kualitas (`napkin/PR_REVIEW_LIFECYCLE.md`), susun `docs/phases/PHASE_2_CLOSING_EVIDENCE.md`, perbarui `MEMORY.md` & `WRITE.md`, dan eksekusi Phase 2 Closing Gate Sign-off.

---

## 2. Aturan Bisnis Eksak, State Machine & Formula Finansial

### 2.0 Helper Aritmatika Integer (`App\Support\DecimalMoney`) & Invarian Keuangan Global

Seluruh kalkulasi uang dan kuantitas **wajib** memakai `App\Support\DecimalMoney` berbasis integer skala `100` (sen). Dilarang keras memakai `float`/`double` maupun `bcmath`.

#### A. Tambahan Method Wajib pada `App\Support\DecimalMoney` (`P2-03` / `P2-04`)
1. `percentage(string $amount, int $percent): string`
   - Validasi `$percent >= 0`.
   - `$amountCents = self::toCents($amount);`
   - Pembulatan *half-up* integer:
     - `$negative = $amountCents < 0;`
     - `$abs = abs($amountCents);`
     - Guard overflow sebelum perkalian `$abs * $percent`.
     - `$result = intdiv(($abs * $percent) + 50, 100);`
     - Kembalikan `self::toDecimalString($negative ? -$result : $result)`.
2. `prorateAndMultiply(string $amount, int $numerator, int $denominator, int $multiplier): string`
   - Guard `$denominator > 0`, `$numerator >= 0`, `$multiplier >= 0` (lempar `InvalidArgumentException` jika tidak terpenuhi).
   - `$amountCents = self::toCents($amount);`
   - Basis per bagian (pembulatan *half-up*):
     - `$halfDenom = intdiv($denominator, 2);`
     - `$basisCents = intdiv(($amountCents * $numerator) + $halfDenom, $denominator);`
   - Kalikan `$basisCents * $multiplier` (dengan overflow guard) $\rightarrow$ `self::toDecimalString(...)`.

#### B. Rumus Tagihan Master & Saldo Turunan `Transaksi`
- **`subtotal_layanan`**:
  $$\text{subtotal\_layanan} = \text{DecimalMoney::multiplyQuantity}(\text{berat\_atau\_jumlah},\ \text{harga\_satuan\_snapshot})$$
- **`tagihan_dasar`** (basis tagihan sebelum pemotongan kompensasi):
  - Jika `status_transaksi !== DIBATALKAN`:
    $$\text{tagihan\_dasar} = \max\left(0.00,\ \text{subtotal\_layanan} - \text{nilai\_voucher\_snapshot}\right)$$
  - Jika `status_transaksi === DIBATALKAN`:
    $$\text{tagihan\_dasar} = \text{biaya\_pembatalan}$$
    *(Catatan: Untuk batal di `DITERIMA`, `biaya_pembatalan = 0.00` dan voucher dilepas sehingga `nilai_voucher_snapshot = 0.00`. Untuk batal setelah `DICUCI`, voucher tidak mengurangi penalti `biaya_pembatalan` agar `KK-08` "menolak pembatalan gratis" tidak dapat ditembus oleh voucher.)*
- **`total_harga`** (persisted di kolom `transaksi.total_harga`):
  $$\text{total\_harga} = \max\left(0.00,\ \text{tagihan\_dasar} - \text{total\_kompensasi}\right)$$
- **`total_dibayar`** (agregat seluruh record `pembayaran` nota):
  $$\text{total\_dibayar} = \sum \text{pembayaran.nominal\_bayar}$$
- **`sisa_tagihan`** (saldo yang masih harus dibayar pelanggan):
  $$\text{sisa\_tagihan} = \max\left(0.00,\ \text{total\_harga} - \text{total\_dibayar}\right)$$
- **`kelebihan_bayar_tunai`** (kelebihan pembayaran DP/pelunasan akibat `timbangUlang` turun, `ubahLayanan` lebih murah, atau `batalkanTransaksi`, **di luar** komponen kelebihan ganti rugi insiden):
  $$\text{kelebihan\_bayar\_tunai} = \max\left(0.00,\ \text{total\_dibayar} - \text{tagihan\_dasar}\right)$$
- **`total_kelebihan_ganti_rugi`** (total dana kompensasi tunai yang harus dibayarkan ke pelanggan karena kompensasi melebihi sisa tagihan):
  $$\text{total\_kelebihan\_ganti\_rugi} = \sum \text{laporan\_kerusakan\_kehilangan.kelebihan\_ganti\_rugi}$$
- **`total_pengembalian_pelanggan`** (total kas yang wajib dikembalikan toko ke pelanggan):
  $$\text{total\_pengembalian\_pelanggan} = \text{kelebihan\_bayar\_tunai} + \text{total\_kelebihan\_ganti\_rugi}$$

#### C. Fungsi Resolusi `status_pembayaran` Terpadu (`resolveStatusPembayaranSetelahPenyesuaian`)
Dipakai secara seragam oleh `timbangUlang()`, `ubahLayanan()`, `batalkanTransaksi()`, dan `potongKompensasi()`:
```text
function resolveStatusPembayaran(currentStatus, totalHargaBaru, totalDibayar):
  if DecimalMoney::lte(totalHargaBaru, totalDibayar):
      return StatusPembayaran::LUNAS          // sisa_tagihan == 0.00
  if DecimalMoney::eq(totalDibayar, '0.00'):
      return StatusPembayaran::BELUM_BAYAR    // belum ada uang masuk & tagihan > 0
  if currentStatus in [StatusPembayaran::LUNAS, StatusPembayaran::BELUM_LUNAS]:
      return StatusPembayaran::BELUM_LUNAS    // KK-01 / KK-02: pernah LUNAS lalu tagihan naik
  return StatusPembayaran::DP                 // masih dalam skema DP & tagihan > totalDibayar
```

---

### 2.1 Penimbangan Ulang (`KK-01`, `UC-12` — `ProduksiService::timbangUlang`)

1. **Aktor Berwenang:** Hanya `PEGAWAI` aktif (memiliki record `pegawai`). `PETUGAS` dan `PENGANTAR` ditolak HTTP `403`.
2. **Aturan Pra-Kondisi (`422` bila dilanggar):**
   - Lock row `Transaksi` (`lockForUpdate()`) beserta `layanan` dan `riwayatStatusProduksi`.
   - `Transaksi.status_transaksi` wajib `AKTIF` (ditolak `422` jika `SELESAI`, `DIAMBIL`, atau `DIBATALKAN`).
   - `Transaksi.layanan.metode_hitung` wajib `BERAT` (`kg`). Layanan `JUMLAH` (`pcs`) ditolak `422`: *"Penimbangan ulang hanya berlaku untuk layanan dengan metode hitung BERAT (kg)."*
   - Tahap produksi terakhir pada `riwayat_status_produksi` (urut `waktu_update DESC, id_status_produksi DESC`) **wajib `DITERIMA`** (sebelum proses pencucian dimulai, selaras *Activity 2* & *Sequence 2* SRS). Apabila tahap sudah mencapai `DICUCI`, `DIKERINGKAN`, `DISETRIKA`, atau `SELESAI`, tolak `422`.
3. **Validasi Input:**
   - `berat_aktual`: `required`, `numeric`, `gt:0`, `max:99999.99`, `decimal:0,2`.
   - `catatan`: `nullable`, `string`, `max:500`.
4. **Kalkulasi & Mutasi Atomik (`DB::transaction()`):**
   - Pertahankan `transaksi.harga_satuan_snapshot` (`KK-09` tidak berubah walau tarif master `JenisLayanan` sudah diubah!).
   - `subtotal_baru = DecimalMoney::multiplyQuantity($beratAktual, $transaksi->harga_satuan_snapshot)`
   - `total_harga_baru = DecimalMoney::maxZero(DecimalMoney::subtract(DecimalMoney::subtract($subtotal_baru, $transaksi->nilai_voucher_snapshot), $transaksi->total_kompensasi))`
   - Hitung `total_dibayar` dari tabel `pembayaran`.
   - `status_pembayaran_baru = resolveStatusPembayaran($transaksi->status_pembayaran, $total_harga_baru, $total_dibayar)`.
   - Update `transaksi` (`berat_atau_jumlah = $beratAktual`, `total_harga = $total_harga_baru`, `status_pembayaran = $status_pembayaran_baru`).
   - Simpan `AuditLog` (`action = 'TIMBANG_ULANG'`, `actor_role = 'PEGAWAI'`, `subject_type = Transaksi::class`, `subject_id = nomor_nota`, mencatat `payload_before` & `payload_after` termasuk `weight_changed: bool` dan `catatan`).

---

### 2.2 State Machine `RiwayatStatusProduksi` (`UC-11`, `FR-06` — `ProduksiService::ubahStatusProduksi`)

1. **Aktor Berwenang:** Hanya `PEGAWAI` aktif (`id_pegawai` wajib tersedia). `PETUGAS` dan `PENGANTAR` ditolak HTTP `403`.
2. **Aturan Pra-Kondisi & Validasi Transisi (`422` bila dilanggar):**
   - Lock row `Transaksi` (`lockForUpdate()`).
   - `Transaksi.status_transaksi` wajib `AKTIF` (ditolak `422` bila `SELESAI`, `DIAMBIL`, atau `DIBATALKAN`).
   - Ambil daftar `TahapLayanan` milik `Transaksi.layanan` diurutkan berdasarkan `urutan ASC`:
     - Layanan `perlu_setrika = true`: `['DITERIMA', 'DICUCI', 'DIKERINGKAN', 'DISETRIKA', 'SELESAI']`.
     - Layanan `perlu_setrika = false` (mis. Cuci Sepatu): `['DITERIMA', 'DICUCI', 'DIKERINGKAN', 'SELESAI']`.
   - **Larangan Mutlak `DISETRIKA`:** Jika `! $transaksi->layanan->perlu_setrika && $targetTahap === TahapProduksi::DISETRIKA`, tolak `422`.
   - Pastikan `$targetTahap` terdapat dalam `TahapLayanan` layanan transaksi (`422` bila tidak ada).
   - Ambil tahap produksi terakhir (`tahap_sekarang`) dari `riwayat_status_produksi`. Cari `$currentIndex` dan `$targetIndex` pada koleksi `TahapLayanan` terurut:
     - Jika `$targetIndex <= $currentIndex`: tolak `422` (*"Tahap produksi tidak dapat diulang atau dimundurkan."*).
     - Jika `$targetIndex !== $currentIndex + 1`: tolak `422` (*"Transisi tahap produksi wajib berurutan; tahap berikutnya yang sah adalah [{$expectedNext}]."*).
3. **Mutasi Atomik (`DB::transaction()`):**
   - Buat baris `RiwayatStatusProduksi` dengan `id_pegawai = $pegawai->id_pegawai` (non-null), `tahap_status = $targetTahap`, `waktu_update = now('Asia/Jakarta')`, `catatan`.
   - Jika `$targetTahap === TahapProduksi::SELESAI`: update `transaksi.status_transaksi = StatusTransaksi::SELESAI`.
   - Catat `AuditLog` (`action = 'PRODUKSI_STATUS_UPDATED'`, `actor_role = 'PEGAWAI'`).

---

### 2.3 Perubahan Layanan (`KK-02`, `UC-10` — `TransaksiAdjustmentService::ubahLayanan`)

1. **Aktor Berwenang:** Hanya `PETUGAS` aktif (`id_petugas` wajib ada). `PEGAWAI` dan `PENGANTAR` ditolak HTTP `403`.
2. **Aturan Batas Tahap Produksi (`KK-02`) — Diizinkan vs Ditolak:**
   - Lock row `Transaksi` (`lockForUpdate()`).
   - **Diizinkan HANYA jika:** `status_transaksi === StatusTransaksi::AKTIF` **DAN** tahap produksi terakhir adalah **`DITERIMA` atau `DICUCI`** (belum memasuki `DIKERINGKAN`, `DISETRIKA`, maupun `SELESAI`).
   - **Ditolak `422`** apabila `status_transaksi !== AKTIF` atau tahap produksi terakhir sudah `DIKERINGKAN`, `DISETRIKA`, atau `SELESAI`.
3. **Aturan Layanan Tujuan & Konversi `BERAT <-> JUMLAH`:**
   - `id_layanan_baru`: wajib ada di `jenis_layanan`, `is_active === true` (`422` jika nonaktif), dan `id_layanan_baru !== transaksi.id_layanan` (`422` jika sama).
   - Pastikan tahap produksi terakhir transaksi saat ini juga ada dalam daftar `TahapLayanan` layanan tujuan (`422` bila layanan kustom tujuan tidak memiliki tahap berjalan saat ini).
   - Jika `layananBaru->metode_hitung !== layananLama->metode_hitung` (`BERAT <-> JUMLAH`): `berat_atau_jumlah_baru` **WAJIB dikirim** dalam request (`422` jika kosong/null).
   - Validasi bilangan bulat `>= 1` bila tujuan `JUMLAH` (`pcs`), atau desimal `> 0` bila tujuan `BERAT` (`kg`).
   - `alasan_perubahan`: `required|string|min:3|max:500`.
4. **Snapshot Tarif Baru & Rekalkulasi Finansial (`DB::transaction()`):**
   - Salin tarif berlaku layanan tujuan ke `harga_satuan_snapshot = $layananBaru->harga_satuan` (`KK-09` untuk layanan baru tetap terjaga).
   - Hitung `subtotal_baru`, `total_harga_baru = max(0, subtotal_baru - nilai_voucher_snapshot - total_kompensasi)`, `selisih_tagihan`, dan `status_pembayaran_baru = resolveStatusPembayaran(...)`.
   - Update `transaksi` & catat `AuditLog` (`action = 'LAYANAN_CHANGED'`, `actor_role = 'PETUGAS'`).

---

### 2.4 Pembatalan Transaksi (`KK-08`, `UC-10` — `TransaksiAdjustmentService::batalkanTransaksi`)

1. **Aktor Berwenang:** Hanya `PETUGAS` aktif. `PEGAWAI` dan `PENGANTAR` ditolak HTTP `403`.
2. **Aturan Berdasarkan `RiwayatStatusProduksi` Terakhir:**
   - Lock row `Transaksi` (`lockForUpdate()`).
   - **Ditolak `422`** bila `status_transaksi` berada pada `[SELESAI, DIAMBIL, DIBATALKAN]` atau tahap produksi terakhir adalah `SELESAI`.
   - `alasan_pembatalan`: `required|string|min:3|max:500`.

   #### Cabang A — Tahap Terakhir Masih `DITERIMA` (Sebelum Pencucian Dimulai $\rightarrow$ Batal Penuh)
   - Tolak `422` jika `biaya_pembatalan` dikirim `> 0.00`.
   - Tetapkan `biaya_pembatalan = '0.00'`, `total_harga = '0.00'`, `status_transaksi = DIBATALKAN`, `status_pembayaran = resolveStatusPembayaran(..., '0.00', $totalDibayar)`.
   - **Pelepasan Voucher Atomik (`UNIQUE(nomor_voucher)` Safe):**
     - Jika `$transaksi->nomor_voucher !== null`: lock `Voucher` via `lockForUpdate()`, kembalikan ke `TERSEDIA` bila `masa_berlaku >= today('Asia/Jakarta')` atau `KEDALUWARSA` bila lewat, reset `digunakan_pada = null`, dan set `transaksi.nomor_voucher = null`, `transaksi.nilai_voucher_snapshot = '0.00'` agar voucher bisa dipakai lagi tanpa melanggar constraint `UNIQUE(nomor_voucher)`.

   #### Cabang B — Tahap Terakhir `DICUCI`, `DIKERINGKAN`, atau `DISETRIKA` (Setelah Pencucian Dimulai)
   - Pembatalan gratis **ditolak** (`KK-08`):
     - Default biaya proses berjalan = **`50%` dari `subtotal_layanan`** (`DecimalMoney::percentage($subtotalLayanan, 50)`).
     - Override input `biaya_pembatalan` wajib memenuhi `'0.00' < biaya_pembatalan <= subtotal_layanan` bila `subtotal_layanan > '0.00'` (`422` bila `<= 0` atau `> subtotal_layanan`).
   - Voucher **tetap `SUDAH_DIGUNAKAN`** dan `transaksi.nomor_voucher` **tetap tertaut**.
   - `total_harga_baru = DecimalMoney::maxZero(DecimalMoney::subtract($biayaPembatalan, $transaksi->total_kompensasi))`.
   - `status_pembayaran_baru = resolveStatusPembayaran(...)`, `status_transaksi = DIBATALKAN`, dan catat `AuditLog` (`action = 'TRANSAKSI_CANCELLED'`, `actor_role = 'PETUGAS'`).

---

### 2.5 Laporan Kerusakan/Kehilangan & Kompensasi (`KK-04`, `KK-05`, `UC-13` — `KompensasiService`)

1. **Otorisasi Lintas Aktor (Selaras *Sequence 3* & *PRD §4*):**
   - `PEGAWAI` dan `PETUGAS` berhak melihat daftar insiden (`GET /insiden`) dan mengajukan laporan insiden (`POST /insiden`, `POST /transaksi/{nota}/insiden`).
   - **HANYA `PETUGAS`** yang berhak mengonfirmasi & mengeksekusi pemotongan kompensasi (`POST /insiden/{laporan}/konfirmasi`). `PEGAWAI` dan `PENGANTAR` ditolak HTTP **`403`**.
   - `PENGANTAR` ditolak HTTP **`403`** pada seluruh endpoint `/insiden*`.
2. **Validasi Kepemilikan `DetailPakaian` & Status Transaksi (`422` bila melanggar):**
   - `Transaksi.status_transaksi` wajib `AKTIF` atau `SELESAI` (`422` jika `DIAMBIL` atau `DIBATALKAN`).
   - `id_detail` wajib ada di `detail_pakaian` **DAN** `detailPakaian.nomor_nota === transaksi.nomor_nota`.
   - `jenis_insiden`: `RUSAK` | `HILANG`; `keterangan`: `required|string|min:5|max:1000`.
3. **Alur 2-Mode Tanpa Migrasi Baru (`id_petugas` null vs non-null):**
   - `id_petugas === null` $\rightarrow$ `MENUNGGU_KONFIRMASI` (diajukan `PEGAWAI`, saldo transaksi belum dipotong).
   - `id_petugas !== null` $\rightarrow$ `TERKONFIRMASI` (dikonfirmasi & dipotong oleh `PETUGAS`).
   - **Mode 1 (`PEGAWAI` melapor):** `id_pegawai_pelapor = $pegawai->id_pegawai`, `id_petugas = null`, `nilai_kompensasi = '0.00'`, `kelebihan_ganti_rugi = '0.00'`, `AuditLog(INSIDEN_REPORTED)`.
   - **Mode 2 (`PETUGAS` melapor langsung):** langsung hitung (`hitungKompensasi()` jika tidak di-override) + jalankan `potongKompensasi()`, `AuditLog(INSIDEN_REPORTED & KOMPENSASI_CONFIRMED)`.
   - **Mode 3 (`PETUGAS` mengonfirmasi laporan `PEGAWAI`):** tolak `422` bila `id_petugas !== null`; gunakan estimasi `hitungKompensasi()` bila `nilai_kompensasi` null atau nominal tervalidasi `> 0.00`, jalankan `potongKompensasi()`, isi `id_petugas`, `nilai_kompensasi`, `kelebihan_ganti_rugi`, dan `AuditLog(KOMPENSASI_CONFIRMED)`.
4. **Formula Deterministik `hitungKompensasi(Transaksi $transaksi, DetailPakaian $detail, JenisInsiden $jenisInsiden): string`:**
   - `$subtotalLayanan = DecimalMoney::multiplyQuantity($transaksi->berat_atau_jumlah, $transaksi->harga_satuan_snapshot)`.
   - `$totalPotongNota = max(1, (int) $transaksi->detailPakaian->sum('jumlah_potong'))`.
   - `basisCents = max(100, DecimalMoney::toCents(DecimalMoney::prorateAndMultiply($subtotalLayanan, (int) $detail->jumlah_potong, $totalPotongNota, 1)))`.
   - **`RUSAK` (`KK-04`)**: `5 × basisCents`; **`HILANG` (`KK-05`)**: `10 × basisCents`.
5. **Mekanisme `potongKompensasi()` Anti-Double-Counting:**
   - `$sisaTagihanSebelum = DecimalMoney::maxZero(DecimalMoney::subtract($transaksi->total_harga, $totalDibayar))`.
   - `kelebihan_ganti_rugi_k = max(0.00, nilai_kompensasi_k - sisa_tagihan_sebelum)`.
   - `$totalKompensasiBaru = DecimalMoney::add($transaksi->total_kompensasi, $nilaiKompensasi)`.
   - `$tagihanDasar = DecimalMoney::maxZero(DecimalMoney::subtract($subtotalLayanan, $transaksi->nilai_voucher_snapshot))`.
   - `$totalHargaBaru = DecimalMoney::maxZero(DecimalMoney::subtract($tagihanDasar, $totalKompensasiBaru))`.
   - `$statusPembayaranBaru = resolveStatusPembayaran($transaksi->status_pembayaran, $totalHargaBaru, $totalDibayar)`.

---

## 3. Kontrak Route, FormRequest & Tipe TypeScript / Inertia Props Phase 2

### 3.1 Kontrak Route & Middleware

| Area | Method & URI | Route Name | Middleware | Controller & Action |
| --- | --- | --- | --- | --- |
| Produksi | `GET /produksi` | `produksi.index` | `auth`, `role:PEGAWAI` | `ProduksiController@index` |
| Timbang Ulang | `POST /produksi/{nota}/timbang-ulang` | `produksi.timbang-ulang` | `auth`, `role:PEGAWAI` | `ProduksiController@timbangUlang` |
| Status Produksi | `POST /produksi/{nota}/status` | `produksi.status` | `auth`, `role:PEGAWAI` | `ProduksiController@ubahStatus` |
| Ubah Layanan | `POST /transaksi/{nota}/ubah-layanan` | `transaksi.ubah-layanan` | `auth`, `role:PETUGAS` | `TransaksiAdjustmentController@ubahLayanan` |
| Batal Transaksi | `POST /transaksi/{nota}/batalkan` | `transaksi.batalkan` | `auth`, `role:PETUGAS` | `TransaksiAdjustmentController@batalkan` |
| Daftar Insiden | `GET /insiden` | `insiden.index` | `auth`, `role:PETUGAS,PEGAWAI` | `InsidenController@index` |
| Ajukan Insiden | `POST /insiden` | `insiden.store` | `auth`, `role:PETUGAS,PEGAWAI` | `InsidenController@store` |
| Ajukan per Nota | `POST /transaksi/{nota}/insiden` | `transaksi.insiden.store` | `auth`, `role:PETUGAS,PEGAWAI` | `InsidenController@storeForTransaksi` |
| Konfirmasi Kompensasi | `POST /insiden/{laporan}/konfirmasi` | `insiden.konfirmasi` | `auth`, `role:PETUGAS` | `InsidenController@konfirmasi` |

*(Semua mutasi state mengembalikan `RedirectResponse` dengan flash `success` atau `422` + `flash.error` + `errors` melalui helper `executeWithFlashRedirect()` agar kompatibel untuk Inertia & JSON test.)*

### 3.2 Kontrak Validasi FormRequest

1. **`TimbangUlangRequest`** *(Otorisasi: aktif `PEGAWAI`)* — `berat_aktual` (`required|numeric|gt:0|max:99999.99|decimal:0,2`), `catatan` (`nullable|string|max:500`).
2. **`UpdateStatusProduksiRequest`** *(Otorisasi: aktif `PEGAWAI`)* — `tahap_status` (`required|string|in:DITERIMA,DICUCI,DIKERINGKAN,DISETRIKA,SELESAI`), `catatan` (`nullable|string|max:500`).
3. **`UbahLayananRequest`** *(Otorisasi: aktif `PETUGAS`)* — `id_layanan_baru` (`required|integer|exists:jenis_layanan,id_layanan`), `berat_atau_jumlah_baru` (`nullable|numeric|gt:0|max:99999.99|decimal:0,2`), `alasan_perubahan` (`required|string|min:3|max:500`).
4. **`BatalkanTransaksiRequest`** *(Otorisasi: aktif `PETUGAS`)* — `alasan_pembatalan` (`required|string|min:3|max:500`), `biaya_pembatalan` (`nullable|numeric|gte:0|max:999999999.99|decimal:0,2`).
5. **`StoreInsidenRequest`** *(Otorisasi: aktif `PETUGAS` atau `PEGAWAI`)* — `nomor_nota` (`required|string|exists:transaksi,nomor_nota`), `id_detail` (`required|integer|exists:detail_pakaian,id_detail`), `jenis_insiden` (`required|string|in:RUSAK,HILANG`), `keterangan` (`required|string|min:5|max:1000`), `nilai_kompensasi` (`nullable|numeric|gt:0|max:999999999.99|decimal:0,2`), `id_pegawai_pelapor` (`nullable|integer|exists:pegawai,id_pegawai`).
6. **`KonfirmasiKompensasiRequest`** *(Otorisasi: aktif `PETUGAS`)* — `nilai_kompensasi` (`nullable|numeric|gt:0|max:999999999.99|decimal:0,2`), `keterangan_konfirmasi` (`nullable|string|max:500`).

### 3.3 Kontrak TypeScript Strict (`resources/js/types/index.ts`)

```ts
export type JenisInsiden = 'RUSAK' | 'HILANG';
export type StatusKonfirmasiInsiden = 'MENUNGGU_KONFIRMASI' | 'TERKONFIRMASI';

export interface RiwayatStatusProduksiItem {
    id_status_produksi: number;
    nomor_nota: string;
    id_pegawai: number | null;
    tahap_status: TahapProduksiCode;
    waktu_update: string;
    catatan: string | null;
    pegawai?: {
        id_pegawai: number;
        nama_pegawai: string;
    } | null;
}

export interface LaporanInsidenItem {
    id_laporan: number;
    nomor_nota: string;
    id_detail: number;
    id_petugas: number | null;
    id_pegawai_pelapor: number | null;
    jenis_insiden: JenisInsiden;
    keterangan: string;
    nilai_kompensasi: string;
    kelebihan_ganti_rugi: string;
    estimasi_kompensasi: string;
    status_konfirmasi: StatusKonfirmasiInsiden;
    created_at: string;
    updated_at: string;
    detail_pakaian: DetailPakaianItem;
    petugas?: {
        id_petugas: number;
        nama_petugas: string;
    } | null;
    pegawai_pelapor?: {
        id_pegawai: number;
        nama_pegawai: string;
    } | null;
}

export interface LaporanInsidenDetailItem extends LaporanInsidenItem {
    transaksi: {
        nomor_nota: string;
        status_transaksi: StatusTransaksi;
        status_pembayaran: StatusPembayaran;
        subtotal_layanan: string;
        total_harga: string;
        total_dibayar: string;
        sisa_tagihan: string;
        pelanggan: Pick<PelangganItem, 'id_pelanggan' | 'nama' | 'no_telepon'>;
        layanan: Pick<JenisLayananItem, 'id_layanan' | 'nama_layanan' | 'tingkat_kecepatan' | 'metode_hitung' | 'satuan'>;
    };
}

export interface AuditLogItem {
    id: number;
    user_id: number | null;
    actor_role: UserRole;
    action: string;
    subject_type: string;
    subject_id: string;
    payload_before: Record<string, unknown> | null;
    payload_after: Record<string, unknown> | null;
    created_at: string;
    user?: {
        id: number;
        name: string;
    } | null;
}

export interface TransaksiDetail {
    // Seluruh field Phase 1 tetap sama, ditambah properti Phase 2 berikut:
    kelebihan_bayar_tunai: string;
    total_kelebihan_ganti_rugi: string;
    total_pengembalian_pelanggan: string;
    tahap_produksi_terakhir: TahapProduksiCode | null;
    tahap_produksi_berikutnya: TahapProduksiCode | null;
    bisa_timbang_ulang: boolean;
    bisa_ubah_layanan: boolean;
    bisa_batalkan: boolean;
    perlu_biaya_pembatalan: boolean;
    estimasi_biaya_pembatalan: string;
    insiden_pending_count: number;
    laporan_insiden: LaporanInsidenItem[];
}

export interface TransaksiIndexProps extends SharedPageProps {
    transaksi: Paginated<TransaksiDetail>;
    filters: {
        search: string;
        status_pembayaran?: StatusPembayaran | '';
        status_transaksi?: StatusTransaksi | '';
    };
}

export interface TransaksiShowProps extends SharedPageProps {
    transaksi: TransaksiDetail;
    layananOptions: JenisLayananItem[];
    auditLogs: AuditLogItem[];
}

export interface ProduksiIndexProps extends SharedPageProps {
    transaksi: Paginated<TransaksiDetail>;
    filters: {
        search: string;
        tahap_status: TahapProduksiCode | '';
        status_transaksi: 'AKTIF' | 'SELESAI' | 'ALL';
    };
    stageCounts: Record<TahapProduksiCode, number>;
}

export interface EligibleInsidenTransaksiOption {
    nomor_nota: string;
    status_transaksi: StatusTransaksi;
    pelanggan_nama: string;
    layanan_nama: string;
    subtotal_layanan: string;
    total_potong: number;
    detail_pakaian: DetailPakaianItem[];
}

export interface InsidenIndexProps extends SharedPageProps {
    laporan: Paginated<LaporanInsidenDetailItem>;
    filters: {
        search: string;
        jenis_insiden: JenisInsiden | '';
        status_konfirmasi: StatusKonfirmasiInsiden | '';
    };
    pendingCount: number;
    eligibleTransaksiOptions: EligibleInsidenTransaksiOption[];
}

export interface DashboardPetugasSummary {
    role: 'PETUGAS';
    total_pelanggan: number;
    total_layanan_aktif: number;
    total_voucher_tersedia: number;
    transaksi_aktif: number;
    transaksi_belum_lunas: number;
    insiden_menunggu_konfirmasi: number;
    transaksi_selesai_siap_ambil: number;
}

export interface DashboardPegawaiSummary {
    role: 'PEGAWAI';
    antrean_aktif: number;
    laporan_insiden_saya: number;
    perlu_timbang_ulang: number;
    siap_proses_berikutnya: number;
}
```

---

## 4. Acceptance Criteria Phase 2 (`AC-P2-01` s.d. `AC-P2-12`)

| ID | Referensi SRS / Task | Kriteria Penerimaan Terukur (Happy, Boundary/KK, Unhappy) |
| --- | --- | --- |
| **`AC-P2-01`** | `P2-02`, RBAC Produksi | `GET /produksi` hanya dapat diakses oleh `PEGAWAI` (pagination + eager loading tanpa N+1 query); `PETUGAS` dan `PENGANTAR` ditolak HTTP `403`; `PEGAWAI` tetap ditolak `403` pada `/pelanggan`, `/layanan`, `/voucher`, `/transaksi`, dan `POST /insiden/{laporan}/konfirmasi`. |
| **`AC-P2-02`** | `UC-11`, `FR-06` | `POST /produksi/{nota}/status` memindahkan `RiwayatStatusProduksi` berurutan sesuai `TahapLayanan` (`DITERIMA -> DICUCI -> DIKERINGKAN -> DISETRIKA -> SELESAI` untuk `perlu_setrika=true`; dan `DITERIMA -> DICUCI -> DIKERINGKAN -> SELESAI` untuk `perlu_setrika=false`), menyimpan `id_pegawai` non-null + `waktu_update` WIB + `audit_logs`, dan otomatis mengubah `Transaksi.status_transaksi = SELESAI` saat mencapai `SELESAI`. |
| **`AC-P2-03`** | `UC-11`, `FR-06` | `POST /produksi/{nota}/status` menolak (`422`) upaya melompati tahap, mengulang/memundurkan tahap, mengirim tahap `DISETRIKA` pada layanan `perlu_setrika=false`, atau mengubah status transaksi berstatus `SELESAI`/`DIAMBIL`/`DIBATALKAN`. |
| **`AC-P2-04`** | `UC-12`, **`KK-01`**, **`KK-09`** | `POST /produksi/{nota}/timbang-ulang` pada transaksi `AKTIF` layanan `BERAT` (`kg`) di tahap `DITERIMA` memperbarui `berat_atau_jumlah`, menghitung ulang `subtotal_layanan` menggunakan `harga_satuan_snapshot` (`KK-09` tetap imun meski tarif master berubah), mengurangi voucher & kompensasi dengan `DecimalMoney`, dan menulis `audit_logs`. |
| **`AC-P2-05`** | **`KK-01`**, `UC-12` | Penimbangan ulang menurunkan `status_pembayaran` dari `LUNAS` menjadi `BELUM_LUNAS` apabila `total_harga` baru > `total_dibayar`, menaikkan `DP` menjadi `LUNAS` bila `total_harga` baru <= `total_dibayar`, serta menolak (`422`) untuk layanan `JUMLAH` (`pcs`) atau transaksi yang sudah memasuki tahap `DICUCI`/`SELESAI`/`DIAMBIL`/`DIBATALKAN`. |
| **`AC-P2-06`** | `UC-10`, **`KK-02`**, **`KK-09`** | `POST /transaksi/{nota}/ubah-layanan` oleh `PETUGAS` pada transaksi `AKTIF` tahap `DITERIMA`/`DICUCI` menyalin `harga_satuan_snapshot` baru dari layanan tujuan aktif, mewajibkan input `berat_atau_jumlah_baru` valid saat pindah `BERAT <-> JUMLAH`, merekonsiliasi `total_harga` & `status_pembayaran` (`LUNAS -> BELUM_LUNAS` bila naik), dan menolak (`422`) perubahan pada tahap `DIKERINGKAN`/`DISETRIKA`/`SELESAI`, layanan nonaktif, atau layanan identik. |
| **`AC-P2-07`** | `UC-10`, **`KK-08`** | `POST /transaksi/{nota}/batalkan` pada tahap `DITERIMA` menetapkan `status_transaksi = DIBATALKAN`, `biaya_pembatalan = '0.00'`, `total_harga = '0.00'`, serta melepaskan voucher secara atomik (`transaksi.nomor_voucher = null`, `nilai_voucher_snapshot = '0.00'`, `voucher.status_penggunaan = TERSEDIA` bila `masa_berlaku >= today WIB` atau `KEDALUWARSA` bila lewat) sehingga voucher aktif dapat dipakai ulang tanpa bentrok `UNIQUE(nomor_voucher)`. |
| **`AC-P2-08`** | `UC-10`, **`KK-08`** | `POST /transaksi/{nota}/batalkan` pada tahap `DICUCI`/`DIKERINGKAN`/`DISETRIKA` menolak pembatalan gratis (`422`), menetapkan default `50%` dari `subtotal_layanan` (atau nominal tervalidasi `0 < biaya <= subtotal_layanan`), mempertahankan voucher sebagai `SUDAH_DIGUNAKAN`, menghitung `total_harga = max(0, biaya_pembatalan - total_kompensasi)`, dan menolak (`422`) pembatalan bila transaksi sudah `SELESAI`/`DIAMBIL`/`DIBATALKAN`. |
| **`AC-P2-09`** | `UC-13`, **`KK-04`**, **`KK-05`** | `PEGAWAI` (tercatat `MENUNGGU_KONFIRMASI`, `id_petugas = null`, `nilai_kompensasi = '0.00'`) dan `PETUGAS` (terkonfirmasi langsung) dapat mengajukan `LaporanKerusakanKehilangan` (`RUSAK`/`HILANG`) via `POST /insiden` atau `POST /transaksi/{nota}/insiden`; `id_detail` wajib milik `nomor_nota` terkait dan `status_transaksi` wajib `AKTIF`/`SELESAI` (`422` bila `id_detail` silang nota atau nota berstatus `DIAMBIL`/`DIBATALKAN`). |
| **`AC-P2-10`** | `UC-13`, **`KK-04`**, **`KK-05`** | `KompensasiService::hitungKompensasi()` menghitung estimasi deterministik (`5×` basis item untuk `RUSAK`, `10×` untuk `HILANG`) berbasis integer cents; konfirmasi `PETUGAS` via `POST /insiden/{laporan}/konfirmasi` (ditolak `403` untuk `PEGAWAI`, `422` bila sudah dikonfirmasi) memotong `total_harga = max(0, subtotal_layanan - nilai_voucher_snapshot - total_kompensasi)`, mengubah `status_pembayaran -> LUNAS` saat sisa `'0.00'`, dan mencatat `kelebihan_ganti_rugi = max(0, nilai_kompensasi - sisa_tagihan_sebelum)` tanpa double counting pada multi-insiden nota sama. |
| **`AC-P2-11`** | `P2-05`, UI & TS Strict | `Produksi/Index.tsx`, `Insiden/Index.tsx`, `AppLayout.tsx`, `StatusBadge.tsx`, `Transaksi/Show.tsx`, dan `resources/js/types/index.ts` sinkron 100% dengan kontrak §3; layanan `perlu_setrika = false` tidak memunculkan tombol tahap `DISETRIKA`; `npx tsc --noEmit` dan `npm run build` lulus `0` error. |
| **`AC-P2-12`** | `P2-06`, Cross-Actor Sync & E2E | `DashboardController` memakai `now('Asia/Jakarta')->toDateString()` dan menampilkan metrik lintas aktor; `Transaksi/Index.tsx` & `Transaksi/Nota.tsx` menampilkan rincian insiden, kompensasi/kelebihan ganti rugi, dan status batal; `Phase2EndToEndTest.php` lulus tanpa `$this->withoutVite()` beserta seluruh 6 Gerbang Kualitas. |
