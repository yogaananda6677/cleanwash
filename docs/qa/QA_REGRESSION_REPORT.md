# QA Live Browser Regression Report — CleanWash

**Tanggal Eksekusi:** 11 November 2026 (WIB / `Asia/Jakarta`)  
**Cabang Git:** `feature/ui-ux-designer-redesign` (UI/UX Overhaul Re-Verification Post-Fix)  
**Target Live Server:** `http://127.0.0.1:8000` (`public/build/manifest.json` produksi aktif, tanpa `public/hot`)  
**Database Live:** MySQL 8.4 (`cleanwash-mysql` port `3307`, schema `cleanwash`)  
**Browser Automation:** Playwright `1.65.0` (Chromium headless, `1440×900` desktop & `390×844` mobile)  
**Status Akhir:** **PASS — 0 Blocker / 0 Major / 0 Minor (Seluruh Defect & Observasi `CLOSED`)**

---

## 1. Ringkasan Eksekusi & Audit Kualitas

| Pemeriksaan | Command | Hasil Aktual | Catatan |
| :--- | :--- | :--- | :--- |
| **Pre-flight Live Server & Assets** | `curl http://127.0.0.1:8000/login` & check manifest | **HTTP 200** | `public/build/manifest.json` aktif (`38.869 bytes`, `11:26 WIB`), `public/hot` tidak ada, `cleanwash-mysql` Healthy |
| **Live Browser E2E Suite** | `npx playwright test --reporter=list` | **6 / 6 PASS** (`1.1m`) | `REG-00` s.d. `REG-05` dieksekusi serial langsung ke server live & DB `cleanwash` tanpa mock |
| **Bukti Visual Langkah Bisnis** | `docs/qa/screenshots/*.png` | **28 / 28 file** | Seluruh screenshot desktop & mobile (`390×844`) diregenerasi (`11:29–11:30 WIB`) & diinspeksi langsung (`view_file`) |
| **Zero-Silent-Failure Audit** | `RuntimeMonitor` (`qa-harness.ts`) | **0 error** | `0` uncaught `pageerror`, `0` JS/React `console.error`, `0` HTTP `419`, `0` HTTP `>= 500` (status `403`/`422` hanya saat negative-test terkontrol) |
| **Responsivitas Mobile (`390×844`)** | `scrollWidth <= innerWidth` | **PASS** | `/pengantaran/4`, `/dashboard` (Kurir & Petugas), & `/produksi` bebas horizontal overflow |
| **Quality Gate Baseline Branch** *(Entry `#028` & `#030`)* | `php artisan test`, `pint --test`, `tsc --noEmit`, `npm run build` | **114 passed** / **0 errors** | Terverifikasi pada branch `feature/ui-ux-designer-redesign` (`4156 assertions`, Vite `2750 modules transformed`) |

---

## 2. Matriks Cakupan Use Case (`UC-01`–`UC-14`) & Kondisi Khusus (`KK-01`–`KK-09`)

| Skenario E2E | Use Case Tercakup | Kondisi Khusus Tercakup | Aktor Uji | Status |
| :--- | :--- | :--- | :--- | :---: |
| **REG-00** (`3.9s`) | `UC-01`, `UC-02` | RBAC strict cross-role (`403`), guest redirect, login invalid (`422` pesan Indonesia) | Guest, Petugas, Pegawai, Kurir | PASS |
| **REG-01** (`15.4s`) | `UC-02`, `UC-03`, `UC-04`, `UC-05`, `UC-06`, `UC-07`, `UC-08`, `UC-11`, `UC-12` | `KK-01`, `KK-03`, `KK-06`, `KK-09` | Petugas, Pegawai, Kurir | PASS |
| **REG-02** (`7.1s`) | `UC-03`, `UC-06`, `UC-07`, `UC-09`, `UC-10` | `KK-04` (5× prorata), alur tanpa `DISETRIKA`, kelebihan ganti rugi | Petugas, Pegawai | PASS |
| **REG-03** (`7.7s`) | `UC-03`, `UC-05`, `UC-06`, `UC-07`, `UC-14` | `KK-02` (cross-method + voucher lock), `KK-08` (2 cabang batal: gratis di `DITERIMA` vs biaya 50% pasca-`DICUCI`), `KK-09` | Petugas, Pegawai | PASS |
| **REG-04** (`12.8s`) | `UC-03`, `UC-07`, `UC-11`, `UC-12`, `UC-13` | `KK-06` (`boleh_bayar_akhir = true` piutang), `KK-07` (reschedule independen tanpa mutasi sibling) | Petugas, Pegawai, Kurir | PASS |
| **REG-05** (`12.7s`) | `UC-03`, `UC-07`, `UC-11`, `UC-12`, `UC-13` | `KK-06`, anti-konflik serah terima loket vs kurir `DIAMBIL`, auto-close item `MENUNGGU -> GAGAL`, layout responsif `390×844` | Petugas, Pegawai, Kurir | PASS |

---

## 3. Verifikasi Perbaikan Audit `UX-01` s.d. `UX-08` & Status Defect

### 3.1 Status Audit `UX-01`–`UX-08`

| ID Audit | Kriteria Verifikasi | Hasil Inspeksi Screenshot Terbaru | Status |
| :--- | :--- | :--- | :---: |
| **`UX-01`** | Header `AppLayout` solid opaque (`bg-white`) tanpa teks membayang (*ghosting*) | Solid putih tanpa *ghosting* di seluruh halaman (`04`, `05`, `08`, `25`, `26`). | **VERIFIED** |
| **`UX-02`** | Sidebar desktop penuh tinggi dokumen (`lg:flex` + `bg-[#0F2933]`) | Penuh hingga dasar dokumen dari `y = 0` pada `05`, `08`, `25`, dan `26` tanpa celah putih kiri-atas. | **VERIFIED** |
| **`UX-03`** | Dashboard simetris tanpa 9 duplikat kartu & tanpa literal `\u2192` | `02` (4+4 KPI simetris + 4 compact action strip) & `03` (4 KPI + 2 action card, panah `→` asli). | **VERIFIED** |
| **`UX-04`** | Header mobile `390×844` di `Pengantaran/Show` tidak memotong `Sesi Peng...` / `Andi Kuri...` | `28`: `Sesi Pengantaran #4` dan `Kurir: Andi Kurir` terbaca penuh, tombol `← Kembali` berada di sub-bar rapi. | **VERIFIED** |
| **`UX-05`** | Pengurangan *badge fatigue* (2–3 badge + teks terstruktur / inline stepper) | Terlihat bersih pada `07` (layanan), `14` (produksi 2 badge + 4 tahap tanpa setrika), dan `24` (serah terima). | **VERIFIED** |
| **`UX-06`** | Tombol filter/voucher memakai Deep Petrol Teal `#0F2933` pengganti `bg-slate-900` | `Cek Voucher` (`04`), `Cari` (`07`, `24`), `Terapkan Filter` (`10`), `Terapkan` (`25`) seragam `#0F2933`. | **VERIFIED** |
| **`UX-07`** | Split Atelier Login & lokalisasi `auth.failed` ke Bahasa Indonesia | `01`: split layout bersih + pesan `"Email atau kata sandi tidak sesuai dengan data kami."` (observasi minor sebelumnya **CLOSED**). | **VERIFIED (CLOSED)** |
| **`UX-08`** | Font lokal (`Plus Jakarta Sans`, `JetBrains Mono tabular-nums`), border `#7C8C9D`, ikon `lucide-react` & bebas `+ +` ganda | Tipografi, kontras tombol `#0F766E`, ikon `lucide-react`, serta 1 ikon `+` tunggal pada `Penerimaan Nota Baru` (`02`), `Tambah Item` (`04`), dan `Tambah Layanan` (`07`) konsisten tanpa `+ +`. | **VERIFIED** |

### 3.2 Daftar Temuan Defect

- **Blocker:** `0`
- **Major:** `0`
- **Minor:** `0`
- **Riwayat Temuan Ditutup (`CLOSED`):**
  1. **[CLOSED — Minor] Konsistensi Bahasa Login (`01-login-invalid-password.png`):** Pesan error `POST /login` (`HTTP 422`) kini berbahasa Indonesia (`"Email atau kata sandi tidak sesuai dengan data kami."`).
  2. **[CLOSED — Major] Visual Overlap & Cross-Page Scroll Carry-Over (`05-transaksi-nota1-tersimpan-lunas.png`) + Polish `+ +` (`02`, `04`, `07`):** Setelah perbaikan `preserveScroll: 'errors'` (`Create.tsx`, `Pengantaran/Index.tsx`, `Pengantaran/Show.tsx`) dan `<span className="sr-only">+ </span>` (Entry `#030`), re-run Playwright terbaru mengonfirmasi halaman detail pasca-redirect di `05` terbuka tepat di `y = 0` dengan sidebar `#0F2933` penuh dari atas hingga bawah, flash banner + kartu `NOMOR NOTA RESMI` + tombol aksi tampil utuh tanpa tertimpa `<header>`, serta tombol `+ Penerimaan Nota Baru` (`02`), `+ Tambah Item` (`04`), dan `+ Tambah Layanan` (`07`) hanya merender 1 ikon `+` visual.

---

## 4. Rincian Langkah Pengujian & Bukti Screenshot (`01`–`28`)

| # | Skenario | Aktor | Halaman / Aksi | Hasil yang Diharapkan & Aktual | Screenshot |
| :-: | :--- | :--- | :--- | :--- | :--- |
| `01` | `REG-00` | Guest | `POST /login` dengan password salah (`salah-password-123`) | Ditolak (`422`), Split Atelier tampil bersih dengan pesan `"Email atau kata sandi tidak sesuai dengan data kami."` (`form p.text-rose-600`) | [01-login-invalid-password.png](./screenshots/01-login-invalid-password.png) |
| `02` | `REG-00` | Petugas | Login sebagai `petugas@cleanwash.local` ke `/dashboard` | 8 KPI simetris (4+4), compact action strip 4 tugas, tanpa 9 kartu duplikat sidebar, tombol `Penerimaan Nota Baru` berikon `+` tunggal tanpa `+ +`, `aria-current="page"` pada Dashboard | [02-dashboard-petugas.png](./screenshots/02-dashboard-petugas.png) |
| `03` | `REG-00` | Kurir | Login sebagai `kurir@cleanwash.local` + probe rute non-kurir (`403`) | RBAC menolak `403`; sidebar hanya `Dashboard` & `Jadwal Pengantaran`; panah `→` asli tanpa literal `\u2192` | [03-dashboard-kurir.png](./screenshots/03-dashboard-kurir.png) |
| `04` | `REG-01` | Petugas | `Create Transaksi`: klik `Cek Voucher` untuk `EXPIRED15K` | `POST /voucher/validate` mengembalikan `422`, kartu status `KEDALUWARSA` tampil, tombol `Tambah Item` berikon `+` tunggal tanpa `+ +`, `Cek Voucher` `#0F2933`, header solid tanpa ghosting (`KK-03`) | [04-voucher-expired-kk03.png](./screenshots/04-voucher-expired-kk03.png) |
| `05` | `REG-01` | Petugas | Terbitkan `CW-20261111-0001` (`Siti Aminah`, `2.00 kg`, `HEMAT10K`, DP `Rp 6.000`) | Halaman terbuka bersih pada `y = 0`; sidebar penuh dari atas ke bawah tanpa celah putih, flash sukses + `NOMOR NOTA RESMI` + tombol aksi tampil utuh tanpa overlap `<header>`, `Rp 6.000` `Lunas`, `HEMAT10K` | [05-transaksi-nota1-tersimpan-lunas.png](./screenshots/05-transaksi-nota1-tersimpan-lunas.png) |
| `06` | `REG-01` | Petugas | Buka `/transaksi/CW-20261111-0001/nota` | Pratinjau cetak A4 menampilkan monogram `#0F2933`, snapshot `Rp 8.000/kg`, potongan `HEMAT10K`, dan tabel item pakaian | [06-nota1-cetak.png](./screenshots/06-nota1-cetak.png) |
| `07` | `REG-01` | Petugas | Ubah tarif master `Cuci Setrika (REGULER)` `Rp 8.000` -> `Rp 9.500/kg` | Tabel `/layanan` menampilkan `Rp 9.500/kg`, tombol `Tambah Layanan` berikon `+` tunggal tanpa `+ +`, tombol `Cari` `#0F2933`, badge berkurang & tahapan *inline trail* | [07-layanan-ubah-tarif-9500.png](./screenshots/07-layanan-ubah-tarif-9500.png) |
| `08` | `REG-01` | Petugas | Buka kembali `/transaksi/CW-20261111-0001` setelah naik tarif | Sidebar penuh `y=0..1756px`, header solid di `y=0`, banner `Imutabilitas Tarif Snapshot (KK-09)` tampil (`Rp 8.000/kg` vs master `Rp 9.500/kg`) | [08-nota1-snapshot-kk09.png](./screenshots/08-nota1-snapshot-kk09.png) |
| `09` | `REG-01` | Pegawai | Buka modal `Timbang Ulang` di `/produksi`, isi `3.50 kg` | Pratinjau dampak tagihan menghitung `3.5 × 8.000 - 10.000 = Rp 18.000`, sisa `Rp 12.000`, warning turun ke `BELUM_LUNAS` (`KK-01`, `KK-09`) | [09-modal-timbang-ulang-kk01.png](./screenshots/09-modal-timbang-ulang-kk01.png) |
| `10` | `REG-01` | Pegawai | Simpan timbang ulang `3.50 kg` di `/produksi` | Kartu antrean produksi memperbarui status pembayaran nota ke `Belum Lunas` dengan 2 pill badge & stepper 5 tahap | [10-produksi-pasca-timbang-ulang-belum-lunas.png](./screenshots/10-produksi-pasca-timbang-ulang-belum-lunas.png) |
| `11` | `REG-01` | Kurir | Klik `Tandai Diterima Pelanggan` saat nota `CW-20261111-0001` masih `Belum Lunas` | Aksi diblokir server (`KK-06`), alert error merah muncul, status item tetap `Dalam Perjalanan` | [11-kurir-blokir-belum-lunas-kk06.png](./screenshots/11-kurir-blokir-belum-lunas-kk06.png) |
| `12` | `REG-01` | Petugas | Buka `Catat Pelunasan` (`PelunasanModal`) pada `CW-20261111-0001` | Nominal terisi otomatis `12000.00`, pratinjau `LUNAS` (`Rp 0`) tampil jelas | [12-modal-pelunasan-nota1.png](./screenshots/12-modal-pelunasan-nota1.png) |
| `13` | `REG-01` | Kurir | Ulangi `Tandai Diterima Pelanggan` setelah lunas | Pengantaran berhasil ke `Diterima`, status nota menjadi `Diambil`, progres sesi `1/1 (100%)` | [13-kurir-sukses-diterima.png](./screenshots/13-kurir-sukses-diterima.png) |
| `14` | `REG-02` | Pegawai | Buat `CW-20261111-0002` (`Cuci Sepatu REGULER`, `2 pcs`, DP `Rp 15.000`) & cek antrean | Hanya 2 badge (`Aktif`, `DP`), teks `Tanpa Setrika`, stepper menampilkan 4 tahap (`1. Diterima > 2. Dicuci > 3. Dikeringkan > 4. Selesai`) tanpa `Disetrika` | [14-produksi-sepatu-tanpa-setrika.png](./screenshots/14-produksi-sepatu-tanpa-setrika.png) |
| `15` | `REG-02` | Pegawai | Buka modal `Laporkan Insiden` pada tahap `DICUCI`, pilih `Sepatu Sneakers Putih` (`RUSAK`) | Pratinjau kompensasi `5×` basis prorata item menghitung `Rp 125.000` (`KK-04`) | [15-modal-lapor-insiden-rusak.png](./screenshots/15-modal-lapor-insiden-rusak.png) |
| `16` | `REG-02` | Petugas | Buka `/insiden`, klik `Konfirmasi & Potong Saldo` (`KonfirmasiKompensasiModal`) | Nominal disetujui `125000.00`, sisa tagihan menjadi `Rp 0`, warning kelebihan ganti rugi tunai `Rp 90.000` tampil | [16-modal-konfirmasi-kompensasi.png](./screenshots/16-modal-konfirmasi-kompensasi.png) |
| `17` | `REG-02` | Petugas | Buka `/transaksi/CW-20261111-0002/nota` | Cetak nota menampilkan blok `RINCIAN LAPORAN INSIDEN & KOMPENSASI (1)` status `Terkonfirmasi` & pengembalian tunai `Rp 90.000` | [17-nota2-cetak-dengan-insiden.png](./screenshots/17-nota2-cetak-dengan-insiden.png) |
| `18` | `REG-03` | Petugas | Batalkan `CW-20261111-0003` (memakai `BERKAH5K`) di tahap `DITERIMA` | Pembatalan gratis (`Rp 0`), voucher `BERKAH5K` dilepas (`TERSEDIA`) di audit trail & langsung dipakai ulang pada `CW-20261111-0004` | [18-nota3a-batal-gratis-diterima-kk08.png](./screenshots/18-nota3a-batal-gratis-diterima-kk08.png) |
| `19` | `REG-03` | Petugas | Buka `Ubah Layanan (KK-02)` pada `CW-20261111-0005` (`DICUCI`): `Cuci Setrika EXPRESS` -> `Cuci Sepatu EXPRESS` (`2 pcs`) | Pratinjau cross-method (`BERAT -> JUMLAH`) menghitung `2 × 40.000 - 5.000 = Rp 75.000` dengan `PROMOBATAL5K` | [19-modal-ubah-layanan-cross-method-kk02.png](./screenshots/19-modal-ubah-layanan-cross-method-kk02.png) |
| `20` | `REG-03` | Petugas | Batalkan `CW-20261111-0005` pasca `DICUCI` & buka cetak nota | Biaya pembatalan 50% (`Rp 40.000`) terhitung, `PROMOBATAL5K` tetap terkunci (`SUDAH_DIGUNAKAN`), tercetak pada nota batal (`KK-08`) | [20-nota3b-batal-pasca-cuci-kk08.png](./screenshots/20-nota3b-batal-pasca-cuci-kk08.png) |
| `21` | `REG-04` | Petugas | Buat jadwal pengantaran 2 nota lintas pelanggan (`CW-20261111-0006` & `CW-20261111-0007`) | Ringkasan `2 nota, 2 pelanggan`, `Boleh Bayar Akhir` tampil sebagai badge & `Wajib Lunas` sebagai teks | [21-modal-buat-jadwal-multi-pelanggan.png](./screenshots/21-modal-buat-jadwal-multi-pelanggan.png) |
| `22` | `REG-04` | Kurir | Tandai `CW-20261111-0007` `Gagal`, lalu buka modal `Jadwalkan Ulang (KK-07)` | Dialog isolasi `KK-07` menampilkan alasan gagal sebelumnya dan membuat sesi baru `#3` tanpa mengubah sibling `CW-20261111-0006` | [22-modal-jadwalkan-ulang-kk07.png](./screenshots/22-modal-jadwalkan-ulang-kk07.png) |
| `23` | `REG-04` | Kurir | Pada sesi `#3`, selesaikan pengantaran `CW-20261111-0007` meski `Belum Lunas` | Diizinkan karena `boleh_bayar_akhir = true` (`KK-06`); status item `Diterima`, status nota `Diambil` + `Belum Lunas` | [23-kurir-serah-terima-paylater-kk06.png](./screenshots/23-kurir-serah-terima-paylater-kk06.png) |
| `24` | `REG-04` | Petugas | Buka `/serah-terima?mode=PIUTANG` | `StatTile` aktif berindikator ganda (`border-[#0F766E]` + `✓ Aktif`), `1` Nota Piutang Aktif `Rp 42.000`, tombol `Cari` `#0F2933` | [24-serah-terima-tab-piutang.png](./screenshots/24-serah-terima-tab-piutang.png) |
| `25` | `REG-04` | Petugas | Buka `/audit` | Sidebar penuh `y=0..1682px`, header solid di `y=0`, tabel `Ringkasan Piutang` menampilkan `CW-20261111-0007` + audit trail `PENGANTARAN_RESCHEDULED` | [25-audit-piutang-dan-trail.png](./screenshots/25-audit-piutang-dan-trail.png) |
| `26` | `REG-05` | Petugas | Serah terima `CW-20261111-0008` di loket saat terdaftar di sesi `#4` berstatus `MENUNGGU` | Sidebar penuh tinggi dokumen, nota `Diambil`, item sesi `#4` otomatis `Gagal` (`Diambil langsung oleh pelanggan di loket kasir.`) | [26-serah-terima-loket-nota5a.png](./screenshots/26-serah-terima-loket-nota5a.png) |
| `27` | `REG-05` | Petugas | Klik `Info Kurir Aktif` pada `CW-20261111-0009` setelah kurir klik `Ambil dari Outlet` (`DIAMBIL`) | Modal menampilkan peringatan `Sedang Dibawa Kurir Pengantaran` dengan tombol `Konfirmasi Serah Terima` dalam kondisi `disabled` | [27-blokir-serah-terima-loket-kurir-aktif.png](./screenshots/27-blokir-serah-terima-loket-kurir-aktif.png) |
| `28` | `REG-05` | Kurir | Selesaikan `CW-20261111-0009` -> `Diterima` dan audit viewport mobile `390×844` (`/pengantaran/4`, `/dashboard`, `/produksi`) | `scrollWidth <= innerWidth` di seluruh halaman uji; `Sesi Pengantaran #4` dan `Kurir: Andi Kurir` tampil penuh tanpa pemotongan (`UX-04`), tombol `← Kembali` di sub-bar | [28-mobile-viewport-pengantaran.png](./screenshots/28-mobile-viewport-pengantaran.png) |

---

## 5. Verifikasi Status Database Live Akhir (`cleanwash`)

Setelah seluruh rangkaian uji Playwright selesai (tanpa menghapus jejak skenario):

- **Voucher (`voucher`):** `REGRESI10K` tetap berstatus `TERSEDIA` (`nilai: 10000.00`, `masa_berlaku: 2027-01-10`); `BERKAH5K`, `HEMAT10K`, dan `PROMOBATAL5K` berstatus `SUDAH_DIGUNAKAN`; `EXPIRED15K` berstatus `KEDALUWARSA` (`masa_berlaku: 2026-11-04`).
- **Transaksi (`transaksi`):** `9` nota (`CW-20261111-0001` s.d. `CW-20261111-0009`) tersimpan lengkap sesuai hasil skenario: `0001` (`DIAMBIL`, `LUNAS`, `18000.00`), `0002` (`SELESAI`, `LUNAS`, `0.00`), `0003` (`DIBATALKAN`, `LUNAS`, `0.00`), `0004` (`AKTIF`, `BELUM_BAYAR`, `9000.00`), `0005` (`DIBATALKAN`, `BELUM_BAYAR`, `40000.00`), `0006` (`DIAMBIL`, `LUNAS`, `25000.00`), `0007` (`DIAMBIL`, `LUNAS`, `42000.00`), `0008` (`DIAMBIL`, `LUNAS`, `25000.00`), `0009` (`DIAMBIL`, `LUNAS`, `25000.00`).
- **Pengantaran (`pengantaran`):** `4` sesi (`#1`–`#4`) seluruhnya tuntas berstatus `SELESAI`.
- **Master & Audit Log (`pelanggan`, `jenis_layanan`, `audit_logs`):** `4` pelanggan, `4` jenis layanan, dan `66` entri log kronologis lintas aktor dan transaksi.

