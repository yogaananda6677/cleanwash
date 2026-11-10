# Phase 3 Contracts, Delivery & Settlement Rules, dan UAT Matrix — CleanWash

| Field | Value |
| --- | --- |
| **Task ID** | `P3-01` |
| **Phase** | Phase 3 — Pengantaran Multi-Pelanggan, Pelunasan Akhir, Serah Terima & Hardening |
| **SRS Scope** | `UC-01` (pelunasan), `UC-02`, `UC-14`, `KK-06`, `KK-07`, *Activity 0 & 3*, *Sequence 0 & 4*, *Class Diagram*, + UAT Penuh `UC-01`..`UC-14` & `KK-01`..`KK-09` |
| **Database Baseline** | 16 tabel domain MySQL 8.4 terisolasi port `3307` (sudah bermigrasi penuh di Phase 1 — **tidak memerlukan migrasi tabel/kolom baru**) |
| **Arithmetic Guardrail** | Integer-scaled decimal cents (`App\Support\DecimalMoney`, skala `100`), **tanpa `float`** dan **tanpa `ext-bcmath`** |
| **Timezone Baseline** | `Asia/Jakarta` (WIB) di `config/app.php` |
| **Status** | Locked Baseline for `P3-02` s.d. `P3-05` |

---

## 1. Rencana Work Package `P3-01` s.d. `P3-05` & Kepemilikan File Eksklusif

### 1.1 Graf Ketergantungan

`P3-01 (PM)` $\rightarrow$ `P3-02 (BE)` $\rightarrow$ `P3-03 (BE)` $\rightarrow$ `P3-05 (FS + PM)`  
*(Catatan: `P3-04 (FE)` dapat mulai paralel setelah `P3-01` mengunci kontrak route, FormRequest, dan TypeScript §3 pada dokumen ini, lalu terintegrasi penuh dengan `P3-02` & `P3-03` sebelum `P3-05` menjalankan audit NFR, E2E test, UAT 14 UC / 9 KK, dan Phase 3 Closing Gate.)*

### 1.2 Rincian Atomik & Matriks Kepemilikan File per Subagent (Anti-Tumpang Tindih)

| Work Package | Branch & PIC | Kepemilikan File Eksklusif | Larangan Tegas | Deliverable Utama |
| --- | --- | --- | --- | --- |
| **`P3-01`** | `docs/p3-01-contracts` (`product-manager`) | `docs/phases/PHASE_3_CONTRACTS.md`, `MEMORY.md`, `WRITE.md`, `.claude/napkin.md` | Dilarang mengedit `app/`, `database/`, `routes/`, `resources/js/`, `tests/` | Kontrak bisnis `PengantaranService`, `SerahTerimaService`, `PembayaranService::catatPelunasan()`, route/FormRequest/TS strict, `AC-P3-01`..`AC-P3-12`, & Matriks UAT 14 UC + 9 KK |
| **`P3-02`** | `feature/p3-02-pengantaran-service` (`backend-developer`) | `app/Services/PengantaranService.php`, `app/Policies/Concerns/ChecksPengantarRole.php`, `app/Policies/PengantaranPolicy.php`, `app/Http/Requests/Concerns/AuthorizesPengantarRequest.php`, `app/Http/Requests/Pengantaran/{StorePengantaranRequest,UpdateItemPengantaranStatusRequest,JadwalkanUlangRequest}.php`, `app/Http/Controllers/PengantaranController.php`, `app/Services/TransaksiService.php` (relasi & field pengantaran), `app/Providers/AppServiceProvider.php`, `routes/web.php` (grup pengantaran), `tests/Unit/PengantaranServiceTest.php`, `tests/Feature/PengantaranOperationTest.php` | Dilarang menyentuh `resources/js/`, `resources/css/`, dan file milik `P3-03` (`SerahTerimaService`, `PembayaranService`, `AuditLogService`) | `PengantaranService` (`buatJadwal`, `mulaiPengantaran`, `updateStatusItem`, `jadwalkanUlang` terisolasi `KK-07`), sinkronisasi status header `Pengantaran`, cek hak bayar akhir saat `DITERIMA`, & TDD tests (`AC-P3-01`..`AC-P3-05`) |
| **`P3-03`** | `feature/p3-03-settlement-handover-audit` (`backend-developer`, setelah `P3-02` merge) | `app/Services/PembayaranService.php`, `app/Services/SerahTerimaService.php`, `app/Services/AuditLogService.php`, `app/Policies/TransaksiPolicy.php`, `app/Http/Requests/Transaksi/{StorePelunasanRequest,SerahTerimaRequest}.php`, `app/Http/Controllers/{PembayaranController,SerahTerimaController,AuditController,DashboardController}.php`, `app/Services/PengantaranService.php` (opsional delegasi ke `SerahTerimaService::cekHakBayarAkhir` bila belum diekstrak), `app/Providers/AppServiceProvider.php`, `routes/web.php` (grup pelunasan, serah terima, & audit), `tests/Unit/{PembayaranServiceTest,SerahTerimaServiceTest}.php`, `tests/Feature/{PembayaranAndSerahTerimaTest,AuditAndDashboardPhase3Test}.php` | Dilarang menyentuh `resources/js/` dan `resources/css/` | `PembayaranService::catatPelunasan()` + `updateStatusLunas()`, `SerahTerimaService` (`ambilPakaian`, `cekHakBayarAkhir`, `serahkanPakaian` `KK-06`), `GET /serah-terima`, `GET /audit` + ringkasan piutang, KPI nyata `PENGANTAR` & `PETUGAS` di `DashboardController`, & TDD tests (`AC-P3-06`..`AC-P3-09`) |
| **`P3-04`** | `feature/p3-04-frontend-ui` (`frontend-developer`) | `resources/js/types/index.ts`, `resources/js/lib/format.ts`, `resources/js/Components/StatusBadge.tsx`, `resources/js/Components/LaporkanInsidenModal.tsx` (tindak lanjut Phase 2), `resources/js/Components/{PelunasanModal,SerahTerimaModal}.tsx`, `resources/js/Layouts/AppLayout.tsx`, `resources/js/Pages/Dashboard/Index.tsx`, `resources/js/Pages/Transaksi/Show.tsx`, `resources/js/Pages/Pengantaran/{Index,Show}.tsx`, `resources/js/Pages/SerahTerima/Index.tsx`, `resources/js/Pages/Audit/Index.tsx` | Dilarang menyentuh `app/`, `database/`, `routes/`, `tests/`, maupun `Archive/` | Workspace Kurir (`/pengantaran`), manajemen jadwal Pengantaran & Serah Terima Kasir (`/serah-terima`), modal Pelunasan & Serah Terima di `Transaksi/Show.tsx`, Audit Trail & Piutang viewer (`/audit`), Dashboard KPI aktif, & cleanup `centsToDecimalString()` |
| **`P3-05`** | `feature/p3-05-hardening-uat-gate` (`fullstack-developer` + `product-manager`) | `tests/Feature/Phase3EndToEndTest.php`, cleanup `shouldExist: false` pada `tests/Feature/*Test.php` bila ada, penyesuaian lintas-layer minor jika ditemukan saat integrasi E2E, `docs/phases/PHASE_3_CLOSING_EVIDENCE.md`, `MEMORY.md`, `WRITE.md` | Dilarang melonggarkan assertion test atau melewati 1 dari 6 Gerbang Kualitas | Hapus `shouldExist: false`, `Phase3EndToEndTest.php` tanpa `$this->withoutVite()`, audit keamanan/RBAC/CSRF/N+1/decimal/backup-restore MySQL 8.4, eksekusi penuh Matriks UAT 14 UC + 9 KK, & Final Release Sign-off |

---

## 2. Aturan Bisnis Detail, State Machine & Kebijakan Keuangan Phase 3

### 2.0 Invarian Lintas-Service & Tindak Lanjut Non-Blocking Phase 2

1. **Pengecualian Transaksi `DIBATALKAN` (`PHASE_2_CLOSING_EVIDENCE.md` §4 #2):**
   - Transaksi berstatus `DIBATALKAN` **dilarang keras** masuk ke sesi `Pengantaran` (`buatJadwal()`/`jadwalkanUlang()`) dan **dilarang keras** diproses pada `SerahTerimaService` (`ambilPakaian()`/`serahkanPakaian()`).
   - Namun, transaksi `DIBATALKAN` pasca pencucian (`KK-08`) yang masih menyisakan tagihan `biaya_pembatalan` (`sisa_tagihan > '0.00'`) **tetap dapat dilunasi** melalui `PembayaranService::catatPelunasan()`.
2. **Saldo Penyesuaian Final (`DecimalMoney`):**
   - Seluruh perhitungan `sisa_tagihan` pada pengantaran, serah terima, pelunasan, piutang, dan dashboard wajib membaca angka final pasca penyesuaian Phase 2 (`KK-01`, `KK-02`, `KK-04`, `KK-05`, `KK-08`):
     $$\text{total\_dibayar} = \sum \text{pembayaran.nominal\_bayar}$$
     $$\text{sisa\_tagihan} = \text{DecimalMoney::maxZero}\big(\text{DecimalMoney::subtract}(\text{transaksi.total\_harga},\ \text{total\_dibayar})\big)$$
3. **Pembersihan Preview UI Phase 2 (`PHASE_2_CLOSING_EVIDENCE.md` §4 #1):**
   - Pada `resources/js/Components/LaporkanInsidenModal.tsx` baris 406–410, ganti `(compensationPreview.basisCents / 100).toFixed(2)` menjadi `centsToDecimalString(compensationPreview.basisCents)` dari `@/lib/format` (`P3-04`).
4. **Skema 16 Tabel Tetap Utuh:**
   - Seluruh alur Phase 3 memanfaatkan kolom eksisting `pengantaran`, `item_pengantaran`, `transaksi`, `pembayaran`, `pelanggan`, `petugas_pengantaran`, dan `audit_logs` tanpa migrasi kolom/tabel baru.
5. **Konsistensi Waktu & Locking:**
   - Seluruh timestamp (`tanggal_bayar`, `waktu_update`, `diambil_pada`, `AuditLog.created_at`) memakai `now('Asia/Jakarta')`.
   - Seluruh mutasi multi-tabel dibungkus `DB::transaction()` dengan `lockForUpdate()` deterministik (urutan lock: kunci `ItemPengantaran` / `Pengantaran` terlebih dahulu bila relevan, lalu kunci `Transaksi` berurutan `nomor_nota ASC` untuk mencegah InnoDB deadlock).

---

### 2.1 `PengantaranService` (`P3-02`, `UC-14`, `KK-07`, `FR-09`, `FR-10`)

#### A. Pembuatan Jadwal Pengantaran (`PengantaranService::buatJadwal` — `POST /pengantaran`)
1. **Aktor Berwenang:** **Hanya `PETUGAS` aktif** (`PEGAWAI` dan `PENGANTAR` ditolak HTTP **`403`**).
2. **Validasi Input & Pra-Kondisi (`422` bila melanggar):**
   - `id_petugas_antar`: `required|integer|exists:petugas_pengantaran,id_petugas_antar`. User terkait (`PetugasPengantaran.user`) **wajib `is_active === true`** (`422`: *"Kurir pengantaran yang dipilih sedang tidak aktif."*).
   - `tanggal_pengantaran`: `required|date|after_or_equal:today` (referensi tanggal `Asia/Jakarta`).
   - `nomor_nota_list`: `required|array|min:1`, tiap elemen `string|distinct|exists:transaksi,nomor_nota` (tolak `422` bila ada `nomor_nota` ganda dalam satu request).
   - Diperbolehkan memilih **1 atau lebih transaksi lintas pelanggan** (`KK-07`) dalam satu sesi `Pengantaran`.
   - Lock seluruh baris `Transaksi` terpilih (`whereIn('nomor_nota', $sortedNotas)->orderBy('nomor_nota')->lockForUpdate()->get()`):
     - Setiap transaksi **wajib** berstatus `StatusTransaksi::SELESAI` (`422` jika `AKTIF`, `DIAMBIL`, atau `DIBATALKAN`).
     - Setiap transaksi **wajib belum memiliki** `ItemPengantaran` dengan `status_terima_pelanggan` dalam `[MENUNGGU, DIAMBIL, DALAM_PERJALANAN, DITERIMA]` (`422`: *"Transaksi {$nota} sudah terdaftar pada pengantaran aktif atau sudah diterima pelanggan."*).
     - *(Catatan: Transaksi `SELESAI` yang hanya memiliki riwayat item `GAGAL` lampau boleh dijadwalkan baik lewat `jadwalkanUlang()` maupun dimasukkan bersama nota lain pada jadwal batch baru selama tidak memiliki item aktif/DITERIMA).*
3. **Mutasi Atomik (`DB::transaction()`):**
   - Buat 1 baris `Pengantaran`: `id_petugas_antar`, `tanggal_pengantaran`, `status_pengantaran = StatusPengantaran::DIJADWALKAN`.
   - Untuk tiap `nomor_nota`, buat baris `ItemPengantaran`: `id_pengantaran`, `nomor_nota`, `status_terima_pelanggan = StatusItemPengantaran::MENUNGGU`, `alasan_gagal = null`, `waktu_update = now('Asia/Jakarta')`.
   - Catat `AuditLog`: `action = 'PENGANTARAN_CREATED'`, `actor_role = 'PETUGAS'`, `subject_type = Pengantaran::class`, `subject_id = (string) $pengantaran->id_pengantaran`, `payload_after` memuat `id_petugas_antar`, `tanggal_pengantaran`, `status_pengantaran = DIJADWALKAN`, dan `nomor_nota_list`.

#### B. Memulai Sesi Pengantaran (`PengantaranService::mulaiPengantaran` — `POST /pengantaran/{pengantaran}/mulai`)
1. **Aktor Berwenang:** **Hanya `PENGANTAR` aktif yang ditugaskan** pada sesi tersebut (`$pengantaran->id_petugas_antar === $kurir->id_petugas_antar`). Kurir lain, `PETUGAS`, dan `PEGAWAI` ditolak HTTP **`403`** melalui `PengantaranPolicy::mulai()`.
2. **Aturan Pra-Kondisi (`422` bila melanggar):**
   - Lock baris `Pengantaran` (`lockForUpdate()`).
   - `status_pengantaran` **wajib `StatusPengantaran::DIJADWALKAN`** (`422` jika sudah `BERJALAN` atau `SELESAI`).
   - Sesi wajib memiliki minimal 1 `ItemPengantaran`.
3. **Mutasi Atomik:**
   - Ubah `pengantaran.status_pengantaran = StatusPengantaran::BERJALAN`. *(Status tiap `ItemPengantaran` tetap `MENUNGGU` agar kurir tetap melewati urutan bertahap `MENUNGGU -> DIAMBIL -> DALAM_PERJALANAN -> DITERIMA | GAGAL`)*.
   - Catat `AuditLog`: `action = 'PENGANTARAN_STARTED'`, `actor_role = 'PENGANTAR'`, `subject_type = Pengantaran::class`, `subject_id = (string) $pengantaran->id_pengantaran`, `payload_before` & `payload_after`.

#### C. Transisi Status `ItemPengantaran` & Sinkronisasi Header (`PengantaranService::updateStatusItem` — `POST /pengantaran/item/{item}/status`)
1. **Aktor Berwenang:** **Hanya `PENGANTAR` aktif pemilik sesi** (`$item->pengantaran->id_petugas_antar === $kurir->id_petugas_antar`). Kurir lain, `PETUGAS`, dan `PEGAWAI` ditolak HTTP **`403`** melalui `PengantaranPolicy::updateItemStatus()`.
2. **State Machine Ketat Per Item (`422` bila melanggar):**
   ```text
   MENUNGGU         -> hanya boleh ke: [DIAMBIL]
   DIAMBIL          -> hanya boleh ke: [DALAM_PERJALANAN]
   DALAM_PERJALANAN -> hanya boleh ke: [DITERIMA, GAGAL]
   DITERIMA         -> [] (terminal)
   GAGAL            -> [] (terminal; perubahan lanjutan hanya lewat jadwalkanUlang() membentuk item baru)
   ```
   - Transisi melompati tahap (mis. `MENUNGGU -> DALAM_PERJALANAN`, `MENUNGGU -> GAGAL`, `DIAMBIL -> DITERIMA`, `DIAMBIL -> GAGAL`), memundurkan tahap, mengulang status yang sama, atau mengubah item berstatus `DITERIMA`/`GAGAL` **wajib ditolak `422`** dengan pesan eksplisit.
   - Jika target status **`GAGAL`**: `alasan_gagal` **wajib diisi** (`string`, trimmed `min:5`, `max:1000`); jika kosong atau `< 5` karakter, tolak `422`.
   - Jika target status **bukan `GAGAL`** (`DIAMBIL`, `DALAM_PERJALANAN`, `DITERIMA`): `alasan_gagal` disimpan `null`.
   - Timestamp `waktu_update` wajib diisi `now('Asia/Jakarta')`.
3. **Interaksi Serah Terima oleh Kurir saat `DALAM_PERJALANAN -> DITERIMA` (`FR-11`, `KK-06`):**
   - Lock `Transaksi` terkait (`lockForUpdate()`) beserta `pelanggan` dan `pembayaran`.
   - Pastikan `Transaksi.status_transaksi === StatusTransaksi::SELESAI` (`422` bila `AKTIF`, `DIAMBIL`, atau `DIBATALKAN`).
   - Evaluasi hak bayar akhir melalui **`SerahTerimaService::cekHakBayarAkhir($transaksi)`** (sumber kebenaran tunggal):
     - Hitung `sisa_tagihan = max(0.00, total_harga - total_dibayar)`.
     - Jika `DecimalMoney::gt($sisaTagihan, '0.00')` **DAN** `! $transaksi->pelanggan->boleh_bayar_akhir`:
       - **TOLAK HTTP `422`** pada `status_terima_pelanggan` (DB rollback, item tetap `DALAM_PERJALANAN`):  
         *"Pelanggan {$nama} belum melunasi sisa tagihan sebesar Rp {$formatted} dan tidak memiliki hak bayar akhir (KK-06). Arahkan pelanggan melunasi di kasir terlebih dahulu atau tandai pengantaran sebagai GAGAL."*
     - Jika `DecimalMoney::eq($sisaTagihan, '0.00')` **ATAU** `$transaksi->pelanggan->boleh_bayar_akhir === true`:
       - Set `item_pengantaran`: `status_terima_pelanggan = DITERIMA`, `alasan_gagal = null`, `waktu_update = $now`.
       - Set `transaksi`:
         - `status_transaksi = StatusTransaksi::DIAMBIL`
         - `diambil_pada = $now`
         - `status_pembayaran`: jika `DecimalMoney::gt($sisaTagihan, '0.00')` (`boleh_bayar_akhir === true` dengan piutang) $\rightarrow$ **`StatusPembayaran::BELUM_LUNAS`** (baik sebelumnya `BELUM_BAYAR`, `DP`, maupun `BELUM_LUNAS`); jika `DecimalMoney::eq($sisaTagihan, '0.00')` $\rightarrow$ **`StatusPembayaran::LUNAS`**.
       - Catat `AuditLog` `SERAH_TERIMA` (`subject_type = Transaksi::class`, `subject_id = $transaksi->nomor_nota`, `actor_role = 'PENGANTAR'`, `payload_after` memuat `kanal: 'KURIR'`, `id_pengantaran`, `id_item_antar`, `id_petugas_antar`, `sisa_tagihan`, `boleh_bayar_akhir`, `piutang_dicatat`, `diambil_pada`).
4. **Sinkronisasi Otomatis `Pengantaran.status_pengantaran` (`syncStatusPengantaran`):**
   Dipanggil setiap kali item berubah (atau ditutup dari loket) setelah memuat seluruh `ItemPengantaran` pada sesi terkait:
   - Jika **semua** item dalam `Pengantaran` berstatus `DITERIMA` atau `GAGAL`:  
     `status_pengantaran = StatusPengantaran::SELESAI`.
   - Else jika **minimal satu** item berstatus `DIAMBIL`, `DALAM_PERJALANAN`, `DITERIMA`, atau `GAGAL`, **atau** header sudah berstatus `BERJALAN` (via `mulaiPengantaran()`):  
     `status_pengantaran = StatusPengantaran::BERJALAN`.
   - Else (semua item masih `MENUNGGU` dan sesi belum dimulai):  
     `status_pengantaran = StatusPengantaran::DIJADWALKAN`.
5. **Audit Item Update:**
   - Setiap transisi status item (`DIAMBIL`, `DALAM_PERJALANAN`, `DITERIMA`, `GAGAL`) wajib mencatat `AuditLog`: `action = 'ITEM_PENGANTARAN_UPDATED'`, `actor_role = 'PENGANTAR'`, `subject_type = Transaksi::class`, `subject_id = $item->nomor_nota`, mencatat status item & header sebelum/sesudah serta `alasan_gagal` bila `GAGAL`.

#### D. Penjadwalan Ulang Independen (`PengantaranService::jadwalkanUlang` — `POST /pengantaran/item/{item}/jadwalkan-ulang`, `KK-07`)
1. **Aktor Berwenang:**
   - **`PETUGAS` aktif:** berhak menjadwalkan ulang `ItemPengantaran` `GAGAL` mana pun serta menunjuk `id_petugas_antar` baru (kurir aktif) atau mengosongkannya untuk memakai kurir sesi asal.
   - **`PENGANTAR` aktif:** **hanya** berhak menjadwalkan ulang `ItemPengantaran` `GAGAL` pada `Pengantaran` miliknya (`$item->pengantaran->id_petugas_antar === $kurir->id_petugas_antar`). Item milik kurir lain ditolak HTTP **`403`** (`PengantaranPolicy::jadwalkanUlang()`). Bila kurir mengirim `id_petugas_antar` milik kurir lain, tolak **`422`** (*"Kurir hanya dapat menjadwalkan ulang untuk dirinya sendiri; penugasan ke kurir lain dilakukan oleh Petugas."*).
   - **`PEGAWAI`** ditolak HTTP **`403`**.
2. **Validasi Pra-Kondisi (`422` bila melanggar):**
   - Lock `ItemPengantaran` asal, `Pengantaran` asal, dan `Transaksi` terkait (`lockForUpdate()`).
   - `$itemAsal->status_terima_pelanggan` **wajib `StatusItemPengantaran::GAGAL`** (`422` untuk `MENUNGGU`, `DIAMBIL`, `DALAM_PERJALANAN`, `DITERIMA`).
   - `$transaksi->status_transaksi` **wajib `StatusTransaksi::SELESAI`** (`422` bila sudah `DIAMBIL` di kasir, `DIBATALKAN`, atau `AKTIF`).
   - **Anti-Double-Reschedule Guard:**
     1. Tolak `422` apabila `nomor_nota` sudah memiliki `ItemPengantaran` lain berstatus `[MENUNGGU, DIAMBIL, DALAM_PERJALANAN, DITERIMA]`.
     2. Tolak `422` apabila sudah terdapat `ItemPengantaran` dengan `id_item_antar > $itemAsal->id_item_antar` untuk `nomor_nota` sama (mencegah penjadwalan ulang ganda pada record `GAGAL` lampau).
   - `tanggal_pengantaran`: `required|date|after_or_equal:today` (zona `Asia/Jakarta`).
   - `id_petugas_antar`: `nullable|integer|exists:petugas_pengantaran,id_petugas_antar` (default = `$pengantaranAsal->id_petugas_antar`). Akun user kurir target wajib `is_active === true` (`422` jika nonaktif).
3. **Isolasi Mutlak & Mutasi Atomik (`DB::transaction()`):**
   - **JANGAN MENGUBAH** `$itemAsal` (tetap `GAGAL` dengan `alasan_gagal` historisnya) dan **JANGAN MENGUBAH** status `ItemPengantaran` lain milik pelanggan lain pada `$pengantaranAsal` (`KK-07` **100% terisolasi**).
   - Jalankan `syncStatusPengantaran($pengantaranAsal)` (memastikan status sesi asal akurat).
   - Buat 1 `Pengantaran` baru: `id_petugas_antar = $targetKurir->id_petugas_antar`, `tanggal_pengantaran = $tanggalBaru`, `status_pengantaran = StatusPengantaran::DIJADWALKAN`.
   - Buat 1 `ItemPengantaran` baru pada sesi baru tersebut: `nomor_nota = $itemAsal->nomor_nota`, `status_terima_pelanggan = StatusItemPengantaran::MENUNGGU`, `alasan_gagal = null`, `waktu_update = $now`.
   - Catat `AuditLog`: `action = 'PENGANTARAN_RESCHEDULED'`, `subject_type = Transaksi::class`, `subject_id = $transaksi->nomor_nota`, mencatat `old_id_pengantaran`, `old_id_item_antar`, `new_id_pengantaran`, `new_id_item_antar`, `tanggal_pengantaran_baru`, `id_petugas_antar_baru`.

---

### 2.2 `PembayaranService::catatPelunasan()` & `updateStatusLunas()` (`P3-03`, `UC-01`, `FR-05`)

1. **Aktor Berwenang:** **Hanya `PETUGAS` aktif** (`PEGAWAI` dan `PENGANTAR` ditolak HTTP **`403`**).
2. **Aturan Pra-Kondisi & Validasi (`422` bila melanggar):**
   - Lock `Transaksi` (`lockForUpdate()`) dan muat relasi `pembayaran`.
   - Hitung `$totalDibayarSebelum = $this->hitungTotalDibayar($lockedTransaksi)`.
   - Hitung `$sisaTagihanSebelum = DecimalMoney::maxZero(DecimalMoney::subtract((string) $lockedTransaksi->total_harga, $totalDibayarSebelum))`.
   - Jika `DecimalMoney::lte($sisaTagihanSebelum, '0.00')`:
     - Tolak `422` pada `nominal_bayar`: *"Transaksi {$nomorNota} sudah lunas dan tidak memiliki sisa tagihan."* (berlaku termasuk untuk transaksi `DIBATALKAN` gratis atau yang sudah tertutup DP/kompensasi).
   - Status transaksi yang **diizinkan** menerima pelunasan selama `sisa_tagihan > '0.00'`:
     - `AKTIF` (pelunasan sebelum produksi selesai)
     - `SELESAI` (pelunasan saat nota siap ambil / saat sedang diantar kurir)
     - `DIAMBIL` (pelunasan piutang pelanggan `boleh_bayar_akhir = true` yang berstatus `BELUM_LUNAS`, `KK-06`)
     - `DIBATALKAN` (pelunasan sisa `biaya_pembatalan` pasca cuci `KK-08` apabila `sisa_tagihan > '0.00'`)
   - Validasi `nominal_bayar`:
     - Format desimal valid, wajib `> '0.00'` (`422` jika `<= 0`).
     - Wajib `<= $sisaTagihanSebelum` (`422`: *"Nominal pelunasan tidak boleh melebihi sisa tagihan sebesar Rp {$formatted}."*).
3. **Mutasi Atomik (`DB::transaction()`) & `updateStatusLunas()`:**
   - Buat baris `Pembayaran`:
     - `nomor_nota`: `$lockedTransaksi->nomor_nota`
     - `id_petugas`: `$petugas->id_petugas`
     - `tanggal_bayar`: `$tanggalBayar ?? now('Asia/Jakarta')`
     - `jenis_bayar`: `JenisBayar::PELUNASAN`
     - `nominal_bayar`: `$normalizedNominal`
   - Hitung `$totalDibayarSesudah = DecimalMoney::add($totalDibayarSebelum, $normalizedNominal)`.
   - Panggil `updateStatusLunas(Transaksi $transaksi, string $totalDibayarSesudah): StatusPembayaran`:
     - Jika `DecimalMoney::gte($totalDibayarSesudah, (string) $lockedTransaksi->total_harga)` (yaitu `sisa_tagihan == '0.00'`): kembalikan **`StatusPembayaran::LUNAS`**.
     - Else (cicilan/pelunasan bertahap yang masih menyisakan saldo):
       - Jika `$lockedTransaksi->status_transaksi === StatusTransaksi::DIAMBIL` atau `in_array($statusSebelum, [StatusPembayaran::BELUM_LUNAS, StatusPembayaran::LUNAS], true)` $\rightarrow$ **`StatusPembayaran::BELUM_LUNAS`**.
       - Else $\rightarrow$ **`StatusPembayaran::DP`**.
   - Simpan `transaksi.status_pembayaran = $statusPembayaranBaru`.
   - Catat `AuditLog`: `action = 'PELUNASAN_RECORDED'` *(selaras dengan `resources/js/lib/format.ts`)*, `actor_role = 'PETUGAS'`, `subject_type = Transaksi::class`, `subject_id = $lockedTransaksi->nomor_nota`, `payload_before` & `payload_after` (`id_pembayaran`, `jenis_bayar`, `nominal_bayar`, `total_dibayar`, `sisa_tagihan`, `status_pembayaran`, `id_petugas`).

---

### 2.3 `SerahTerimaService` (`ambilPakaian`, `cekHakBayarAkhir`, `serahkanPakaian` — `P3-03`, `UC-02`, `KK-06`)

1. **Aktor Berwenang:** **Hanya `PETUGAS` aktif** (`PEGAWAI` dan `PENGANTAR` ditolak HTTP **`403`**).
2. **`cekHakBayarAkhir(Transaksi $transaksi): array` (Single Source of Truth untuk Loket & Kurir):**
   - Memuat `pelanggan` dan `pembayaran` bila belum ter-load.
   - Menghitung `$totalDibayar` dan `$sisaTagihan = DecimalMoney::maxZero(DecimalMoney::subtract((string) $transaksi->total_harga, $totalDibayar))`.
   - Mengembalikan:
     ```php
     [
         'allowed' => DecimalMoney::eq($sisaTagihan, '0.00') || (bool) $transaksi->pelanggan->boleh_bayar_akhir,
         'wajib_pelunasan' => DecimalMoney::gt($sisaTagihan, '0.00') && ! (bool) $transaksi->pelanggan->boleh_bayar_akhir,
         'boleh_bayar_akhir' => (bool) $transaksi->pelanggan->boleh_bayar_akhir,
         'sisa_tagihan' => $sisaTagihan,
         'alasan' => (DecimalMoney::gt($sisaTagihan, '0.00') && ! (bool) $transaksi->pelanggan->boleh_bayar_akhir)
             ? "Pelanggan belum melunasi sisa tagihan sebesar {$formattedSisa} dan tidak memiliki hak bayar akhir (KK-06)."
             : null,
     ]
     ```
3. **`ambilPakaian(string $nomorNota): array`:**
   - Memeriksa dan mengembalikan evaluasi kesiapan pengambilan nota: `transaksi`, `status_transaksi === SELESAI`, konflik item pengantaran aktif (`DIAMBIL`/`DALAM_PERJALANAN` vs `MENUNGGU`), dan hasil `cekHakBayarAkhir()`.
4. **`serahkanPakaian(string $nomorNota, Petugas $petugas, ?string $catatan = null, ?User $actor = null): Transaksi` (`POST /transaksi/{nota}/serah-terima`):**
   - **Lock & Pra-Kondisi (`DB::transaction()`):**
     - Lock `Transaksi` (`lockForUpdate()`) beserta `pelanggan`, `pembayaran`, dan `itemPengantaran.pengantaran`.
     - `status_transaksi` **wajib `StatusTransaksi::SELESAI`** (`422` bila `AKTIF`, `DIAMBIL`, atau `DIBATALKAN`).
     - **Aturan Anti-Konflik dengan Kurir (`ItemPengantaran`):**
       - Jika ada `ItemPengantaran` pada nota ini yang berstatus **`DIAMBIL` atau `DALAM_PERJALANAN`**: **TOLAK `422`** (*"Pakaian untuk nota {$nomorNota} sedang dibawa kurir pengantaran ({$status}). Selesaikan atau tandai gagal pengantaran terlebih dahulu sebelum serah terima di loket."*).
       - Jika ada `ItemPengantaran` pada nota ini yang masih berstatus **`MENUNGGU`** (masih di outlet, belum diambil kurir): tutup item tersebut secara atomik menjadi **`StatusItemPengantaran::GAGAL`** dengan `alasan_gagal = 'Diambil langsung oleh pelanggan di loket kasir.'`, `waktu_update = $now`, catat `AuditLog` `ITEM_PENGANTARAN_UPDATED`, lalu sinkronkan `Pengantaran.status_pengantaran` induknya (`BERJALAN`/`SELESAI`) agar kurir tidak mencari cucian yang sudah diambil di loket!
     - **Gerbang `KK-06` (`cekHakBayarAkhir`):**
       - Jika `! $hakBayar['allowed']` (`sisa_tagihan > '0.00'` dan `! pelanggan->boleh_bayar_akhir`): **TOLAK HTTP `422`** (*"Serah terima ditolak (KK-06): sisa tagihan Rp {$formatted} wajib dilunasi terlebih dahulu karena pelanggan tidak memiliki hak bayar akhir."*).
   - **Mutasi Atomik (`serahkanPakaian` sukses):**
     - `$piutangDicatat = DecimalMoney::gt($hakBayar['sisa_tagihan'], '0.00')` (bernilai `true` hanya bila `boleh_bayar_akhir === true` dan masih ada sisa tagihan).
     - `$statusPembayaranSesudah = $piutangDicatat ? StatusPembayaran::BELUM_LUNAS : StatusPembayaran::LUNAS`.
     - Update `Transaksi`: `status_transaksi = StatusTransaksi::DIAMBIL`, `diambil_pada = $now`, `status_pembayaran = $statusPembayaranSesudah`.
     - Catat `AuditLog`: `action = 'SERAH_TERIMA'` *(selaras `resources/js/lib/format.ts`)*, `actor_role = 'PETUGAS'`, `subject_type = Transaksi::class`, `subject_id = $transaksi->nomor_nota`, `payload_before` & `payload_after` (`kanal: 'LOKET'`, `status_transaksi: 'DIAMBIL'`, `status_pembayaran`, `sisa_tagihan`, `boleh_bayar_akhir`, `piutang_dicatat`, `diambil_pada`, `catatan`, `id_petugas`).

---

### 2.4 `AuditLogService` & Pembaruan KPI `DashboardController` (`P3-03`)

1. **`GET /audit` (`AuditController@index`, `role:PETUGAS`):**
   - `PEGAWAI` dan `PENGANTAR` ditolak HTTP **`403`**.
   - Memuat:
     - `logs`: paginasi `AuditLog` (`with('user:id,name')`, urut `created_at DESC, id DESC`, `perPage = 15`), filter `search` (`SqlLike::contains` pada `subject_id`, `action`, `user.name`), `action` (exact allowlist), dan `actor_role` (`PETUGAS` | `PEGAWAI` | `PENGANTAR`).
     - `filters`: `{ search, action, actor_role }`.
     - `availableActions`: daftar konstan aksi audit Phase 1–3.
     - `piutangSummary`: ringkasan pelanggan `boleh_bayar_akhir` yang sudah menerima/mengambil pakaian (`status_transaksi = DIAMBIL`) tetapi belum lunas (`status_pembayaran != LUNAS`):
       - `total_nota_piutang: int`
       - `total_nominal_piutang: string` (`DECIMAL(12,2)` dihitung dengan `DecimalMoney::add()`)
       - `items`: daftar transaksi piutang (`with(['pelanggan', 'layanan', 'pembayaran'])`, urut `diambil_pada DESC`, tanpa N+1 query).
2. **`DashboardController::index()` (Pembaruan Non-Breaking):**
   - **`PETUGAS`** *(field Phase 1–2 tetap dipertahankan utuh + 3 field Phase 3)*:
     - `pengantaran_aktif`: jumlah `Pengantaran` berstatus `DIJADWALKAN` / `BERJALAN`.
     - `piutang_belum_lunas`: jumlah `Transaksi` berstatus `DIAMBIL` dengan `status_pembayaran != LUNAS`.
     - `piutang_nominal_total`: total `sisa_tagihan` (`DECIMAL(12,2)` via `DecimalMoney`) dari seluruh nota `DIAMBIL` yang belum lunas.
   - **`PENGANTAR`** *(field Phase 1–2 tetap dipertahankan utuh + 2 field Phase 3)*:
     - `jadwal_pengantaran_aktif`: jumlah `Pengantaran` milik kurir (`id_petugas_antar = $actorId`) berstatus `DIJADWALKAN` / `BERJALAN`.
     - `item_pengantaran_aktif`: jumlah `ItemPengantaran` milik kurir pada sesi di mana `status_terima_pelanggan` in `[MENUNGGU, DIAMBIL, DALAM_PERJALANAN]`.
     - `item_terkirim_hari_ini`: jumlah `ItemPengantaran` milik kurir berstatus `DITERIMA` dengan `DATE(waktu_update) = today('Asia/Jakarta')`.
     - `item_gagal_perlu_tindak_lanjut`: jumlah `ItemPengantaran` milik kurir berstatus `GAGAL` yang transaksinya masih berstatus `SELESAI` dan belum memiliki `ItemPengantaran` lebih baru (`NOT EXISTS (SELECT 1 FROM item_pengantaran ip2 WHERE ip2.nomor_nota = item_pengantaran.nomor_nota AND ip2.id_item_antar > item_pengantaran.id_item_antar)`).

---

## 3. Kontrak Route, Policy, FormRequest & TypeScript Strict

### 3.1 Kontrak Route & Middleware (`routes/web.php`)

| Area | Method & URI | Route Name | Middleware | Controller & Action | Redirect Sukses |
| --- | --- | --- | --- | --- | --- |
| Daftar Pengantaran | `GET /pengantaran` | `pengantaran.index` | `auth`, `role:PETUGAS,PENGANTAR` | `PengantaranController@index` | Inertia `Pengantaran/Index` |
| Buat Jadwal Antar | `POST /pengantaran` | `pengantaran.store` | `auth`, `role:PETUGAS` | `PengantaranController@store` | `pengantaran.show` (`id_pengantaran` baru) |
| Jadwal Ulang Item | `POST /pengantaran/item/{item}/jadwalkan-ulang` | `pengantaran.item.jadwalkan-ulang` | `auth`, `role:PETUGAS,PENGANTAR` | `PengantaranController@jadwalkanUlang` | `pengantaran.show` (`id_pengantaran` baru) |
| Detail Pengantaran | `GET /pengantaran/{pengantaran}` | `pengantaran.show` | `auth`, `role:PETUGAS,PENGANTAR` | `PengantaranController@show` | Inertia `Pengantaran/Show` |
| Mulai Pengantaran | `POST /pengantaran/{pengantaran}/mulai` | `pengantaran.mulai` | `auth`, `role:PENGANTAR` | `PengantaranController@mulai` | `pengantaran.show` (`id_pengantaran`) |
| Update Status Item | `POST /pengantaran/item/{item}/status` | `pengantaran.item.status` | `auth`, `role:PENGANTAR` | `PengantaranController@updateItemStatus` | `pengantaran.show` (`id_pengantaran`) |
| Loket Serah Terima | `GET /serah-terima` | `serah-terima.index` | `auth`, `role:PETUGAS` | `SerahTerimaController@index` | Inertia `SerahTerima/Index` |
| Catat Pelunasan | `POST /transaksi/{nota}/pembayaran` | `transaksi.pembayaran.store` | `auth`, `role:PETUGAS` | `PembayaranController@store` | `serah-terima.index` jika `redirect_to === 'serah-terima'`, else `transaksi.show` |
| Serah Terima Nota | `POST /transaksi/{nota}/serah-terima` | `transaksi.serah-terima` | `auth`, `role:PETUGAS` | `SerahTerimaController@store` | `serah-terima.index` jika `redirect_to === 'serah-terima'`, else `transaksi.show` |
| Audit & Piutang | `GET /audit` | `audit.index` | `auth`, `role:PETUGAS` | `AuditController@index` | Inertia `Audit/Index` |

*(Catatan Penting Ordering Route: Daftarkan route statis `/pengantaran/item/{item}/...` **sebelum** `GET /pengantaran/{pengantaran}` dengan constraint `->whereNumber('pengantaran')` dan `->whereNumber('item')` di `routes/web.php`.)*

### 3.2 Kontrak Policy & Registrasi (`AppServiceProvider`)

1. **`PengantaranPolicy`** *(didaftarkan untuk `Pengantaran::class`)*:
   - `viewAny(User $user)`: `PETUGAS` aktif atau `PENGANTAR` aktif.
   - `view(User $user, Pengantaran $pengantaran)`: `PETUGAS` aktif **atau** (`PENGANTAR` aktif && `$pengantaran->id_petugas_antar === $user->actorId()`).
   - `create(User $user)`: `PETUGAS` aktif.
   - `mulai(User $user, Pengantaran $pengantaran)`: `PENGANTAR` aktif && `$pengantaran->id_petugas_antar === $user->actorId()`.
   - `updateItemStatus(User $user, Pengantaran $pengantaran)`: `PENGANTAR` aktif && `$pengantaran->id_petugas_antar === $user->actorId()`.
   - `jadwalkanUlang(User $user, Pengantaran $pengantaran)`: `PETUGAS` aktif **atau** (`PENGANTAR` aktif && `$pengantaran->id_petugas_antar === $user->actorId()`).
2. **`TransaksiPolicy` *(tambahan Phase 3)***:
   - `pelunasan(User $user, Transaksi $transaksi)`: `PETUGAS` aktif.
   - `serahTerima(User $user, Transaksi $transaksi)`: `PETUGAS` aktif.
3. **`Gate::define('audit.viewAny', ...)` / `AuditLogPolicy`:**
   - `viewAny(User $user)`: `PETUGAS` aktif.

### 3.3 Kontrak Validasi FormRequest

1. **`StorePengantaranRequest`** *(Otorisasi: `PETUGAS` aktif)*:
   - `id_petugas_antar`: `['required', 'integer', 'exists:petugas_pengantaran,id_petugas_antar']`
   - `tanggal_pengantaran`: `['required', 'date', 'after_or_equal:today']`
   - `nomor_nota_list`: `['required', 'array', 'min:1']`
   - `nomor_nota_list.*`: `['required', 'string', 'distinct', 'exists:transaksi,nomor_nota']` *(normalisasi trim di `prepareForValidation()`)*
2. **`UpdateItemPengantaranStatusRequest`** *(Otorisasi: `PENGANTAR` aktif)*:
   - `status_terima_pelanggan`: `['required', 'string', Rule::in(StatusItemPengantaran::values())]` *(uppercased di `prepareForValidation()`)*
   - `alasan_gagal`: `['nullable', 'required_if:status_terima_pelanggan,GAGAL', 'string', 'min:5', 'max:1000']` *(trimmed; empty string dinormalisasi `null`)*
3. **`JadwalkanUlangRequest`** *(Otorisasi: `PETUGAS` aktif atau `PENGANTAR` aktif)*:
   - `tanggal_pengantaran`: `['required', 'date', 'after_or_equal:today']`
   - `id_petugas_antar`: `['nullable', 'integer', 'exists:petugas_pengantaran,id_petugas_antar']` *(empty string dinormalisasi `null`)*
4. **`StorePelunasanRequest`** *(Otorisasi: `PETUGAS` aktif)*:
   - `nominal_bayar`: `['required', 'numeric', 'gt:0', 'max:999999999.99', 'decimal:0,2']`
   - `redirect_to`: `['nullable', 'string', Rule::in(['transaksi.show', 'serah-terima'])]`
5. **`SerahTerimaRequest`** *(Otorisasi: `PETUGAS` aktif)*:
   - `catatan`: `['nullable', 'string', 'max:500']`
   - `redirect_to`: `['nullable', 'string', Rule::in(['transaksi.show', 'serah-terima'])]`

### 3.4 Kontrak TypeScript Strict (`resources/js/types/index.ts`)

```ts
export type StatusPengantaran = 'DIJADWALKAN' | 'BERJALAN' | 'SELESAI';
export type StatusItemPengantaran =
    | 'MENUNGGU'
    | 'DIAMBIL'
    | 'DALAM_PERJALANAN'
    | 'DITERIMA'
    | 'GAGAL';

export interface KurirOption {
    id_petugas_antar: number;
    nama_petugas_antar: string;
    is_active: boolean;
}

export interface ItemPengantaranSummary {
    id_item_antar: number;
    id_pengantaran: number;
    nomor_nota: string;
    status_terima_pelanggan: StatusItemPengantaran;
    alasan_gagal: string | null;
    waktu_update: string | null;
    pengantaran?: {
        id_pengantaran: number;
        id_petugas_antar: number;
        tanggal_pengantaran: string;
        status_pengantaran: StatusPengantaran;
        nama_petugas_antar: string;
    } | null;
}

export interface ItemPengantaranDetail extends ItemPengantaranSummary {
    bisa_jadwalkan_ulang: boolean;
    status_berikutnya: StatusItemPengantaran[];
    transaksi: {
        nomor_nota: string;
        status_transaksi: StatusTransaksi;
        status_pembayaran: StatusPembayaran;
        total_harga: string;
        total_dibayar: string;
        sisa_tagihan: string;
        diambil_pada: string | null;
        pelanggan: Pick<
            PelangganItem,
            'id_pelanggan' | 'nama' | 'no_telepon' | 'alamat' | 'boleh_bayar_akhir'
        >;
        layanan: Pick<
            JenisLayananItem,
            'id_layanan' | 'nama_layanan' | 'tingkat_kecepatan' | 'satuan'
        >;
        berat_atau_jumlah: string;
        detail_pakaian_count: number;
    };
}

export interface PengantaranSummary {
    id_pengantaran: number;
    id_petugas_antar: number;
    tanggal_pengantaran: string;
    status_pengantaran: StatusPengantaran;
    created_at: string;
    updated_at: string;
    petugas_pengantaran: {
        id_petugas_antar: number;
        nama_petugas_antar: string;
    };
    total_item: number;
    item_selesai_count: number;
    item_gagal_count: number;
    items: ItemPengantaranDetail[];
}

export interface EligiblePengantaranTransaksiOption {
    nomor_nota: string;
    tanggal_penerimaan: string;
    total_harga: string;
    total_dibayar: string;
    sisa_tagihan: string;
    status_pembayaran: StatusPembayaran;
    insiden_pending_count: number;
    has_previous_failed_delivery: boolean;
    pelanggan: Pick<
        PelangganItem,
        'id_pelanggan' | 'nama' | 'no_telepon' | 'alamat' | 'boleh_bayar_akhir'
    >;
    layanan: Pick<
        JenisLayananItem,
        'id_layanan' | 'nama_layanan' | 'tingkat_kecepatan' | 'satuan'
    >;
    berat_atau_jumlah: string;
}

export interface PengantaranIndexProps extends SharedPageProps {
    pengantaran: Paginated<PengantaranSummary>;
    filters: {
        search: string;
        status_pengantaran: StatusPengantaran | '';
        tanggal_pengantaran: string;
        id_petugas_antar: string;
    };
    kurirOptions: KurirOption[];
    eligibleTransaksiOptions: EligiblePengantaranTransaksiOption[];
    statusCounts: Record<StatusPengantaran, number>;
}

export interface PengantaranShowProps extends SharedPageProps {
    pengantaran: PengantaranSummary;
    kurirOptions: KurirOption[];
}

export interface SerahTerimaIndexProps extends SharedPageProps {
    transaksi: Paginated<TransaksiDetail>;
    filters: {
        search: string;
        mode: 'SIAP_AMBIL' | 'PIUTANG' | 'RIWAYAT_DIAMBIL';
    };
    summary: {
        siap_ambil_count: number;
        sedang_diantar_count: number;
        piutang_count: number;
        total_piutang_nominal: string;
    };
}

export interface PiutangTransaksiItem {
    nomor_nota: string;
    diambil_pada: string;
    total_harga: string;
    total_dibayar: string;
    sisa_tagihan: string;
    status_pembayaran: StatusPembayaran;
    pelanggan: Pick<
        PelangganItem,
        'id_pelanggan' | 'nama' | 'no_telepon' | 'boleh_bayar_akhir'
    >;
    layanan: Pick<JenisLayananItem, 'id_layanan' | 'nama_layanan' | 'tingkat_kecepatan'>;
}

export interface AuditIndexProps extends SharedPageProps {
    logs: Paginated<AuditLogItem>;
    filters: {
        search: string;
        action: string;
        actor_role: UserRole | '';
    };
    availableActions: string[];
    piutangSummary: {
        total_nota_piutang: number;
        total_nominal_piutang: string;
        items: PiutangTransaksiItem[];
    };
}

// Tambahan non-breaking pada TransaksiDetail (seluruh field Phase 1 & 2 tetap utuh):
export interface TransaksiDetailPhase3Additions {
    bisa_pelunasan: boolean;
    bisa_serah_terima_loket: boolean;
    sedang_diantar_kurir: boolean;
    pengantaran_aktif: ItemPengantaranSummary | null;
    riwayat_pengantaran: ItemPengantaranSummary[];
}

// Pembaruan non-breaking Dashboard Summary Phase 3:
export interface DashboardPetugasSummary {
    role: 'PETUGAS';
    total_pelanggan: number;
    total_layanan_aktif: number;
    total_voucher_tersedia: number;
    transaksi_aktif: number;
    transaksi_belum_lunas: number;
    insiden_menunggu_konfirmasi: number;
    transaksi_selesai_siap_ambil: number;
    pengantaran_aktif: number;
    piutang_belum_lunas: number;
    piutang_nominal_total: string;
}

export interface DashboardPengantarSummary {
    role: 'PENGANTAR';
    jadwal_pengantaran_aktif: number;
    item_pengantaran_aktif: number;
    item_terkirim_hari_ini: number;
    item_gagal_perlu_tindak_lanjut: number;
}
```

### 3.5 Panduan Perubahan UI (`P3-04`)

1. **`AppLayout.tsx`:**
   - `PETUGAS`: aktifkan `/pengantaran` (`Pengantaran`), `/serah-terima` (`Serah Terima`), dan tambahkan `/audit` (`Audit & Piutang`); hapus seluruh badge `'Phase 3'` & `disabled: true`.
   - `PENGANTAR`: aktifkan `/pengantaran` (`Jadwal Pengantaran`), hapus badge `'Phase 3'` & `disabled: true`.
2. **`StatusBadge.tsx` & `lib/format.ts`:**
   - Tambahkan `PengantaranStatusBadge` (`DIJADWALKAN`, `BERJALAN`, `SELESAI`) & `ItemPengantaranStatusBadge` (`MENUNGGU`, `DIAMBIL`, `DALAM_PERJALANAN`, `DITERIMA`, `GAGAL`).
   - Tambahkan label `AUDIT_ACTION_LABELS` di `format.ts` untuk `PENGANTARAN_CREATED`, `PENGANTARAN_STARTED`, `ITEM_PENGANTARAN_UPDATED`, `PENGANTARAN_RESCHEDULED` (`PELUNASAN_RECORDED` dan `SERAH_TERIMA` sudah tersedia).
3. **`LaporkanInsidenModal.tsx`:**
   - Ganti `(compensationPreview.basisCents / 100).toFixed(2)` pada baris 406–410 menjadi `centsToDecimalString(compensationPreview.basisCents)` (tindak lanjut non-blocking Phase 2).
4. **Halaman Baru & Diperbarui:**
   - `Pengantaran/Index.tsx` & `Pengantaran/Show.tsx`: form Buat Jadwal multi-pelanggan untuk `PETUGAS`, tombol `Mulai Pengantaran` (`DIJADWALKAN -> BERJALAN`), kartu per `ItemPengantaran` dengan progres berurutan, modal/peringatan `KK-06` saat mencoba `DITERIMA` untuk nota belum lunas non-paylater, modal `Tandai Gagal` (`alasan_gagal` min 5 karakter), dan modal `Jadwalkan Ulang (KK-07)`.
   - `SerahTerima/Index.tsx`: tab `Siap Diambil (SELESAI)`, `Piutang (DIAMBIL Belum Lunas)`, dan `Riwayat Diambil`, serta `PelunasanModal` & `SerahTerimaModal` (`KK-06`).
   - `Transaksi/Show.tsx`: tombol & modal `Catat Pelunasan` dan `Serah Terima Pakaian (KK-06)` serta kartu `Riwayat Pengantaran` (termasuk alasan gagal bila ada).
   - `Audit/Index.tsx`: tabel `AuditLog` terpaginasi + filter (`search`, `action`, `actor_role`) + kartu ringkasan piutang pelanggan `boleh_bayar_akhir`.
   - `Dashboard/Index.tsx`: ganti banner *Roadmap Phase 3* `PENGANTAR` menjadi kartu KPI nyata + quick action ke `/pengantaran`; tambahkan kartu `Pengantaran Aktif` & `Piutang Belum Lunas` pada dashboard `PETUGAS`.

---

## 4. Acceptance Criteria Phase 3 (`AC-P3-01` s.d. `AC-P3-12`)

| ID | Referensi SRS / Task | Kriteria Penerimaan Terukur (Happy, Boundary/KK, Unhappy) |
| --- | --- | --- |
| **`AC-P3-01`** | `P3-02`, RBAC & Isolasi Kurir | `GET /pengantaran` hanya dapat diakses `PETUGAS` dan `PENGANTAR` (`PEGAWAI` ditolak `403`); `PENGANTAR` hanya melihat dan mengakses sesi `Pengantaran` miliknya (`id_petugas_antar === actorId`), ditolak `403` saat melihat/memulai/mengubah/menjadwalkan ulang sesi milik kurir lain; query list & detail bebas N+1. |
| **`AC-P3-02`** | `UC-14`, `FR-09`, `P3-02` | `POST /pengantaran` oleh `PETUGAS` (`PENGANTAR`/`PEGAWAI` ditolak `403`) membuat 1 sesi `Pengantaran(DIJADWALKAN)` yang menampung $\ge 2$ `Transaksi` `SELESAI` lintas pelanggan melalui `ItemPengantaran(MENUNGGU)`; menolak `422` transaksi berstatus `AKTIF`/`DIAMBIL`/`DIBATALKAN`, nota duplikat, nota yang sudah punya `ItemPengantaran` `[MENUNGGU, DIAMBIL, DALAM_PERJALANAN, DITERIMA]`, atau kurir nonaktif. |
| **`AC-P3-03`** | `UC-14`, `FR-10`, `P3-02` | `POST /pengantaran/{pengantaran}/mulai` mengubah `DIJADWALKAN -> BERJALAN`; `POST /pengantaran/item/{item}/status` memindahkan status berurutan `MENUNGGU -> DIAMBIL -> DALAM_PERJALANAN -> DITERIMA | GAGAL` dengan `waktu_update` WIB; menolak `422` lompat/ulang/mundur tahap atau `GAGAL` tanpa `alasan_gagal` (min 5 karakter); otomatis menyinkronkan `Pengantaran.status_pengantaran` (`DIJADWALKAN`/`BERJALAN`/`SELESAI`). |
| **`AC-P3-04`** | `UC-14`, `FR-11`, **`KK-06`** | Transisi kurir `DALAM_PERJALANAN -> DITERIMA` memverifikasi `sisa_tagihan == '0.00' || boleh_bayar_akhir === true`; menolak `422` (rollback bersih) bila belum lunas & `!boleh_bayar_akhir`; saat sukses `DITERIMA`, otomatis menetapkan `Transaksi.status_transaksi = DIAMBIL`, `diambil_pada = now('Asia/Jakarta')`, `status_pembayaran = BELUM_LUNAS` bila masih ada piutang (`LUNAS` bila `0.00`), dan menulis `AuditLog`. |
| **`AC-P3-05`** | `UC-14`, **`KK-07`**, `FR-10` | `POST /pengantaran/item/{item}/jadwalkan-ulang` oleh `PETUGAS` atau `PENGANTAR` pemilik sesi hanya sah untuk `ItemPengantaran` `GAGAL`; membuat sesi `Pengantaran` baru (`DIJADWALKAN`) + `ItemPengantaran` baru (`MENUNGGU`); **100% mengisolasi** status item lain di sesi asal (`DITERIMA`/`DALAM_PERJALANAN` tetap utuh); menolak `422` double-reschedule atau transaksi sudah `DIAMBIL`; menulis `AuditLog`. |
| **`AC-P3-06`** | `UC-01` (Pelunasan), `FR-05` | `POST /transaksi/{nota}/pembayaran` hanya dapat diakses `PETUGAS` (`PEGAWAI`/`PENGANTAR` ditolak `403`); mendukung pembayaran `0 < nominal_bayar <= sisa_tagihan` pada nota `AKTIF`, `SELESAI`, piutang `DIAMBIL` (`BELUM_LUNAS`), dan sisa `biaya_pembatalan` `DIBATALKAN`; menolak `422` nominal `<= 0`, overpayment, atau nota sudah lunas; menyimpan `Pembayaran(PELUNASAN)`, memanggil `updateStatusLunas()` (`-> LUNAS` bila `total_dibayar >= total_harga`), dan menulis `AuditLog(PELUNASAN_RECORDED)`. |
| **`AC-P3-07`** | `UC-02`, **`KK-06`**, `FR-11` | `POST /transaksi/{nota}/serah-terima` oleh `PETUGAS` wajib memastikan `status_transaksi === SELESAI` (`422` jika `AKTIF`/`DIAMBIL`/`DIBATALKAN`); menolak `422` bila ada `ItemPengantaran` `DIAMBIL`/`DALAM_PERJALANAN` (dan menutup otomatis item `MENUNGGU` menjadi `GAGAL` + resync sesi); memblokir `422` bila `sisa_tagihan > 0 && !boleh_bayar_akhir`; mengizinkan bila `boleh_bayar_akhir === true` sambil menjaga status `BELUM_LUNAS`, set `DIAMBIL` + `diambil_pada` WIB, dan menulis `AuditLog(SERAH_TERIMA)`. |
| **`AC-P3-08`** | **`KK-01`**, **`KK-02`**, **`KK-04`**, **`KK-05`**, **`KK-08`** | Pembayaran pelunasan dan verifikasi serah terima terbukti akurat memakai `sisa_tagihan` final pasca penyesuaian (`total_kompensasi`, `timbangUlang`, `ubahLayanan`, `biaya_pembatalan`) dengan `DecimalMoney` tanpa `float`/`bcmath`. |
| **`AC-P3-09`** | `P3-03`, Audit & Dashboard | `GET /audit` (`role:PETUGAS`, `PEGAWAI`/`PENGANTAR` `403`) menyediakan paginasi `AuditLog` dengan filter `search`, `action`, `actor_role`, serta ringkasan piutang `boleh_bayar_akhir` belum lunas tanpa N+1; `DashboardController` menyajikan KPI nyata untuk `PENGANTAR` & `PETUGAS` tanpa merusak kontrak Phase 1–2. |
| **`AC-P3-10`** | `P3-04`, UI Phase 3 & Cleanup | `Pengantaran/{Index,Show}.tsx`, `SerahTerima/Index.tsx`, `Audit/Index.tsx`, `Transaksi/Show.tsx`, `Dashboard/Index.tsx`, `AppLayout.tsx`, `StatusBadge.tsx`, `lib/format.ts`, dan `types/index.ts` sinkron 100% dengan kontrak §3; `LaporkanInsidenModal.tsx` memakai `centsToDecimalString()`; `npx tsc --noEmit` & `npm run build` lulus `0` error. |
| **`AC-P3-11`** | `P3-05`, Security & NFR | Audit keamanan lintas 3 peran (RBAC `403`, kepemilikan sesi kurir, CSRF, mass-assignment `$fillable`), pengecekan N+1 query (`<= 20` query di seluruh halaman list/detail), validasi `DECIMAL(12,2)`, dan verifikasi backup/restore MySQL 8.4 (`mysqldump` + restore/migrate bersih) lulus 100%. |
| **`AC-P3-12`** | `P3-05`, UAT Penuh & Closing | `Phase3EndToEndTest.php` lulus tanpa `$this->withoutVite()` dan `0` `shouldExist: false`; seluruh **14 Use Case (`UC-01`..`UC-14`)**, **9 Kondisi Khusus (`KK-01`..`KK-09`)**, serta 6 Gerbang Kualitas (`napkin/PR_REVIEW_LIFECYCLE.md`) diverifikasi `PASS` pada `PHASE_3_CLOSING_EVIDENCE.md`, `MEMORY.md`, dan `WRITE.md`. |

---

## 5. Matriks UAT Lengkap — 14 Use Case & 9 Kondisi Khusus SRS CleanWash

### 5.1 Matriks UAT 14 Use Case (`UC-01` s.d. `UC-14`)

| ID UAT | Use Case SRS | Aktor | Skenario Uji Inti (Happy & Boundary/Unhappy) | Target Endpoint / Service | Cakupan Test Otomatis | Kriteria Lulus (`PASS`) |
| --- | --- | --- | --- | --- | --- | --- |
| **`UAT-UC-01`** | **UC-01**: Mengelola Pembayaran (DP & Pelunasan) | Petugas | Catat DP saat penerimaan (`BELUM_BAYAR`/`DP`/`LUNAS`), catat pelunasan penuh/parsial sisa tagihan (termasuk nota `BELUM_LUNAS` piutang & sisa `biaya_pembatalan`), tolak overpayment `422`. | `POST /transaksi`, `POST /transaksi/{nota}/pembayaran`, `PembayaranService` | `TransaksiReceptionTest`, `PembayaranServiceTest`, `PembayaranAndSerahTerimaTest`, `Phase1EndToEndTest`, `Phase3EndToEndTest` | Record `Pembayaran` (`DP`/`PELUNASAN`) tersimpan presisi `DECIMAL(12,2)`, `status_pembayaran -> LUNAS` saat `sisa == 0.00`, overpay ditolak `422`. |
| **`UAT-UC-02`** | **UC-02**: Mengelola Pengambilan Pakaian | Petugas | Verifikasi nota `SELESAI`, blokir jika masih `AKTIF`/`DIAMBIL`/`DIBATALKAN` atau sedang dibawa kurir (`DIAMBIL`/`DALAM_PERJALANAN`), blokir jika belum lunas & `!boleh_bayar_akhir`, serahkan jika lunas atau `boleh_bayar_akhir=true`. | `GET /serah-terima`, `POST /transaksi/{nota}/serah-terima`, `SerahTerimaService` | `SerahTerimaServiceTest`, `PembayaranAndSerahTerimaTest`, `Phase3EndToEndTest` | `status_transaksi -> DIAMBIL`, `diambil_pada` WIB terisi, `status_pembayaran -> BELUM_LUNAS` bila ada piutang, `AuditLog(SERAH_TERIMA)` tercatat. |
| **`UAT-UC-03`** | **UC-03**: Mengelola Voucher | Petugas | CRUD voucher (`nomor_voucher` uppercase unik, `nilai > 0`, `masa_berlaku`), filter status efektif (`TERSEDIA`/`SUDAH_DIGUNAKAN`/`KEDALUWARSA`), proteksi ubah/hapus voucher `SUDAH_DIGUNAKAN`. | `RESOURCE /voucher`, `POST /voucher/validate`, `VoucherService` | `MasterVoucherTest`, `VoucherAtomicLockTest`, `Phase1EndToEndTest` | CRUD berfungsi penuh; voucher `SUDAH_DIGUNAKAN` aman dari mutasi/hapus ilegal; deteksi kedaluwarsa WIB akurat. |
| **`UAT-UC-04`** | **UC-04**: Mengelola Data Pelanggan | Petugas | CRUD pelanggan termasuk flag `boleh_bayar_akhir`, tolak `no_telepon` duplikat (`422`), tolak hapus pelanggan yang sudah punya `Transaksi` (`422`). | `RESOURCE /pelanggan`, `PelangganService` | `MasterPelangganTest`, `Phase1EndToEndTest` | Data pelanggan tersimpan, flag `boleh_bayar_akhir` akurat, relasi transaksi terlindungi. |
| **`UAT-UC-05`** | **UC-05**: Mengelola Jenis Layanan | Petugas | CRUD layanan (`REGULER`/`EXPRESS`, `BERAT<->kg`, `JUMLAH<->pcs`), sinkronisasi `TahapLayanan` otomatis (`perlu_setrika=true` vs `false`), tolak hapus layanan terpakai transaksi. | `RESOURCE /layanan`, `JenisLayananService` | `MasterJenisLayananTest`, `Phase1EndToEndTest` | Layanan sepatu (`perlu_setrika=false`) tidak memiliki tahap `DISETRIKA`; aturan pasangan metode/satuan terjaga. |
| **`UAT-UC-06`** | **UC-06**: Mengelola Transaksi Laundry (Base) | Petugas | Penerimaan transaksi baru, penerbitan `nomor_nota` unik `CW-YYYYMMDD-XXXX`, cetak nota `@media print`, filter daftar nota, serta RBAC `403` untuk `PEGAWAI`/`PENGANTAR`. | `GET/POST /transaksi`, `GET /transaksi/{nota}`, `GET /transaksi/{nota}/nota` | `TransaksiReceptionTest`, `Phase1EndToEndTest`, `Phase2EndToEndTest` | Nota diterbitkan & dicetak lengkap sesuai data MySQL 8.4; aktor non-Petugas ditolak `403`. |
| **`UAT-UC-07`** | **UC-07**: Mencatat Detail Pakaian (`<<include>>` UC-06) | Petugas | Input minimal 1 baris `DetailPakaian` (`jenis_pakaian`, `jumlah_potong`, `kondisi_pakaian`), tolak payload kosong (`detail_pakaian = []`) dengan `422`. | `POST /transaksi`, `TransaksiService::buatTransaksi()` | `TransaksiReceptionTest`, `Phase1EndToEndTest` | Setiap baris `DetailPakaian` tersimpan dan tertaut FK cascade ke `transaksi.nomor_nota`. |
| **`UAT-UC-08`** | **UC-08**: Menghitung Biaya Laundry (`<<include>>` UC-06) | Petugas | Hitung biaya `BERAT` (`kg` desimal) & `JUMLAH` (`pcs` bulat wajib), salin `harga_satuan_snapshot`, kurangi voucher & kompensasi dengan `DecimalMoney`. | `TransaksiService`, `DecimalMoney` | `DecimalMoneyTest`, `TransaksiReceptionTest`, `Phase1EndToEndTest` | Seluruh subtotal, total harga, dan sisa tagihan konsisten tanpa float drift (`0.00` floor). |
| **`UAT-UC-09`** | **UC-09**: Menerapkan Voucher (`<<extend>>` UC-06) | Petugas | Validasi live `POST /voucher/validate`, klaim atomik `lockForUpdate()` dalam `DB::transaction()`, ubah status `SUDAH_DIGUNAKAN`, tolak klaim ganda/konkuren. | `POST /voucher/validate`, `VoucherService::validasiDanKunci()` | `VoucherAtomicLockTest`, `VoucherConcurrencyTest`, `Phase1EndToEndTest` | Tepat 1 transaksi sukses pada race condition; voucher terikat aman ke 1 nota. |
| **`UAT-UC-10`** | **UC-10**: Membatalkan / Mengubah Layanan (`<<extend>>` UC-06) | Petugas | Ubah layanan di `DITERIMA`/`DICUCI` (snapshot tarif baru & selisih biaya), batal gratis + lepas voucher di `DITERIMA`, batal berbiaya `50%` pasca `DICUCI`, tolak di `SELESAI`. | `POST /transaksi/{nota}/ubah-layanan`, `POST /transaksi/{nota}/batalkan` | `TransaksiAdjustmentServiceTest`, `TransaksiAdjustmentTest`, `Phase2EndToEndTest` | `ubahLayanan()` dan `batalkanTransaksi()` mematuhi batas tahap produksi dan melepaskan `nomor_voucher` secara aman. |
| **`UAT-UC-11`** | **UC-11**: Memperbarui Status Produksi (Base) | Pegawai | Majukan tahap produksi berurutan sesuai `TahapLayanan`, simpan `id_pegawai` & `waktu_update` WIB, otomatis set `SELESAI`, tolak lompat tahap/`DISETRIKA` pada sepatu. | `GET /produksi`, `POST /produksi/{nota}/status`, `ProduksiService` | `ProduksiServiceTest`, `ProduksiOperationTest`, `Phase2EndToEndTest` | State machine produksi dinamis per layanan berjalan 100% tanpa pelanggaran urutan. |
| **`UAT-UC-12`** | **UC-12**: Mencatat Penimbangan Ulang (`<<extend>>` UC-11) | Pegawai | Input berat aktual pada nota `BERAT` tahap `DITERIMA`, hitung ulang harga memakai `harga_satuan_snapshot`, sesuaikan `status_pembayaran`, tolak `JUMLAH` & pasca `DITERIMA`. | `POST /produksi/{nota}/timbang-ulang`, `ProduksiService::timbangUlang()` | `ProduksiServiceTest`, `ProduksiOperationTest`, `Phase2EndToEndTest` | Berat & tagihan terbarui otomatis beserta `AuditLog(TIMBANG_ULANG)`. |
| **`UAT-UC-13`** | **UC-13**: Membuat Laporan Kerusakan/Kehilangan (`<<extend>>` UC-11) | Pegawai / Petugas | `PEGAWAI` ajukan laporan (`MENUNGGU_KONFIRMASI`) & `PETUGAS` konfirmasi/potong saldo kompensasi (`5×`/`10×` prorata `DetailPakaian`) termasuk kelebihan ganti rugi tanpa double-counting. | `GET/POST /insiden`, `POST /transaksi/{nota}/insiden`, `POST /insiden/{laporan}/konfirmasi` | `KompensasiServiceTest`, `InsidenTest`, `Phase2EndToEndTest` | `PEGAWAI` ditolak `403` saat konfirmasi; `id_detail` wajib milik nota; saldo & pengembalian terhitung akurat. |
| **`UAT-UC-14`** | **UC-14**: Mengelola Pengantaran & Status (`<<extend>>` Jadwalkan Ulang) | Petugas & Petugas Pengantaran | `PETUGAS` buat jadwal multi-pelanggan; kurir mulai pengantaran, perbarui status item `MENUNGGU -> DIAMBIL -> DALAM_PERJALANAN -> DITERIMA | GAGAL`, serah terima `DITERIMA` (`KK-06`), dan `jadwalkanUlang()` item gagal secara independen (`KK-07`). | `GET/POST /pengantaran`, `POST /pengantaran/{id}/mulai`, `POST /pengantaran/item/{id}/status`, `POST /pengantaran/item/{id}/jadwalkan-ulang` | `PengantaranServiceTest`, `PengantaranOperationTest`, `Phase3EndToEndTest` | Multi-pelanggan terkelola dalam 1 sesi; `Pengantaran.status_pengantaran` tersinkron otomatis; `jadwalkanUlang()` terisolasi penuh. |

### 5.2 Matriks UAT 9 Kondisi Khusus (`KK-01` s.d. `KK-09`)

| ID KK | Kondisi Khusus SRS | Skenario Pengujian & Edge Case | Cakupan Test Otomatis | Invarian Wajib Terbukti |
| --- | --- | --- | --- | --- |
| **`KK-01`** | **Berat berubah setelah timbang ulang** | Nota `BERAT` sudah `LUNAS` (`2.00 kg`), `Pegawai` melakukan `timbangUlang(3.50 kg)` di tahap `DITERIMA` saat tarif master sudah berubah; juga uji timbang turun menyebabkan `kelebihan_bayar_tunai`. | `ProduksiServiceTest`, `ProduksiOperationTest`, `Phase2EndToEndTest`, `Phase3EndToEndTest` | Berat terbaru tersimpan, tagihan dihitung ulang memakai `harga_satuan_snapshot`, `status_pembayaran` turun `LUNAS -> BELUM_LUNAS`, dan sisa tagihan baru bisa dilunasi di Phase 3. |
| **`KK-02`** | **Perubahan layanan saat proses berjalan** | `Petugas` mengubah layanan pada tahap `DITERIMA`/`DICUCI` (termasuk pindah `BERAT <-> JUMLAH`); uji penolakan `422` pada tahap `DIKERINGKAN`/`DISETRIKA`/`SELESAI`. | `TransaksiAdjustmentServiceTest`, `TransaksiAdjustmentTest`, `Phase2EndToEndTest` | Tahap `DIKERINGKAN+` ditolak `422`; layanan baru menyalin `harga_satuan_snapshot` baru dan merekonsiliasi selisih tagihan + status bayar. |
| **`KK-03`** | **Voucher kedaluwarsa atau sudah terpakai** | Uji `POST /voucher/validate` & `POST /transaksi` dengan voucher tidak ada, kedaluwarsa (`masa_berlaku < today WIB`), sudah dipakai, serta 2 proses konkuren mengklaim voucher yang sama. | `MasterVoucherTest`, `VoucherAtomicLockTest`, `VoucherConcurrencyTest`, `Phase1EndToEndTest` | Seluruh kasus invalid ditolak `422`; pada uji konkurensi InnoDB `FOR UPDATE`, tepat 1 transaksi berhasil dan pesaing rollback bersih. |
| **`KK-04`** | **Pakaian rusak selama proses** | `Pegawai` melaporkan 1 item `DetailPakaian` `RUSAK`, `Petugas` mengonfirmasi kompensasi (`5×` basis prorata item), termasuk multi-insiden melebihi sisa tagihan. | `KompensasiServiceTest`, `InsidenTest`, `Phase2EndToEndTest` | Tertaut ke `id_detail` spesifik nota terkait; saldo `total_harga` terpotong, `status_pembayaran -> LUNAS` bila sisa `0`, dan `kelebihan_ganti_rugi` bebas double-counting. |
| **`KK-05`** | **Pakaian hilang selama proses** | Laporan `HILANG` (`10×` basis prorata item) pada 1 `DetailPakaian`; uji `id_detail` silang nota & nota `DIAMBIL`/`DIBATALKAN` ditolak `422`. | `KompensasiServiceTest`, `InsidenTest`, `Phase2EndToEndTest` | Nilai kompensasi `10×`, kelebihan ganti rugi dicatat bila > sisa tagihan, cross-nota ditolak `422`, dan sisa akhir konsisten pada pelunasan Phase 3. |
| **`KK-06`** | **Pengambilan sebelum pelunasan** | Pelanggan reguler (`boleh_bayar_akhir = false`) vs pelanggan khusus (`boleh_bayar_akhir = true`) dengan `sisa_tagihan > 0` mencoba serah terima baik di **loket kasir** (`POST /transaksi/{nota}/serah-terima`) maupun via **kurir** (`DALAM_PERJALANAN -> DITERIMA`), lalu pelanggan `boleh_bayar_akhir = true` melunasi piutang sesudahnya. | `SerahTerimaServiceTest`, `PengantaranServiceTest`, `PembayaranAndSerahTerimaTest`, `PengantaranOperationTest`, `Phase3EndToEndTest` | Pelanggan reguler belum lunas **diblokir `422`** di loket & kurir; pelanggan `boleh_bayar_akhir = true` lolos (`status_transaksi = DIAMBIL`, `status_pembayaran = BELUM_LUNAS`, `diambil_pada` terisi), masuk daftar piutang `/audit` & `/serah-terima`, lalu berubah `LUNAS` setelah `catatPelunasan()`. |
| **`KK-07`** | **Pengantaran multi-pelanggan & gagal antar** | 1 sesi `Pengantaran` berisi Nota A (Pelanggan 1) dan Nota B (Pelanggan 2); Nota A `DITERIMA`, Nota B `GAGAL` (wajib `alasan_gagal`) lalu dijadwalkan ulang via `jadwalkanUlang()` ke sesi &/atau kurir baru; uji juga penolakan double-reschedule & item non-`GAGAL`. | `PengantaranServiceTest`, `PengantaranOperationTest`, `Phase3EndToEndTest` | Nota A tetap `DITERIMA` / `DIAMBIL` tidak tersentuh; `ItemPengantaran` asal Nota B tetap `GAGAL`; sesi baru (`DIJADWALKAN`) + item baru (`MENUNGGU`) tercipta bersih untuk Nota B saja. |
| **`KK-08`** | **Pembatalan setelah pencucian dimulai** | Batal di `DITERIMA` (gratis + lepas atomik `nomor_voucher` agar siap dipakai ulang) vs batal setelah `DICUCI`/`DIKERINGKAN`/`DISETRIKA` (tolak gratis `422`, biaya `50%`, voucher tetap `SUDAH_DIGUNAKAN`, sisa `biaya_pembatalan` tetap bisa dilunasi), dan tolak di `SELESAI`. | `TransaksiAdjustmentServiceTest`, `TransaksiAdjustmentTest`, `Phase2EndToEndTest`, `PembayaranAndSerahTerimaTest` | Batal di `DITERIMA` melepaskan voucher tanpa error `UNIQUE(nomor_voucher)`; batal pasca `DICUCI` menolak gratis `422`; nota `DIBATALKAN` dikecualikan dari pengantaran & serah terima. |
| **`KK-09`** | **Harga layanan berubah setelah transaksi dibuat** | Naikkan/ubah `JenisLayanan.harga_satuan` di master setelah nota terbit, lalu uji pembacaan nota, cetak nota, `timbangUlang()`, `hitungKompensasi()`, `catatPelunasan()`, dan `serahkanPakaian()`. | `TransaksiReceptionTest`, `Phase1EndToEndTest`, `ProduksiServiceTest`, `Phase2EndToEndTest`, `Phase3EndToEndTest` | Tarif master baru tidak pernah mengubah `harga_satuan_snapshot`, `total_harga`, maupun `sisa_tagihan` transaksi lama sepanjang siklus Phase 1–3. |

---

## 6. Audit Keamanan, NFR & Checklist Phase 3 Closing Gate (`P3-05`)

1. **Checklist Hardening Keamanan & NFR (`P3-05`):**
   - **RBAC & Resource Ownership:** Uji eksplisit `403` lintas semua role (`PETUGAS`, `PEGAWAI`, `PENGANTAR`) dan antar sesama `PENGANTAR` (`Kurir B` mengakses sesi/item `Kurir A` $\rightarrow$ `403`), serta akun `is_active = false` $\rightarrow$ `403`.
   - **CSRF & Mass-Assignment:** Verifikasi seluruh endpoint `POST/PUT/DELETE` terproteksi CSRF Laravel, seluruh input melalui `FormRequest`, dan seluruh 16 Eloquent Model memiliki `$fillable` eksplisit.
   - **Zero N+1 & Query Budget:** Gunakan `DB::enableQueryLog()` di feature test untuk memastikan halaman `GET /pengantaran`, `GET /pengantaran/{id}`, `GET /serah-terima`, `GET /audit`, dan `GET /dashboard` beroperasi dengan eager loading `<= 20` queries.
   - **Presisi Desimal:** Audit `rg` di `app/` untuk memastikan 0 penggunaan `floatval`, `(float)`, `(double)`, `bcadd`/`bcmul`/`bcsub`/`bcdiv`; seluruh kolom uang di MySQL 8.4 tetap `DECIMAL(12,2)`.
   - **Backup & Restore Integrity Check:** Verifikasi prosedur backup/restore DB di MySQL 8.4 port `3307` (`mysqldump` dari `cleanwash` / `cleanwash_testing` $\rightarrow$ restore uji atau `migrate:rollback && migrate --seed` + verifikasi baris tetap konsisten) dan dokumentasikan hasilnya di `docs/phases/PHASE_3_CLOSING_EVIDENCE.md`.
2. **6 Gerbang Kualitas Mutlak (`napkin/PR_REVIEW_LIFECYCLE.md`):**
   - `./vendor/bin/pint --test` $\rightarrow$ `exit code 0`
   - `npx tsc --noEmit` $\rightarrow$ `exit code 0`
   - `npm run build` $\rightarrow$ `exit code 0`
   - `php artisan test` $\rightarrow$ `100% passed` (`0` failed, `0` skipped, `0` `shouldExist: false`, termasuk `Phase1EndToEndTest`, `Phase2EndToEndTest`, dan `Phase3EndToEndTest` tanpa `$this->withoutVite()`)
   - `php artisan migrate --no-interaction && php artisan migrate:rollback --no-interaction && php artisan migrate --seed --no-interaction` $\rightarrow$ `exit code 0`
   - Audit hygiene (`0` `dd`/`dump`/`var_dump`, `0` `console.log`, `0` `: any`, `git status` bebas `.env`/secret/build artifacts), update `WRITE.md` & `MEMORY.md`, dan sign-off final oleh `product-manager`.
