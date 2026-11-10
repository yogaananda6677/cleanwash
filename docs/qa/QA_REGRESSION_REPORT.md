# QA Live Browser Regression Report — CleanWash

**Tanggal Eksekusi:** 10 November 2026 (WIB / `Asia/Jakarta`)  
**Cabang Git:** `feat/qa-subagent-playwright-regression`  
**Target Live Server:** `http://127.0.0.1:8000` (`public/build/manifest.json` produksi aktif, tanpa `public/hot`)  
**Database Live:** MySQL 8.4 (`cleanwash-mysql` port `3307`, schema `cleanwash`)  
**Browser Automation:** Playwright `1.65.0` (Chromium headless, `1440×900` desktop & `390×844` mobile)  
**Status Akhir:** **PASS — 0 Blocker / 0 Major / 0 Functional Defects**

---

## 1. Ringkasan Eksekusi & Audit Kualitas

| Pemeriksaan | Command | Hasil Aktual | Catatan |
| :--- | :--- | :--- | :--- |
| **Live Browser E2E Suite** | `npx playwright test --reporter=list` | **6 / 6 PASS** (`1.3m`) | `REG-00` s.d. `REG-05` dieksekusi serial langsung ke server live & DB `cleanwash` tanpa mock |
| **Bukti Visual Langkah Bisnis** | `docs/qa/screenshots/*.png` | **28 / 28 file** | Seluruh screenshot desktop & mobile (`390×844`) tersimpan berurutan |
| **Zero-Silent-Failure Audit** | `RuntimeMonitor` (`qa-harness.ts`) | **0 error** | `0` uncaught `pageerror`, `0` JS/React `console.error`, `0` HTTP `419`, `0` HTTP `>= 500` (status `403`/`422` hanya saat negative-test terkontrol) |
| **PHPUnit Backend & Feature** | `php artisan test` | **114 passed** (`4149 assertions`, `39.51s`) | Dieksekusi pada MySQL testing terisolasi |
| **Laravel Pint Code Style** | `./vendor/bin/pint --test` | **passed** | `{"tool":"pint","result":"passed"}` |
| **TypeScript Static Check** | `npx tsc --noEmit` | **passed** (exit code `0`) | Zero type error pada Inertia React TS |

---

## 2. Matriks Cakupan Use Case (`UC-01`–`UC-14`) & Kondisi Khusus (`KK-01`–`KK-09`)

| Skenario E2E | Use Case Tercakup | Kondisi Khusus Tercakup | Aktor Uji | Status |
| :--- | :--- | :--- | :--- | :---: |
| **REG-00** (`6.3s`) | `UC-01`, `UC-02` | RBAC strict cross-role (`403`), guest redirect, login invalid (`422`) | Guest, Petugas, Pegawai, Kurir | PASS |
| **REG-01** (`17.9s`) | `UC-02`, `UC-03`, `UC-04`, `UC-05`, `UC-06`, `UC-07`, `UC-08`, `UC-11`, `UC-12` | `KK-01`, `KK-03`, `KK-06`, `KK-09` | Petugas, Pegawai, Kurir | PASS |
| **REG-02** (`8.7s`) | `UC-03`, `UC-06`, `UC-07`, `UC-09`, `UC-10` | `KK-04` (5× prorata), alur tanpa `DISETRIKA`, kelebihan ganti rugi | Petugas, Pegawai | PASS |
| **REG-03** (`8.6s`) | `UC-03`, `UC-05`, `UC-06`, `UC-07`, `UC-14` | `KK-02` (cross-method + voucher lock), `KK-08` (2 cabang batal: gratis di `DITERIMA` vs biaya 50% pasca-`DICUCI`), `KK-09` | Petugas, Pegawai | PASS |
| **REG-04** (`13.7s`) | `UC-03`, `UC-07`, `UC-11`, `UC-12`, `UC-13` | `KK-06` (`boleh_bayar_akhir = true` piutang), `KK-07` (reschedule independen tanpa mutasi sibling) | Petugas, Pegawai, Kurir | PASS |
| **REG-05** (`14.9s`) | `UC-03`, `UC-07`, `UC-11`, `UC-12`, `UC-13` | `KK-06`, anti-konflik serah terima loket vs kurir `DIAMBIL`, auto-close item `MENUNGGU -> GAGAL`, layout responsif `390×844` | Petugas, Pegawai, Kurir | PASS |

---

## 3. Daftar Temuan Defect

- **Blocker:** `0`
- **Major:** `0`
- **Minor / Observasi Polish Non-Blocker (1 catatan informasi):**
  1. **[Minor — Konsistensi Bahasa Login (`01-login-invalid-password.png`)]** Pada `POST /login` dengan kata sandi salah (`HTTP 422`), pesan validasi bawaan Laravel menggunakan bahasa Inggris (*"These credentials do not match our records."*) sementara label form login berbahasa Indonesia (`Alamat Email`, `Kata Sandi`, `Masuk`). Perilaku keamanan & validasi berfungsi benar (`HTTP 422`, tidak membocorkan status aktif/nonaktif akun). Disarankan menerjemahkan `lang/en/auth.php` (`failed`) ke bahasa Indonesia pada backlog polish berikutnya (non-blocking).

---

## 4. Rincian Langkah Pengujian & Bukti Screenshot (`01`–`28`)

| # | Skenario | Aktor | Halaman / Aksi | Hasil yang Diharapkan & Aktual | Screenshot |
| :-: | :--- | :--- | :--- | :--- | :--- |
| `01` | `REG-00` | Guest | `POST /login` dengan password salah (`salah-password-123`) | Ditolak (`422`), alert error kredensial muncul, tidak redirect masuk, 0 crash | [01-login-invalid-password.png](./screenshots/01-login-invalid-password.png) |
| `02` | `REG-00` | Petugas | Login sebagai `petugas@cleanwash.local` ke `/dashboard` | KPI & menu lengkap Petugas/Kasir tampil, `aria-current="page"` pada Dashboard | [02-dashboard-petugas.png](./screenshots/02-dashboard-petugas.png) |
| `03` | `REG-00` | Kurir | Login sebagai `kurir@cleanwash.local` + probe `/transaksi`, `/audit`, `/voucher`, `/produksi` (`403`) | RBAC menolak `403` seluruh rute non-kurir; sidebar Kurir hanya menampilkan `Dashboard` & `Jadwal Pengantaran` | [03-dashboard-kurir.png](./screenshots/03-dashboard-kurir.png) |
| `04` | `REG-01` | Petugas | `Create Transaksi`: klik `Cek Voucher` untuk `EXPIRED15K` | `POST /voucher/validate` mengembalikan `422`, kartu status `KEDALUWARSA` muncul, estimasi total tidak terpotong (`KK-03`) | [04-voucher-expired-kk03.png](./screenshots/04-voucher-expired-kk03.png) |
| `05` | `REG-01` | Petugas | Terbitkan `CW-20261110-0001` (`Siti Aminah`, `2.00 kg`, `HEMAT10K`, DP `Rp 6.000`) | Total `Rp 6.000`, status `Lunas`, potongan `HEMAT10K -Rp 10.000` | [05-transaksi-nota1-tersimpan-lunas.png](./screenshots/05-transaksi-nota1-tersimpan-lunas.png) |
| `06` | `REG-01` | Petugas | Buka `/transaksi/CW-20261110-0001/nota` | Pratinjau cetak A4 menampilkan snapshot `Rp 8.000/kg`, potongan `HEMAT10K`, dan tabel item pakaian | [06-nota1-cetak.png](./screenshots/06-nota1-cetak.png) |
| `07` | `REG-01` | Petugas | Ubah tarif master `Cuci Setrika (REGULER)` `Rp 8.000` -> `Rp 9.500/kg` | Tabel `/layanan` menampilkan `Rp 9.500/kg` dengan flash konfirmasi | [07-layanan-ubah-tarif-9500.png](./screenshots/07-layanan-ubah-tarif-9500.png) |
| `08` | `REG-01` | Petugas | Buka kembali `/transaksi/CW-20261110-0001` setelah naik tarif | Banner `Imutabilitas Tarif Snapshot (KK-09)` tampil (`Rp 8.000/kg` vs master `Rp 9.500/kg`) | [08-nota1-snapshot-kk09.png](./screenshots/08-nota1-snapshot-kk09.png) |
| `09` | `REG-01` | Pegawai | Buka modal `Timbang Ulang` di `/produksi`, isi `3.50 kg` | Pratinjau dampak tagihan menghitung `3.5 × 8.000 - 10.000 = Rp 18.000`, sisa `Rp 12.000`, warning turun ke `BELUM_LUNAS` (`KK-01`, `KK-09`) | [09-modal-timbang-ulang-kk01.png](./screenshots/09-modal-timbang-ulang-kk01.png) |
| `10` | `REG-01` | Pegawai | Simpan timbang ulang `3.50 kg` di `/produksi` | Kartu antrean produksi memperbarui status pembayaran nota ke `Belum Lunas` | [10-produksi-pasca-timbang-ulang-belum-lunas.png](./screenshots/10-produksi-pasca-timbang-ulang-belum-lunas.png) |
| `11` | `REG-01` | Kurir | Klik `Tandai Diterima Pelanggan` saat nota `CW-20261110-0001` masih `Belum Lunas` | Aksi diblokir server (`KK-06`), alert error merah muncul, status item tetap `Dalam Perjalanan` | [11-kurir-blokir-belum-lunas-kk06.png](./screenshots/11-kurir-blokir-belum-lunas-kk06.png) |
| `12` | `REG-01` | Petugas | Buka `Catat Pelunasan` (`PelunasanModal`) pada `CW-20261110-0001` | Nominal terisi otomatis `12000.00`, pratinjau `LUNAS` (`Rp 0`) tampil jelas | [12-modal-pelunasan-nota1.png](./screenshots/12-modal-pelunasan-nota1.png) |
| `13` | `REG-01` | Kurir | Ulangi `Tandai Diterima Pelanggan` setelah lunas | Pengantaran berhasil ke `Diterima`, status nota menjadi `Diambil`, progres sesi `1/1 (100%)` | [13-kurir-sukses-diterima.png](./screenshots/13-kurir-sukses-diterima.png) |
| `14` | `REG-02` | Pegawai | Buat `CW-20261110-0002` (`Cuci Sepatu REGULER`, `2 pcs`, DP `Rp 15.000`) & cek antrean | Stepper produksi menampilkan 4 tahap (`Diterima -> Dicuci -> Dikeringkan -> Selesai`) tanpa tahap `Disetrika` | [14-produksi-sepatu-tanpa-setrika.png](./screenshots/14-produksi-sepatu-tanpa-setrika.png) |
| `15` | `REG-02` | Pegawai | Buka modal `Laporkan Insiden` pada tahap `DICUCI`, pilih item `Sepatu Sneakers Putih` (`RUSAK`) | Pratinjau kompensasi `5×` basis prorata item menghitung `Rp 125.000` (`KK-04`) | [15-modal-lapor-insiden-rusak.png](./screenshots/15-modal-lapor-insiden-rusak.png) |
| `16` | `REG-02` | Petugas | Buka `/insiden`, klik `Konfirmasi & Potong Saldo` (`KonfirmasiKompensasiModal`) | Nominal disetujui `125000.00`, sisa tagihan menjadi `Rp 0`, warning kelebihan ganti rugi tunai `Rp 90.000` tampil | [16-modal-konfirmasi-kompensasi.png](./screenshots/16-modal-konfirmasi-kompensasi.png) |
| `17` | `REG-02` | Petugas | Buka `/transaksi/CW-20261110-0002/nota` | Cetak nota menampilkan blok `RINCIAN LAPORAN INSIDEN & KOMPENSASI (1)` status `Terkonfirmasi` & pengembalian tunai `Rp 90.000` | [17-nota2-cetak-dengan-insiden.png](./screenshots/17-nota2-cetak-dengan-insiden.png) |
| `18` | `REG-03` | Petugas | Batalkan `CW-20261110-0003` (memakai `BERKAH5K`) di tahap `DITERIMA` | Pembatalan gratis (`Rp 0`), voucher `BERKAH5K` dilepas (`TERSEDIA`) di audit trail & langsung dipakai ulang pada `CW-20261110-0004` | [18-nota3a-batal-gratis-diterima-kk08.png](./screenshots/18-nota3a-batal-gratis-diterima-kk08.png) |
| `19` | `REG-03` | Petugas | Buka `Ubah Layanan (KK-02)` pada `CW-20261110-0005` (`DICUCI`): ganti `Cuci Setrika EXPRESS` -> `Cuci Sepatu EXPRESS` (`2 pcs`) | Pratinjau cross-method (`BERAT -> JUMLAH`) menghitung `2 × 40.000 - 5.000 = Rp 75.000` dengan `PROMOBATAL5K` | [19-modal-ubah-layanan-cross-method-kk02.png](./screenshots/19-modal-ubah-layanan-cross-method-kk02.png) |
| `20` | `REG-03` | Petugas | Batalkan `CW-20261110-0005` pasca `DICUCI` & buka cetak nota | Biaya pembatalan 50% (`Rp 40.000`) terhitung, `PROMOBATAL5K` tetap terkunci (`SUDAH_DIGUNAKAN`), tercetak pada nota batal (`KK-08`) | [20-nota3b-batal-pasca-cuci-kk08.png](./screenshots/20-nota3b-batal-pasca-cuci-kk08.png) |
| `21` | `REG-04` | Petugas | Buat jadwal pengantaran 2 nota lintas pelanggan (`CW-20261110-0006` Dewi Lestari & `CW-20261110-0007` Bapak Hendra) | Ringkasan pemilihan `2 nota, 2 pelanggan`, badge hak bayar masing-masing pelanggan tampil benar | [21-modal-buat-jadwal-multi-pelanggan.png](./screenshots/21-modal-buat-jadwal-multi-pelanggan.png) |
| `22` | `REG-04` | Kurir | Tandai `CW-20261110-0007` `Gagal`, lalu buka modal `Jadwalkan Ulang (KK-07)` | Dialog isolasi `KK-07` menampilkan alasan gagal sebelumnya dan membuat sesi baru `#3` tanpa mengubah sibling `CW-20261110-0006` | [22-modal-jadwalkan-ulang-kk07.png](./screenshots/22-modal-jadwalkan-ulang-kk07.png) |
| `23` | `REG-04` | Kurir | Pada sesi `#3`, selesaikan pengantaran `CW-20261110-0007` meski `Belum Lunas` | Diizinkan karena `boleh_bayar_akhir = true` (`KK-06`); status item `Diterima`, status nota `Diambil` + `Belum Lunas` | [23-kurir-serah-terima-paylater-kk06.png](./screenshots/23-kurir-serah-terima-paylater-kk06.png) |
| `24` | `REG-04` | Petugas | Buka `/serah-terima?mode=PIUTANG` | Kartu summary menampilkan `1` Nota Piutang Aktif senilai `Rp 42.000` dengan tombol `Catat Pelunasan` | [24-serah-terima-tab-piutang.png](./screenshots/24-serah-terima-tab-piutang.png) |
| `25` | `REG-04` | Petugas | Buka `/audit` | Tabel `Ringkasan Piutang Pelanggan Hak Bayar Akhir (KK-06)` menampilkan `CW-20261110-0007` + audit trail `PENGANTARAN_RESCHEDULED` | [25-audit-piutang-dan-trail.png](./screenshots/25-audit-piutang-dan-trail.png) |
| `26` | `REG-05` | Petugas | Serah terima `CW-20261110-0008` di loket saat terdaftar di sesi `#4` berstatus `MENUNGGU` | Dialog menampilkan info penutupan otomatis item `MENUNGGU`; nota menjadi `Diambil` dan item sesi `#4` otomatis `Gagal` (`Diambil langsung oleh pelanggan di loket kasir.`), sesi otomatis `Berjalan` | [26-serah-terima-loket-nota5a.png](./screenshots/26-serah-terima-loket-nota5a.png) |
| `27` | `REG-05` | Petugas | Klik `Info Kurir Aktif` pada `CW-20261110-0009` setelah kurir klik `Ambil dari Outlet` (`DIAMBIL`) | Modal menampilkan peringatan `Sedang Dibawa Kurir Pengantaran` dengan tombol `Konfirmasi Serah Terima` dalam kondisi `disabled` | [27-blokir-serah-terima-loket-kurir-aktif.png](./screenshots/27-blokir-serah-terima-loket-kurir-aktif.png) |
| `28` | `REG-05` | Kurir | Selesaikan `CW-20261110-0009` -> `Diterima` dan audit viewport mobile `390×844` (`/pengantaran/4`, `/dashboard`, `/produksi`) | `documentElement.scrollWidth <= window.innerWidth` di seluruh halaman uji, drawer navigasi mobile terbuka/tutup mulus tanpa clipping | [28-mobile-viewport-pengantaran.png](./screenshots/28-mobile-viewport-pengantaran.png) |

---

## 5. Verifikasi Status Database Live Akhir (`cleanwash`)

Setelah seluruh rangkaian uji Playwright selesai (tanpa menghapus jejak skenario):

- **Voucher (`voucher`):** `REGRESI10K` tetap berstatus `TERSEDIA` (`nominal: 10000.00`, berlaku s.d. `2027-01-09`); `BERKAH5K`, `HEMAT10K`, dan `PROMOBATAL5K` berstatus `SUDAH_DIGUNAKAN`; `EXPIRED15K` berstatus `KEDALUWARSA`.
- **Transaksi (`transaksi`):** `9` nota (`CW-20261110-0001` s.d. `CW-20261110-0009`) tersimpan lengkap sesuai hasil skenario (`DIAMBIL`, `SELESAI`, `DIBATALKAN`, `AKTIF`).
- **Pengantaran (`pengantaran`):** `4` sesi (`#1`–`#4`) seluruhnya tuntas berstatus `SELESAI`.
- **Audit Log (`audit_logs`):** `66` entri log kronologis lintas aktor dan transaksi.
