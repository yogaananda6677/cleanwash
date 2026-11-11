# CleanWash Page Blueprints & E2E Preservation Specification

| Field | Value |
| --- | --- |
| **Dokumen Pendamping** | [DESIGN_SYSTEM.md](file:///home/yoga/Data/Kuliah/Sistem%20Informasi/docs/design/DESIGN_SYSTEM.md) |
| **Cakupan Halaman** | Seluruh 15 Halaman Inertia + `AppLayout` + Komponen Shared + `app.blade.php` / `app.css` / `app.tsx` |
| **Target Pelaksana** | `frontend-developer` (dan catatan lokalisasi `auth.failed` bersama `fullstack-developer`) |
| **Kompatibilitas Wajib** | 100% lulus [regression-cleanwash.spec.ts](file:///home/yoga/Data/Kuliah/Sistem%20Informasi/tests/e2e/regression-cleanwash.spec.ts) & [qa-harness.ts](file:///home/yoga/Data/Kuliah/Sistem%20Informasi/tests/e2e/helpers/qa-harness.ts) |
| **Last Updated** | 2026-11-11 |

---

## 1. Blueprint Fondasi Global & Komponen Shared

### 1.1 `resources/views/app.blade.php`, `resources/css/app.css`, & `resources/js/app.tsx`

- **`app.blade.php`:**
  - Pertahankan `lang="{{ str_replace('_', '-', app()->getLocale()) }}"`.
  - Ubah body base class menjadi `min-h-screen bg-[#F5F7F8] font-sans text-[#0F172A] antialiased`.
- **`resources/js/app.tsx`:**
  - Impor seluruh bobot font lokal:
    - `@fontsource/plus-jakarta-sans/{400,500,600,700}.css`
    - `@fontsource/jetbrains-mono/{400,500,600}.css`
  - Ubah Inertia progress bar menjadi `#0D9488` (Brand Fresh Teal).
- **`resources/css/app.css`:**
  - Terapkan blok `@theme`, `@layer base`, `:focus-visible`, `@media (forced-colors: active)`, `@media (prefers-reduced-motion: reduce)`, dan `@media print` persis sesuai [DESIGN_SYSTEM.md](file:///home/yoga/Data/Kuliah/Sistem%20Informasi/docs/design/DESIGN_SYSTEM.md) §3.3.

### 1.2 `resources/js/Layouts/AppLayout.tsx`

#### Perbaikan Struktural & Responsif:
1. **Skip Link Aksesibel:** Tautan pertama di root wrapper:
   `<a href="#main-content" className="sr-only focus:not-sr-only ...">Lewati ke konten utama</a>` menuju **`<h1 id="main-content" tabIndex={-1}>`**.
2. **Sidebar Penuh Tinggi Dokumen (`Deep Petrol Teal #0F2933`):**
   - Shell desktop memakai `lg:flex lg:min-h-screen` agar latar `#0F2933` tidak terhenti di tinggi `900px` saat halaman panjang (`05`, `25`).
   - Kolom `<aside>` desktop: `hidden lg:block lg:w-64 lg:shrink-0 bg-[#0F2933] border-r border-[#1A3B47]`, membungkus `<div className="lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">`.
3. **Pengelompokan Menu Sidebar Peran `PETUGAS` (Tanpa Mengubah Label Link E2E!):**
   - Kelompok 1 — **`Operasional Kasir`** (label grup `text-[11px] font-semibold uppercase tracking-wider text-[#9FB7C0]`):
     - `Dashboard` (`/dashboard`) — ikon `LayoutDashboard`
     - `Penerimaan Baru` (`/transaksi/create`) — ikon `PlusCircle`
     - `Transaksi` (`/transaksi`) — ikon `ReceiptText`
     - `Serah Terima` (`/serah-terima`) — ikon `PackageCheck`
   - Kelompok 2 — **`Produksi & Distribusi`**:
     - `Pengantaran` (`/pengantaran`) — ikon `Truck`
     - `Insiden & Kompensasi` (`/insiden`) — ikon `AlertTriangle`
   - Kelompok 3 — **`Master Data & Audit`**:
     - `Pelanggan` (`/pelanggan`) — ikon `Users`
     - `Jenis Layanan` (`/layanan`) — ikon `Sparkles`
     - `Voucher` (`/voucher`) — ikon `TicketPercent`
     - `Audit & Piutang` (`/audit`) — ikon `ClipboardCheck`
   - **Indikator Aktif (WCAG 1.4.1):** `<Link aria-current={active ? 'page' : undefined}>` aktif menampilkan latar `#163C4A`, teks `#FFFFFF`, **bar indikator kiri `h-5 w-1 rounded-full bg-[#14B8A6]`**, dan ikon `text-[#2DD4BF]`.
   - **`PEGAWAI`:** `Dashboard`, `Antrean Produksi` (`WashingMachine`), `Insiden & Kompensasi`.
   - **`PENGANTAR`:** `Dashboard`, `Jadwal Pengantaran` (`Truck`).
4. **Header Solid Anti-Ghosting & Responsif `390px`:**
   - Ganti `bg-white/95 backdrop-blur-xs` menjadi **`bg-white` solid (100% opaque)** + `border-b border-[#D8E2E6]` (`z-20`).
   - **Perbaikan Truncation `390px` (`28-mobile-viewport-pengantaran.png`):**
     - Baris atas header (`flex items-center justify-between gap-2`): tombol hamburger mobile (`min-h-[2.75rem] min-w-[2.75rem]`, `aria-label="Buka menu navigasi"`), judul `<h1 id="main-content" tabIndex={-1} className="text-base sm:text-xl font-bold leading-tight text-[#0F172A] truncate">` + subtitle (`hidden sm:block text-xs text-[#5B697A]`), serta di kanan: badge peran + nama (`hidden md:flex`) dan tombol `Keluar` (`min-h-[2.5rem]`, teks `Keluar` tetap terbaca karena dicek `getByRole('button', { name: /Keluar/ })`).
     - **`headerActions` pada mobile (`<640px`):** Jika halaman memiliki `headerActions` (seperti `← Kembali` + `Mulai Pengantaran` di `Pengantaran/Show`, atau `← Kembali` + `Cetak Nota` di `Transaksi/Show`), letakkan `headerActions` pada **baris ke-2 responsif** di bawah judul (`flex-col sm:flex-row sm:items-center sm:justify-between`) pada `<header>` agar judul `Sesi Pengantaran #4` TIDAK pernah terpotong menjadi `Sesi Peng...` di layar `390px`!
5. **Mobile Drawer via Native `<dialog>`:**
   - Gunakan elemen `<dialog aria-label="Menu navigasi CleanWash">` (atau mempertahankan dialog semantics native tanpa `role="dialog"` manual!) sehingga `page.getByRole('dialog', { name: 'Menu navigasi CleanWash' })` tetap cocok 100%, dengan tombol tutup `aria-label="Tutup menu navigasi"` (`<X />` `lucide-react`, `min-h-[2.75rem] min-w-[2.75rem]`).

### 1.3 Komponen Shared Baru & Pembaruan Komponen Lama

| Komponen | Lokasi | Perubahan Desain |
| --- | --- | --- |
| **`StatusBadge.tsx`** | `resources/js/Components/StatusBadge.tsx` | Soft tinted chip + border halus + **dot indikator `6px` (`h-1.5 w-1.5 rounded-full`)** (`WCAG 1.4.1`). Pertahankan teks exact semua badge yang diuji E2E (`Boleh Bayar Akhir`, `Belum Lunas`, `Lunas`, `Diterima`, `Diambil`, `Dalam Perjalanan`, `Gagal`, `Berjalan`, `Terkonfirmasi`, `Dibatalkan`, `Reguler`). **Ubah `PayLaterBadge(allowed=false)`** atau sediakan props/varian agar `Wajib Lunas` bisa dirender sebagai teks terstruktur (`MetadataRow`) pada kartu padat! |
| **`StatTile.tsx`** *(Baru)* | `resources/js/Components/StatTile.tsx` | Kartu metrik/filter seragam: label `text-xs text-[#5B697A]`, ikon `lucide-react` dalam kotak soft surface `h-8 w-8 rounded-lg`, angka `text-2xl font-bold tabular-nums`, subtitle, optional action link; mode filter (`aria-pressed`) memakai border `2px solid #0F766E` + `#F0FDFA` + ikon centang `Check`. |
| **`FilterToolbar.tsx`** *(Baru)* | `resources/js/Components/FilterToolbar.tsx` | Pembungkus `<search>` standar (`rounded-2xl border border-[#D8E2E6] bg-white p-4 sm:p-5`), input/select `border-[#7C8C9D]` (`3.45:1`), tombol submit `#0F2933` hover `#163C4A`, tombol reset outline `border-[#7C8C9D]`. |
| **`Modal.tsx`** | `resources/js/Components/Modal.tsx` | Pertahankan native `<dialog>`, ganti SVG close dengan `<X />` `lucide-react`, backdrop `backdrop:bg-[#0F2933]/55`, border `border-[#D8E2E6]`, footer `bg-[#F8FAFC]`. |
| **`Pagination.tsx` & `EmptyState.tsx`** | `resources/js/Components/` | Tombol aktif pagination memakai `bg-[#0F766E] border-[#0F766E] text-white` + `aria-current="page"`; `EmptyState` memakai ikon `PackageOpen` `lucide-react` di badge `#F0FDFA text-[#0F766E]` dan CTA `#0F766E`. |

---

## 2. Blueprint Rinci Per Halaman

### 2.1 `Auth/Login.tsx` — Split Laundry-Tech Atelier

```text
+-----------------------------------------------------------------------+
|  [LG+: 2-Column Split Grid (lg:grid-cols-12, min-h-screen)]           |
|                                                                       |
|  LEFT PANEL (lg:col-span-5, bg-[#0F2933] text-white)                  |
|  +---------------------------------+  RIGHT PANEL (lg:col-span-7,     |
|  | [CW] CleanWash Laundry (h1/logo)|  bg-[#F5F7F8], centered card)    |
|  | Manajemen Operasional Terpadu   |  +-----------------------------+ |
|  |                                 |  | Masuk ke Konsol Staf        | |
|  | 3 Pilar Layanan:                |  | Gunakan email & kata sandi  | |
|  | • Penerimaan Nota & Snapshot    |  |                             | |
|  | • Produksi Dinamis & Insiden    |  | Alamat Email *              | |
|  | • Kurir Multi-Pelanggan & Loket |  | [________________________]  | |
|  |                                 |  | <p class="text-rose-600">   | |
|  | Zona waktu: Asia/Jakarta (WIB)  |  |                             | |
|  +---------------------------------+  | Kata Sandi *       [Lihat]  | |
|                                       | [________________________]  | |
|                                       | [ ] Ingat sesi saya         | |
|                                       | [    Masuk (#0F766E)     ]  | |
|                                       +-----------------------------+ |
+-----------------------------------------------------------------------+
```

- **Aturan Wajib:**
  - `<h1 id="main-content" tabIndex={-1}>CleanWash Laundry</h1>` (harus `<h1>` dengan teks exact `'CleanWash Laundry'` agar `getByRole('heading', { name: 'CleanWash Laundry' })` di `REG-00` tetap cocok baik di desktop maupun mobile `390px`, jadi tampilkan logo + `<h1>CleanWash Laundry</h1>` di atas card pada `<1024px` atau di header panel agar selalu visible!).
  - Label input exact: `Alamat Email` (`id="email"`) dan `Kata Sandi` (`id="password"`), toggle button `Lihat`/`Tutup` dengan `min-h-[2.75rem]`, tombol submit exact `Masuk` (`min-h-[2.75rem] bg-[#0F766E] hover:bg-[#115E59]`).
  - Pesan error validasi email WAJIB memakai tag `<p>` di dalam `<form>` dengan class **`text-rose-600`** (`form p.text-rose-600`).
  - **Catatan Koordinasi `auth.failed` Bahasa Indonesia:** Karena `app/Http/Requests/Auth/LoginRequest.php` memanggil `trans('auth.failed')` dengan `APP_LOCALE=en`, koordinasikan dengan `fullstack-developer` / `backend-developer` untuk menambahkan `lang/id/auth.php` + mengatur `APP_LOCALE=id` (atau menyetel pesan `'Email atau kata sandi tidak sesuai dengan data kami.'`) — `frontend-developer` tidak menyentuh file PHP tanpa koordinasi.

---

### 2.2 `Dashboard/Index.tsx` — Role-Focused Operational Hub (Anti Card-Soup)

#### Masalah yang Diselesaikan:
- Menghapus **9 kartu `Akses Cepat` yang menduplikasi 100% sidebar**.
- Menghapus baris ke-3 yatim (2 kartu sisa) pada Petugas.
- Memperbaiki bug literal `\u2192` di deskripsi Kurir (`03-dashboard-kurir.png`).

#### Layout Baru:
1. **Top Welcome & Primary Action Strip** (1 kartu putih ramping):
   - Kiri: `<h2>Selamat bertugas, {user?.name ?? 'Staf CleanWash'}</h2>` + `RoleBadge` + 1 kalimat ringkas peran.
   - Kanan: **1 Primary CTA** (`bg-[#0F766E] min-h-[2.75rem]`):
     - `PETUGAS`: `+ Penerimaan Nota Baru` (`/transaksi/create`)
     - `PEGAWAI`: `Buka Antrean Produksi →` (`/produksi`)
     - `PENGANTAR`: `Buka Jadwal Pengantaran →` (`/pengantaran`)
2. **Conditional Priority Alert Strip** (hanya tampil bila ada item mendesak):
   - `PETUGAS`: bila `insiden_menunggu_konfirmasi > 0`, banner border-l-4 amber menampilkan `{summary.insiden_menunggu_konfirmasi} Insiden Menunggu Konfirmasi` + link `Konfirmasi Sekarang →` (`/insiden?status_konfirmasi=MENUNGGU_KONFIRMASI`) *(E2E REG-02!)*. Jika `insiden_menunggu_konfirmasi === 0` dan `piutang_belum_lunas > 0`, banner info ringkas ke `/serah-terima?mode=PIUTANG`.
   - `PENGANTAR`: bila `item_gagal_perlu_tindak_lanjut > 0`, banner amber/rose menuju `/pengantaran`.
3. **KPI Grid Simetris Memakai `StatTile` (`lg:grid-cols-4 gap-4`):**
   - **Peran `PETUGAS` — 2 Grup Simetris (4 + 4 = 8 Kartu, 0 Baris Yatim):**
     - *Grup A — `Ringkasan Operasional` (4 kartu):*
       1. `Transaksi Aktif` (`summary.transaksi_aktif`, ikon `Cog`)
       2. `Selesai Siap Ambil` (`summary.transaksi_selesai_siap_ambil`, ikon `PackageCheck`)
       3. `Pengantaran Aktif` (`summary.pengantaran_aktif`, ikon `Truck`)
       4. `Insiden Menunggu Konfirmasi` (`summary.insiden_menunggu_konfirmasi`, ikon `AlertTriangle`)
     - *Grup B — `Keuangan & Master Data` (4 kartu):*
       5. `Belum Lunas` (`summary.transaksi_belum_lunas`, hint `BELUM_BAYAR / DP / BELUM_LUNAS`, ikon `Wallet`)
       6. `Total Nominal Piutang` (`formatRupiah(summary.piutang_nominal_total)`, hint `${summary.piutang_belum_lunas} nota diambil belum lunas`, ikon `ReceiptText`, link `/serah-terima?mode=PIUTANG`) — *menggabungkan jumlah & nominal piutang secara elegan*
       7. `Layanan Aktif` (`summary.total_layanan_aktif`, hint `${summary.total_pelanggan} pelanggan terdaftar`, link `/layanan`, ikon `Sparkles`)
       8. `Voucher Tersedia` (`summary.total_voucher_tersedia`, hint `Aktif & berlaku (WIB)`, link `/voucher`, ikon `TicketPercent`)
   - **Peran `PEGAWAI` — 4 Kartu Simetris (`lg:grid-cols-4`):**
     - Pertahankan teks label E2E exact: **`Antrean Transaksi Aktif`**, **`Perlu Timbang Ulang`**, `Siap Proses Berikutnya`, `Laporan Insiden Saya`.
   - **Peran `PENGANTAR` — 4 Kartu Simetris (`lg:grid-cols-4`):**
     - Pertahankan teks label E2E exact: **`Jadwal Pengantaran Aktif`**, **`Item Antar Aktif`**, **`Terkirim Hari Ini`**, **`Gagal Perlu Tindak Lanjut`**.
4. **Compact Quick Action Strip (Pengganti 9 Kartu Besar Duplikat):**
   - 1 baris kompak `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3` berisi tombol/kartu aksi ringkas (`min-h-[3rem]`) hanya untuk **3–4 alur harian tersering** (Petugas: `Buat Nota Penerimaan`, `Loket Serah Terima`, `Jadwal Pengantaran`, `Audit & Piutang`; Pegawai: `Antrean Produksi`, `Lapor Insiden`; Pengantar: `Jadwal Pengantaran Harian` dengan panah Unicode `→` asli — bukan `\u2192`, `Tindak Lanjut Pengantaran Gagal`).

---

### 2.3 `Transaksi/Create.tsx` — Loket Kasir Cepat (2-Kolom + Sticky Receipt)

- **Layout:** `grid grid-cols-1 gap-6 xl:grid-cols-12` (Kiri 8 kolom: 3 step card bernomor `1`, `2`, `3` dengan badge nomor bundar teal; Kanan 4 kolom: **Sticky Receipt Calculator** `xl:sticky xl:top-24 bg-[#F8FAFC] border-[#D8E2E6]` dengan ringkasan subtotal, potongan voucher, estimasi total, DP, sisa tagihan, dan **1 Primary CTA `#0F766E`** `Terbitkan Nota & Simpan`).
- **Perbaikan Visual:**
  - Step 1: Pindahkan `PayLaterBadge` agar hanya tampil chip bila `boleh_bayar_akhir === true`, atau tampilkan teks terstruktur `Hak bayar: Wajib Lunas` jika `false`. Pada kartu info tarif layanan kanan, tampilkan urutan tahap sebagai **inline breadcrumb trail** (`1. Diterima → 2. Dicuci → ...`) bukan 5 pill berwarna.
  - Step 2 (`DetailPakaian`): Pertahankan `#detail-jenis-${index}`, `#detail-potong-${index}`, `#detail-kondisi-${index}`, dan tombol `+ Tambah Item` (ubah gaya ke Soft Teal `bg-[#F0FDFA] border-teal-200 text-[#115E59]`).
  - Step 3 (Voucher & DP): Tombol `Cek Voucher` ganti dari hitam `bg-slate-900` ke **Deep Petrol Teal `bg-[#0F2933] hover:bg-[#163C4A]`**. Pertahankan `#transaksi-voucher`, `#transaksi-dp`, tombol cepat `Rp 0`, `50%`, `Lunas`, serta tombol `Kosongkan` saat voucher invalid (`role="alert"`).

---

### 2.4 `Transaksi/Show.tsx` & `Transaksi/Index.tsx`

- **`Transaksi/Show.tsx`:**
  - Top Status Strip: Header nota dengan `Nomor Nota Resmi`, maks 3 status badge utama (`StatusTransaksi`, `StatusPembayaran`, `TahapTerakhir`), angka `Sisa Tagihan` menonjol di kanan.
  - Baris Aksi Kontekstual: Gunakan hierarki tombol jelas — aksi primer (`Catat Pelunasan` / `Serah Terima Loket`) memakai `#0F766E` / `#047857`, aksi sekunder (`Ubah Layanan (KK-02)`, `Laporkan Insiden`, `Batalkan Transaksi (KK-08)`) memakai tombol outline terstruktur dengan ikon `lucide-react` (bukan 3 pill pastel berdekatan seperti tombol mainan!). Pertahankan teks persis `Ubah Layanan (KK-02)` dan `Batalkan Transaksi (KK-08)` karena diuji langsung di `REG-03`!
  - Banner Konteks (`KK-09`, `KK-08`, `KK-06`, `KK-04`/`05`): Gunakan gaya callout dengan `border-l-4` + ikon `lucide-react` dan latar kalem.
  - Grid Identitas (5 col) & Tagihan (7 col): Hilangkan pill `Reguler` & `Wajib Lunas`; tampilkan `Cuci Setrika • Reguler` dan `Hak Bayar Akhir: Wajib Lunas` (atau chip `Boleh Bayar Akhir` bila `true`).
  - `Riwayat & Alur Tahap Produksi`: Tampilkan stepper horizontal bersih dengan dot status + garis penghubung di atas daftar log.
  - `Audit Trail Transaksi`: Kurangi badge per item (tampilkan nama aksi manusiawi + teks kecil kode aksi monospasi, tanpa pill abu-abu tebal berlebihan).
- **`Transaksi/Index.tsx`:**
  - Pakai `FilterToolbar` (`#0F2933` tombol `Cari`) dan `DataTable` (`<caption>` + `<th scope="col">` + `<th scope="row">`).
  - Kurangi kepadatan badge di kolom status & layanan: maks 2 badge per baris (`StatusPembayaran` + `TahapProduksi`), sementara `Reguler`, `Wajib Lunas`, dan metadata kuantitas tampil sebagai teks terstruktur.

---

### 2.5 `Produksi/Index.tsx` — Bengkel Produksi Bebas Badge-Fatigue

- **Top Filter Bar (`5 Stage StatTile`):** `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3`. Saat `tahapStatus === stage`, kartu menampilkan `border-2 border-[#0F766E] bg-[#F0FDFA]` + ikon centang `Check` + teks `Aktif` (WCAG 1.4.1).
- **Search Toolbar:** Memakai `FilterToolbar` dengan label exact `Cari Nota / Pelanggan` dan tombol submit exact `Terapkan Filter` berwarna **Deep Petrol Teal (`#0F2933`)**.
- **Kartu Antrean Produksi (`<article>`):**
  - Header Kartu: Nomor Nota (`font-mono font-bold`), maks 2–3 badge (`StatusTransaksi`, `StatusPembayaran`, plus `Insiden Menunggu` jika > 0 — tahap produksi saat ini sudah terlihat jelas di *Pipeline Stepper*!), serta baris aksi di kanan (`Timbang Ulang`, `Laporkan Insiden`, dan **1 Primary CTA `#0F766E`** `Lanjut ke ... →` dengan `min-h-[2.75rem]`).
  - Kolom Kiri (Pelanggan & Layanan): **Hapus 4 pill badge bertumpuk (`Wajib Lunas`, `Reguler`, `JUMLAH (pcs)`, `Tanpa Setrika`, `2.00 pcs`)!** Gantikan dengan **Metadata Terstruktur Bersih**:
    - Pelanggan: `Dewi Lestari • 081234567803` + alamat; tampilkan chip hanya jika `boleh_bayar_akhir === true` (`Boleh Bayar Akhir`), jika false tampilkan teks `Wajib Lunas`.
    - Layanan: `Cuci Sepatu` (+ chip `Express` hanya jika Express, jika Reguler teks `Reguler`), diikuti baris metadata:
      `<span>JUMLAH (pcs)</span> • <span>Tanpa Setrika</span> • <strong className="tabular-nums">2.00 pcs</strong>`
      *(Mempertahankan teks `'Tanpa Setrika'` untuk E2E `REG-02` dan `not.toContain('Disetrika')` untuk sepatu!)*
  - Kolom Kanan (`Rincian Pakaian` + `Alur Tahap Produksi Layanan`):
    - **Visual Pipeline Stepper** horizontal dengan langkah bernomor (`1. Diterima → 2. Dicuci → 3. Dikeringkan → 4. Selesai`):
      - Tahap selesai: lingkaran centang `#047857` + teks emerald gelap.
      - Tahap berjalan (`aria-current="step"`): pil/node aktif `#0F766E` teks putih + ikon aktif.
      - Tahap mendatang: lingkaran abu-abu border `#CBD5E1` + teks `#5B697A`.
      - Untuk `perlu_setrika === false`, tahap `Disetrika` tidak dirender sama sekali (menjaga `getByText(/Disetrika/i)` count 0!).

---

### 2.6 `Pengantaran/Index.tsx` & `Pengantaran/Show.tsx` — Kurir Mobile-First (`390×844px`)

- **`Pengantaran/Index.tsx`:**
  - 3 `StatTile` filter (`Dijadwalkan`, `Berjalan`, `Selesai`) dengan indikator aktif non-color-only.
  - `FilterToolbar` dengan tombol `#0F2933` `Terapkan`, `DataTable` dengan `<caption>` & `scope`.
  - Tombol header `+ Buat Jadwal Pengantaran` memakai `#0F766E`.
  - **Modal Buat Jadwal Multi-Pelanggan:** Di dalam daftar checkbox nota, batasi badge per kartu nota maksimal 2 (`Belum Bayar`/`Lunas`, dan `Boleh Bayar Akhir` jika true / `Pernah Gagal Antar` jika true); tampilkan kecepatan (`Reguler`/`Express`), layanan, kuantitas, dan alamat sebagai teks bersih agar daftar mudah dipindai.
- **`Pengantaran/Show.tsx` (Prioritas Mobile `390px`):**
  - Header halaman di `AppLayout`: judul `Sesi Pengantaran #N` bebas terpotong (`Sesi Peng...` terselesaikan lewat tata letak 2 baris untuk `headerActions` di `<640px`).
  - Kartu Overview Sesi: nomor sesi, `PengantaranStatusBadge`, badge gagal jika > 0, progress bar `#0D9488` dengan teks `X/Y item (%)`.
  - Kartu Pelanggan (`<article>`):
    - **Hierarki Mobile-First:**
      1. Nomor urut `#1` + Nomor Nota + **maks 2 badge** (`ItemPengantaranStatusBadge` + `PaymentStatusBadge`; `TransactionStatusBadge` & `PayLaterBadge(true)` hanya bila relevan/exception; `Wajib Lunas` & `Reguler` sebagai metadata teks!).
      2. **Nama Pelanggan & Nomor Telepon** (`text-base font-bold`) + **Alamat Pengantaran** (`bg-[#F8FAFC] rounded-xl p-3 border border-[#D8E2E6]` dengan ikon `MapPin` `lucide-react` agar kurir langsung melihat tujuan saat di motor/mobil!).
      3. Box Ringkasan Tagihan (`Total Tagihan`, `Sudah Dibayar`, `Sisa Tagihan`) menonjol dengan `tabular-nums`.
      4. Peringatan `KK-06` (`Peringatan Wajib Lunas (KK-06)` atau `Hak Bayar Akhir Aktif (KK-06)`) dengan `border-l-4`.
      5. **Action Bar Touch-Friendly (`min-h-[2.75rem]` / `44px`):** Pada mobile `<640px`, tombol aksi primer (`Ambil dari Outlet`, `Mulai Dalam Perjalanan`, `Tandai Diterima Pelanggan`) dibuat `w-full sm:w-auto min-h-[2.75rem]` dengan kontras tinggi (`#0F766E` / `#047857`), dan `Tandai Gagal` (`border-rose-300`) atau `Jadwalkan Ulang (KK-07)` berjajar rapi tanpa menyentuh tepi viewport (`scrollWidth <= innerWidth`).

---

### 2.7 `SerahTerima/Index.tsx`, `Insiden/Index.tsx`, `Audit/Index.tsx`, & Master (`Pelanggan`, `Layanan`, `Voucher`)

- **`SerahTerima/Index.tsx`:**
  - 4 `StatTile` KPI (`Siap Diambil`, `Sedang Diantar Kurir`, `Nota Piutang Aktif`, `Total Nominal Piutang`).
  - `tablist` (`Siap Diambil (SELESAI)`, `Piutang (BELUM_LUNAS)`, `Riwayat Diambil`) memakai gaya segmented/underline tab modern dengan indikator aktif solid `#0F766E` + teks putih (atau underline `border-b-2 border-[#0F766E]` + ikon/badge hitungan kontras tinggi).
  - `FilterToolbar` (`#0F2933` `Cari`).
  - `DataTable`: Kurangi badge dari 5–6 menjadi maks 2–3 (`TransactionStatusBadge`, `PaymentStatusBadge`, dan `Boleh Bayar Akhir` jika `allowed === true` — WAJIB pertahankan teks exact `'Boleh Bayar Akhir'` di baris piutang untuk `REG-04`!).
- **Master `Pelanggan/Index.tsx` & `Voucher/Index.tsx`:**
  - Pakai `FilterToolbar` (`#0F2933`), `DataTable` dengan `<caption>` & `scope`, tombol header `#0F766E` (`+ Tambah Pelanggan`, `+ Tambah Voucher`), tombol `Hapus` outline rose, dan `Wajib Lunas` di tabel Pelanggan cukup tampil sebagai teks netral sedangkan `Boleh Bayar Akhir` memakai badge indigo lembut.
- **Master `Layanan/Index.tsx`:**
  - **Perbaikan Badge Fatigue (`07-layanan-ubah-tarif-9500.png`):** Saat ini 1 baris tabel memiliki 8 pill badge! Ubah kolom:
    - `Kecepatan`: Chip hanya untuk `Express`, teks `Reguler` bersih (WAJIB pertahankan teks `'Reguler'` untuk `REG-01`!).
    - `Setrika`: Teks bersih `Perlu Setrika` atau `Tanpa Setrika` dengan ikon kecil (`CheckCircle2` / `MinusCircle`) tanpa pill penuh.
    - `Urutan Tahap Produksi`: Tampilkan sebagai **inline step trail** (`1. Diterima → 2. Dicuci → 3. Dikeringkan → 4. Selesai`) dalam teks `text-xs font-medium` dengan panah `→`, bukan 5 chip berwarna per baris!
- **`Insiden/Index.tsx` & `Audit/Index.tsx`:**
  - Pakai `FilterToolbar` (`#0F2933` `Terapkan Filter` / `Terapkan`) dan `DataTable`.
  - Di `Audit/Index.tsx`, ubah tombol header `Kelola Pelunasan Piutang →` menjadi `border border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100` (atau `bg-[#0F766E] text-white`) yang jauh lebih selaras dengan palet atelier ketimbang oranye mencolok; jaga agar `PENGANTARAN_RESCHEDULED` tetap memiliki elemen terpisah `<span>PENGANTARAN_RESCHEDULED</span>` untuk `getByText('PENGANTARAN_RESCHEDULED', { exact: true })`.

---

### 2.8 `Transaksi/Nota.tsx` — Pratinjau & Cetak A4

- **Non-Print Toolbar (`print:hidden`):**
  - Perhalus tampilan toolbar atas agar konsisten dengan desain sistem: tombol `← Kembali ke Detail` dan `Daftar Transaksi` memakai `border-[#7C8C9D]`, tombol `Cetak Nota` memakai `#0F766E hover:bg-[#115E59]` dengan ikon `<Printer />` dari `lucide-react`.
- **Lembar Nota A4 (`<article>`):**
  - Gunakan tipografi `Plus Jakarta Sans` + `JetBrains Mono` (`tabular-nums`) dan monogram header `bg-[#0F2933]` / aksen `#0F766E` pada layar, sementara tetap mempertahankan `@media print` A4 (`@page { size: A4 portrait; margin: 12mm; }`, `print:border-0 print:p-0 print:shadow-none`) agar cetakan tetap bersih, rapi, dan pas 1 halaman.
  - Pertahankan seluruh heading dan teks kontrak (`CleanWash Laundry`, `← Kembali ke Detail`, `Status Pembatalan Transaksi`, `Rincian Laporan Insiden & Kompensasi`, `Terkonfirmasi`).

---

## 3. Playwright E2E Selector Preservation Matrix (WAJIB DIPATUHI)

Setiap selector berikut diverifikasi langsung dari [regression-cleanwash.spec.ts](file:///home/yoga/Data/Kuliah/Sistem%20Informasi/tests/e2e/regression-cleanwash.spec.ts) dan [qa-harness.ts](file:///home/yoga/Data/Kuliah/Sistem%20Informasi/tests/e2e/helpers/qa-harness.ts). `frontend-developer` **DILARANG** mengubah nama aksesibel, ID elemen, atau struktur tag yang mematahkan baris di bawah ini:

| Halaman / Modul | Selector E2E Exact | Aturan Pelestarian Wajib |
| --- | --- | --- |
| **Global Shell (`AppLayout`)** | `getByRole('button', { name: /Keluar/ })`, `getByRole('button', { name: 'Buka menu navigasi' })`, `getByRole('dialog', { name: 'Menu navigasi CleanWash' })`, `getByRole('button', { name: 'Tutup menu navigasi' })` | Pertahankan teks `Keluar`, `aria-label` tombol drawer, dan landmark dialog mobile bernama exact `'Menu navigasi CleanWash'`. |
| **Sidebar `PETUGAS`** | `getByRole('link', { name: label, exact: true })` untuk: `Dashboard` (`aria-current="page"`), `Penerimaan Baru`, `Transaksi`, `Insiden & Kompensasi`, `Pelanggan`, `Jenis Layanan`, `Voucher`, `Pengantaran`, `Serah Terima`, `Audit & Piutang` | Label link sidebar tidak boleh ditambah angka badge di dalam teks `<Link>` (atau jika ada badge/subtitle, pastikan accessible name tetap exact, atau taruh counter di luar/jangan dipakai di link sidebar Petugas!). |
| **Sidebar `PENGANTAR`** | `getByRole('link', { name: 'Jadwal Pengantaran', exact: true })` | Teks link exact `'Jadwal Pengantaran'`. |
| **`Auth/Login.tsx`** | `getByRole('heading', { name: 'CleanWash Laundry' })`, `getByLabel('Alamat Email')`, `getByLabel('Kata Sandi')`, `getByRole('button', { name: 'Masuk' })`, **`locator('form p.text-rose-600').first()`** | Heading `CleanWash Laundry` wajib selalu visible (`desktop` & `mobile`); `<p>` pesan error form WAJIB tetap memiliki class **`text-rose-600`**! |
| **`Dashboard/Index.tsx`** | `getByRole('heading', { name: 'Dashboard' })`, `getByText('Selamat bertugas, ...')`, `getByText('1 Insiden Menunggu Konfirmasi')`, `getByRole('link', { name: /Konfirmasi Sekarang/ })`, `Antrean Transaksi Aktif`, `Perlu Timbang Ulang`, `Jadwal Pengantaran Aktif`, `Item Antar Aktif`, `Terkirim Hari Ini`, `Gagal Perlu Tindak Lanjut` | Seluruh label KPI `PEGAWAI` & `PENGANTAR`, salam pengguna, dan banner insiden menunggu konfirmasi harus tetap ada persis. |
| **`Pelanggan/Index.tsx`** | `+ Tambah Pelanggan`, `Nama Pelanggan`, `Nomor Telepon`, `Alamat Lengkap`, `Simpan Pelanggan`, `Edit`, `Simpan Perubahan`, `Hapus`, `Ya, Hapus Pelanggan`, `tr` | Pertahankan label input, tombol, dan baris `<tr>`. |
| **`Layanan/Index.tsx`** | `tr` berisi `'Cuci Setrika'` dan `'Reguler'`, `Edit`, `Harga Satuan (Rp)`, `Simpan Perubahan`, `Rp 9.500/kg` | Teks `'Reguler'` harus tetap ada pada sel layanan reguler; format tarif `Rp 9.500/kg` utuh. |
| **`Voucher/Index.tsx`** | `+ Tambah Voucher`, `Nomor / Kode Voucher`, `Nilai Potongan (Rp)`, `Masa Berlaku (Tanggal Terakhir Berlaku)`, `Simpan Voucher`, `role="status"` (`Voucher berhasil ditambahkan`), `tr` | Pertahankan label form & flash status. |
| **`Transaksi/Create.tsx`** | Heading `Penerimaan Nota Baru`, `getByLabel('Pelanggan')`, `getByLabel('Jenis Layanan (Aktif)')`, `#transaksi-kuantitas`, `+ Tambah Item`, `#detail-jenis-{i}`, `#detail-potong-{i}`, `#detail-kondisi-{i}`, `#transaksi-voucher`, `Cek Voucher`, `role="alert"` (`kedaluwarsa`), `Kosongkan`, `Voucher {KODE} valid!`, `Rp 0`, `50%`, `Lunas` (exact), `#transaksi-dp`, `#transaksi-catatan`, `Terbitkan Nota & Simpan` | Seluruh ID input `#transaksi-*` / `#detail-*` dan label tombol harus dipertahankan 100%. |
| **`Transaksi/Show.tsx`** | `Cetak Nota`, `HEMAT10K` (exact), `BERKAH5K` (exact), `Imutabilitas Tarif Snapshot (KK-09)`, `Catat Pelunasan`, `Lunas` (exact), `Ubah Layanan (KK-02)`, `Batalkan Transaksi (KK-08)`, `Transaksi Dibatalkan (KK-08)` (exact), `Batal Gratis` (count 0 saat diterima), `Dibatalkan` (exact), `Diambil` (exact), `Diambil langsung oleh pelanggan di loket kasir.`, `Sedang Diantar Kurir (DIAMBIL)`, `Serah Terima Loket` (count 0 saat diantar), serta modal `dialog[open]` dengan `input[name="nominal_bayar"]`, `select[name="id_layanan_baru"]`, `input[name="berat_atau_jumlah_baru"]`, `textarea[name="alasan_perubahan"]`, `input[name="biaya_pembatalan"]`, `textarea[name="alasan_pembatalan"]`, dan tombol `Catat Pembayaran Pelunasan`, `Simpan Perubahan Layanan`, `Konfirmasi Pembatalan` | Jaga seluruh label tombol KK-02 / KK-08, banner KK-09, status badge exact, dan atribut `name="..."` pada kontrol modal! |
| **`Transaksi/Nota.tsx`** | Heading `CleanWash Laundry`, `Rincian Laporan Insiden & Kompensasi`, `Terkonfirmasi` (exact), `Status Pembatalan Transaksi`, `PROMOBATAL5K` (exact), `← Kembali ke Detail` | Jaga seluruh heading cetak dan teks tautan `← Kembali ke Detail`. |
| **`Produksi/Index.tsx`** | `getByLabel('Cari Nota / Pelanggan')`, `Terapkan Filter`, `locator('article')`, `Timbang Ulang`, `Laporkan Insiden`, `Lanjut ke Dicuci/Dikeringkan/Disetrika/Selesai`, `Tanpa Setrika`, count 0 `/Disetrika/i` untuk sepatu, `3.50 kg`, `Rp 18.000`, `Belum Lunas`, modal `dialog[open]` (`input[name="berat_aktual"]`, `textarea[name="catatan"]`, `Peringatan Status Pembayaran (KK-01)`, `Simpan Berat Aktual`, `select[name="id_detail"]`, `input[name="jenis_insiden"][value="RUSAK"]`, `textarea[name="keterangan"]`, `MENUNGGU_KONFIRMASI`, `Ajukan Laporan Insiden`) | Kartu antrean wajib tetap memakai tag **`<article>`**; teks `'Tanpa Setrika'` wajib tetap muncul; jangan munculkan kata `'Disetrika'` di kartu layanan tanpa setrika. |
| **`Insiden/Index.tsx`** | `tr` berisi nota, `Konfirmasi & Potong Saldo`, modal `textarea[name="keterangan_konfirmasi"]`, `role="status"` (`dikonfirmasi`) | Pertahankan label tombol & `name="keterangan_konfirmasi"`. |
| **`Pengantaran/Index.tsx` & `Show.tsx`** | `+ Buat Jadwal Pengantaran`, modal `select[name="id_petugas_antar"]`, `label` berisi nota + `input[type="checkbox"]`, `/2 nota,\s*2 pelanggan/`, `Buat Jadwal (1 Nota)` / `(2 Nota)`; di `Show`: `Mulai Pengantaran`, `locator('article')`, `Ambil dari Outlet`, `Mulai Dalam Perjalanan`, `Tandai Diterima Pelanggan`, `Tandai Gagal`, `Jadwalkan Ulang (KK-07)`, `Diambil` (exact), `Dalam Perjalanan` (exact), `Diterima` (exact), `Gagal` (exact), `Berjalan` (exact), `Belum Lunas` (exact), `Peringatan Wajib Lunas (KK-06)`, `Hak Bayar Akhir Aktif (KK-06)`, `Sudah dijadwalkan ulang pada sesi lain.`, modal `textarea[name="alasan_gagal"]`, `Simpan Status Gagal`, `Buat Jadwal Ulang` | Kartu item kurir wajib tetap **`<article>`**; modal pilih nota wajib tetap membungkus nota di dalam **`<label>`**; pertahankan semua label tombol aksi kurir dan teks badge exact. |
| **`SerahTerima/Index.tsx`** | `tr` berisi nota, `Boleh Bayar Akhir` (exact), `Belum Lunas` (exact), `/Catat\s*Pelunasan/`, `Serah Terima` (exact), `Info Kurir Aktif`, modal `Penutupan Otomatis Jadwal Kurir (MENUNGGU)`, `Konfirmasi Serah Terima`, `Sedang Dibawa Kurir Pengantaran`, `Tutup` (exact) | Jangan hilangkan badge/teks exact `Boleh Bayar Akhir` & `Belum Lunas` di baris piutang; pertahankan label tombol `Serah Terima` exact & `Info Kurir Aktif`. |
| **`Audit/Index.tsx`** | `Ringkasan Piutang Pelanggan Hak Bayar Akhir (KK-06)`, `tr`, `PENGANTARAN_RESCHEDULED` (exact) | Pertahankan heading section piutang dan `<span>PENGANTARAN_RESCHEDULED</span>` exact di baris tabel audit. |

---

## 4. Checklist Urutan Eksekusi untuk `frontend-developer`

1. **Fondasi Token & Font:** Perbarui `resources/views/app.blade.php`, `resources/css/app.css`, dan `resources/js/app.tsx` (`@fontsource/plus-jakarta-sans` + `@fontsource/jetbrains-mono` + Tailwind v4 `@theme` + `:focus-visible` + `forced-colors` + `prefers-reduced-motion`).
2. **Komponen Shared:** Perbarui `StatusBadge.tsx`, `Modal.tsx`, `Pagination.tsx`, `EmptyState.tsx`, `PelunasanModal.tsx`, `SerahTerimaModal.tsx`, `LaporkanInsidenModal.tsx`, `KonfirmasiKompensasiModal.tsx`, dan ekstrak `StatTile.tsx`, `FilterToolbar.tsx`, serta `MetadataRow.tsx` (jika dibutuhkan) memakai `lucide-react`.
3. **App Shell & Auth & Dashboard:** Rombak `AppLayout.tsx` (sidebar full-height `#0F2933` terkelompok, header solid `bg-white`, `390px` header bebas truncation, skip link `<h1 id="main-content" tabIndex={-1}>`, mobile `<dialog>` drawer), `Auth/Login.tsx` (split atelier), dan `Dashboard/Index.tsx` (8 kartu simetris Petugas + action strip + fix literal `\u2192`).
4. **Workspace Kasir, Produksi, Kurir, Loket, Master, & Nota:** Terapkan blueprint masing-masing pada 13 halaman tersisa sambil mematuhi **Playwright E2E Selector Preservation Matrix** §3.
5. **Koordinasi `auth.failed` Bahasa Indonesia:** Koordinasikan dengan `fullstack-developer` untuk melokalisasi pesan `auth.failed` ke Bahasa Indonesia agar `01-login-invalid-password.png` bebas teks Inggris.
6. **Gerbang Verifikasi Sebelum Handoff:** Jalankan `npx tsc --noEmit`, `npm run build`, `./vendor/bin/pint --test`, `php artisan test`, dan `npx playwright test --reporter=list` (atau koordinasikan eksekusi E2E dengan `qa-engineer`) lalu serahkan screenshot hasil ke `ui-ux-designer` + `qa-engineer` untuk **Visual Sign-Off**.
