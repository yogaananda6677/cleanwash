# CleanWash Design System — *Crisp Laundry-Tech Atelier*

| Field | Value |
| --- | --- |
| **Product** | CleanWash — Sistem Informasi Manajemen Operasional Laundry |
| **Arah Visual** | **Crisp Laundry-Tech Atelier** (bersih, kalem, modern, operasional berkecepatan tinggi) |
| **Stack Target** | Laravel 12 + Inertia.js (React 19 + TypeScript Strict) + Tailwind CSS v4 |
| **Font Lokal** | `@fontsource/plus-jakarta-sans` & `@fontsource/jetbrains-mono` |
| **Ikonografi** | `lucide-react` (terpadu, tanpa SVG path manual berulang) |
| **Standar Mutu** | WCAG 2.1/2.2 Level AA (`>= 4.5:1` teks, `>= 3.0:1` batas UI/indikator), `modern-web-guidance` |
| **Status Dokumen** | `DESIGN_APPROVED` — Visual & UX Sign-Off Verified (`ADR-012`, 0 Defect Pasca Re-QA) |
| **Author** | `ui-ux-designer` |
| **Last Updated** | 2026-11-11 |

---

## 1. Filosofi Visual & Prinsip Ergonomi Berbasis Aktor

CleanWash bukan aplikasi administrasi generik; ia adalah **alat kerja operasional harian** yang dipakai di tiga kondisi fisik yang sangat berbeda:

1. **Petugas / Kasir (Loket Gerai — Desktop `1280px–1440px`):**
   - Kecepatan input transaksi dan akurasi nominal Rupiah adalah prioritas utama.
   - Kasir membutuhkan form penerimaan bebas *scroll* berlebih (*sticky live calculator*), angka monospasi rata kanan (`tabular-nums`), peringatan kondisi khusus (`KK-01`–`KK-09`) yang jelas namun tidak memekakkan mata, dan Dashboard bebas pengulangan menu sidebar.
2. **Pegawai Produksi (Area Cuci/Setrika — Tablet/Desktop `768px–1280px`):**
   - Bekerja dengan tangan sering sibuk/lembab di ruang pencucian.
   - Membutuhkan kartu antrean berstruktur kuat, *pipeline stepper* tahapan produksi yang langsung membedakan layanan dengan setrika vs tanpa setrika (sepatu), tombol aksi utama yang sangat kontras, serta target sentuh minimal `44×44px` (`2.75rem`).
3. **Petugas Pengantaran / Kurir (Lapangan — Mobile-First `390×844px`):**
   - Mengoperasikan aplikasi sambil membawa paket di luar ruangan.
   - Membutuhkan *header* mobile tanpa pemotongan teks (*truncation clash*), nama pelanggan & alamat pengantaran menjadi hierarki utama di atas metadata teknis, sisa tagihan langsung terbaca, dan tombol aksi berurutan berukuran penuh di layar sempit (`min-block-size: 2.75rem`).
4. **Lembar Cetak Nota Resmi A4 (`/transaksi/{nota}/nota`):**
   - Diperiksa dan diserahkan kepada pelanggan; tipografi crisp, kontras tajam pada kertas putih, dan aturan `@media print` tetap stabil.

### 4 Pilar Desain *Crisp Laundry-Tech Atelier*

1. **Calm Precision, Not Card Soup:** Setiap kontainer harus punya alasan operasional. Hilangkan duplikasi metrik dan kartu pintasan yang hanya mengulang navigasi sidebar.
2. **2–3 Badge Budget per Baris/Kartu:** *Pill badge* dikhususkan untuk **status bermakna** (status pembayaran, status transaksi, tahap aktif, atau pengecualian kritis seperti `Boleh Bayar Akhir` / `Insiden Pending`). Metadata deskriptif (`Reguler`, `2.00 kg`, `pcs`, `Wajib Lunas`, `BERAT`) tampil sebagai **teks terstruktur dengan pemisah `•`**.
3. **Single Primary CTA per Area:** Dalam satu viewport, kartu, atau toolbar, hanya ada **satu** tombol aksi utama (`Fresh Teal #0F766E`). Aksi sekunder memakai netral lembut atau *Deep Petrol Teal* (`#0F2933`) untuk tombol submit filter — menggantikan tombol hitam pekat `bg-slate-900` yang terasa janggal.
4. **Accessible by Architecture:** Kontras teks dan batas kontrol diverifikasi secara matematis; status dan halaman aktif tidak pernah hanya mengandalkan warna (WCAG 1.4.1); kontrol dialog memakai elemen native `<dialog>`; tabel memakai semantik lengkap (`<caption>`, `scope="col"`, `scope="row"`, region scrollabel `tabIndex={0}`).

---

## 2. Ringkasan Temuan Audit Visual & UX (Baseline Live Screenshots)

Audit dilakukan terhadap seluruh 28 screenshot di `docs/qa/screenshots/*.png` dan source code di `resources/js/**`:

| ID Audit | Lokasi & Bukti Screenshot | Temuan Masalah | Solusi Terukur di Redesign |
| --- | --- | --- | --- |
| **UX-01** | `AppLayout.tsx` (`05-transaksi-nota1-tersimpan-lunas.png`) | Header sticky `bg-white/95 backdrop-blur-xs` tembus pandang sehingga teks `NOMOR NOTA RESMI` dan `Sisa Tagihan` membayang (*ghosting*) di belakang header saat di-scroll. | Ubah header menjadi **solid opaque `#FFFFFF`** (`bg-white border-b border-[#D8E2E6]`) tanpa transparansi. |
| **UX-02** | `AppLayout.tsx` (`05`, `25` full-page screenshots) | Sidebar desktop `fixed inset-y-0` berhenti di tinggi viewport `900px` pada dokumen panjang, meninggalkan kolom kiri kosong di bawah saat halaman panjang atau screenshot penuh. | Gunakan layout flex desktop `lg:flex lg:min-h-screen` dengan wrapper sidebar penuh tinggi dokumen (`lg:w-64 lg:shrink-0 bg-[#0F2933]`) dan konten nav internal `lg:sticky lg:top-0 lg:h-screen`. |
| **UX-03** | `Dashboard/Index.tsx` (`02-dashboard-petugas.png`, `03-dashboard-kurir.png`) | **Card Soup (20 kartu):** 10 KPI dengan baris ke-3 yatim (2 kartu kosong di kanan) + 9 kartu `Akses Cepat` yang menduplikasi 100% menu sidebar. Di `03-dashboard-kurir.png`, literal `\u2192` tercetak mentah sebagai string teks! | Kelompokkan KPI Petugas secara simetris (**4 Operasional + 4 Keuangan & Master** atau 8 kartu simetris), ganti 9 kartu duplikat menjadi *Compact Action Strip* 4 tugas tersering, perbaiki `\u2192` menjadi panah nyata `→` / ikon `lucide-react`. |
| **UX-04** | `Pengantaran/Show.tsx` (`28-mobile-viewport-pengantaran.png`) | Di viewport `390px`, header menyempitkan judul menjadi `Sesi Peng...` dan `Kurir: Andi Kuri...` karena tombol `← Kembali` dan `Keluar` berdesakan di satu baris. | Pindahkan `headerActions` ke sub-bar atau jadikan baris judul penuh pada `<640px` (`flex-wrap`), serta ringkas tombol `Keluar` di mobile menjadi kompak (`px-2.5` + ikon + label aksesibel). |
| **UX-05** | `Produksi/Index`, `Layanan/Index`, `Pengantaran/Show` (`14`, `07`, `28`) | **Badge Fatigue:** Satu kartu/baris memuat hingga 8–9 pill badge berwarna-warni sekaligus (`Aktif`, `DP`, `Diterima`, `Wajib Lunas`, `Reguler`, `JUMLAH (pcs)`, `Tanpa Setrika`, `2.00 pcs`, plus 5 tahap). | Terapkan **2–3 Badge Budget**. Tampilkan tahapan layanan sebagai *inline stepper* ringkas (`1. Diterima → 2. Dicuci...`) dan ubah atribut deskriptif menjadi teks terstruktur. |
| **UX-06** | `Transaksi/Create`, `Produksi`, `SerahTerima`, `Audit`, `Layanan` (`04`, `07`, `14`, `24`, `25`) | Tombol `Cari`, `Terapkan`, `Terapkan Filter`, dan `Cek Voucher` memakai hitam pekat `bg-slate-900` yang terlihat terputus dari tema utama. | Ganti ke **Deep Petrol Teal (`#0F2933` hover `#163C4A`)** atau **Soft Teal Secondary** agar harmonis dengan identitas visual sidebar & brand. |
| **UX-07** | `Auth/Login.tsx` (`01-login-invalid-password.png`) | Halaman login generik kartu tengah di atas latar gelap polos, serta pesan error validasi bawaan Laravel `"These credentials do not match our records."` masih berbahasa Inggris. | Rancang ulang menjadi **Split Atelier Layout** (kiri: showcase brand + 3 pilar operasional + zona waktu WIB; kanan: form masuk bersih) + rekomendasi lokalisasi pesan `auth.failed` ke Bahasa Indonesia. |
| **UX-08** | Seluruh halaman & `app.css` / `app.blade.php` | Font masih mengandalkan fallback `'Instrument Sans'` tanpa import `@fontsource/*`; belum ada skip link `#main-content`; banyak border input `border-slate-300` (`#CBD5E1`, kontras `1.47:1` < `3.0:1` WCAG 1.4.11); banyak fixed `h-9`/`h-12` pada tombol ikon/nav. | Bundel `@fontsource/plus-jakarta-sans` & `@fontsource/jetbrains-mono` lokal; tambah skip link; naikkan border kontrol interaktif ke `#7C8C9D` (`3.45:1`); pakai `min-h-*` dan `:focus-visible` `3px` outline; ganti `<svg>` manual dengan `lucide-react`. |

---

## 3. Sistem Warna Semantik & Token Tailwind v4 (`@theme`)

### 3.1 Alasan Pemilihan Tone Teal yang Tepat (WCAG 4.5:1 Verification)

Dalam riset kontras WCAG 2.1:
- Warna `#0D9488` (Teal 600) terhadap teks putih `#FFFFFF` hanya menghasilkan rasio **3.74:1** — **GAGAL** untuk teks normal `< 18pt`!
- Karena itu, CleanWash menggunakan **`#0F766E` (Teal 700, rasio 5.47:1)** untuk tombol Primary berisi teks putih, **`#115E59` (Teal 800, rasio 7.58:1)** untuk hover/teks badge teal, dan menyimpan **`#0D9488` / `#14B8A6`** khusus untuk aksen non-teks di permukaan gelap (`#0F2933`) atau garis indikator.

### 3.2 Tabel Token Warna & Kontras Terverifikasi

| Token CSS | Hex | Peran Penggunaan | Kontras Terverifikasi |
| --- | --- | --- | --- |
| `--color-canvas` | `#F5F7F8` | Latar belakang utama halaman (*soft alabaster*) | `16.61:1` vs `#0F172A` |
| `--color-surface` | `#FFFFFF` | Kartu utama, modal, header solid, baris tabel | `17.85:1` vs `#0F172A` |
| `--color-surface-elevated` | `#F8FAFC` | Header tabel, panel ringkasan kalkulasi, baris hover | `4.55:1` vs `#64748B` |
| `--color-surface-sunken` | `#EEF2F5` | Latar input read-only, track stepper | — |
| `--color-border-hairline` | `#D8E2E6` | Garis pemisah kartu, divider tabel, border header | Dekoratif halus |
| `--color-border-control` | `#7C8C9D` | Border input, select, textarea, checkbox, tombol outline | **`3.45:1`** vs `#FFFFFF` (Lulus WCAG 1.4.11 `>= 3:1`) |
| `--color-petrol-950` | `#0F2933` | Background sidebar *Deep Petrol Teal* & tombol filter sekunder | **`15.16:1`** vs `#FFFFFF` |
| `--color-petrol-900` | `#163C4A` | Hover/active item sidebar, hover tombol sekunder | **`11.80:1`** vs `#FFFFFF` |
| `--color-petrol-800` | `#1A3B47` | Border pemisah internal di dalam sidebar gelap | — |
| `--color-petrol-muted` | `#9FB7C0` | Label grup & teks sekunder pada sidebar gelap | **`7.23:1`** vs `#0F2933` |
| `--color-brand-50` | `#F0FDFA` | Latar soft highlight, chip brand, tombol soft teal | **`7.27:1`** vs `#115E59` |
| `--color-brand-100` | `#CCFBF1` | Border/latar badge aktif & fokus lembut | **`6.73:1`** vs `#115E59` |
| `--color-brand-500` | `#14B8A6` | Indikator garis bar aktif di sidebar gelap & ikon aksen di sidebar | **`6.09:1`** vs `#0F2933` |
| `--color-brand-600` | `#0D9488` | Progress bar, ikon dekoratif besar, aksen ring | **`4.05:1`** vs `#0F2933` |
| `--color-brand-700` | `#0F766E` | **Primary CTA background (teks putih)**, teks link utama, focus ring | **`5.47:1`** vs `#FFFFFF` (Lulus WCAG AA `>= 4.5:1`) |
| `--color-brand-800` | `#115E59` | **Primary CTA hover**, teks aksen di atas `#F0FDFA` | **`7.58:1`** vs `#FFFFFF` |
| `--color-ink-primary` | `#0F172A` | Judul halaman, nilai metrik, nomor nota, nominal total | **`17.85:1`** vs `#FFFFFF` |
| `--color-ink-secondary` | `#475569` | Label field, isi tabel sekunder, subjudul | **`7.58:1`** vs `#FFFFFF` / **`7.05:1`** vs `#F5F7F8` |
| `--color-ink-muted` | `#5B697A` | Caption, timestamp, helper text, placeholder input | **`5.61:1`** vs `#FFFFFF` / **`5.22:1`** vs `#F5F7F8` |
| `--color-success-bg` / `-fg` | `#ECFDF5` / `#065F46` | Status Lunas, Selesai, Tersedia, Diterima (`dot #047857`) | **`7.29:1`** teks / **`5.21:1`** dot |
| `--color-warning-bg` / `-fg` | `#FFFBEB` / `#78350F` | Status DP, Belum Lunas, Dikeringkan, Menunggu Konfirmasi (`dot #B45309`) | **`8.75:1`** teks / **`4.84:1`** dot |
| `--color-danger-bg` / `-fg` | `#FFF1F2` / `#9F1239` | Status Belum Bayar, Gagal, Dibatalkan, Hilang (`dot #BE123C`) | **`7.30:1`** teks / **`5.72:1`** dot |
| `--color-danger-solid` | `#BE123C` | Tombol aksi destruktif (`Hapus`, `Batalkan`, `Laporkan Insiden`) | **`6.29:1`** vs `#FFFFFF` |
| `--color-info-bg` / `-fg` | `#EEF2FF` / `#3730A3` | Status Express, Hak Bayar Akhir (`boleh_bayar_akhir`), Dicuci (`dot #4338CA`) | **`8.88:1`** teks / **`7.07:1`** dot |

### 3.3 Konfigurasi `@theme` & CSS Variables (`resources/css/app.css`)

```css
@import 'tailwindcss';

@source '../../vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php';
@source '../../storage/framework/views/*.php';
@source '../**/*.blade.php';
@source '../**/*.{js,jsx,ts,tsx}';

@theme {
    --font-sans: 'Plus Jakarta Sans', ui-sans-serif, system-ui, -apple-system, sans-serif;
    --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;

    --color-canvas: #F5F7F8;
    --color-surface: #FFFFFF;
    --color-surface-elevated: #F8FAFC;
    --color-border-hairline: #D8E2E6;
    --color-border-control: #7C8C9D;

    --color-petrol-950: #0F2933;
    --color-petrol-900: #163C4A;
    --color-petrol-800: #1A3B47;
    --color-petrol-muted: #9FB7C0;

    --color-brand-50: #F0FDFA;
    --color-brand-100: #CCFBF1;
    --color-brand-500: #14B8A6;
    --color-brand-600: #0D9488;
    --color-brand-700: #0F766E;
    --color-brand-800: #115E59;
}

@layer base {
    html {
        font-size: 16px;
        line-height: 1.5;
        color: #0F172A;
        background-color: #F5F7F8;
    }

    :where(a, button, input, select, textarea, summary, [tabindex]):focus-visible {
        outline: 3px solid #0F766E;
        outline-offset: 2px;
    }
}

@media (forced-colors: active) {
    :where(a, button, input, select, textarea, summary, [tabindex]):focus-visible {
        outline: 3px solid CanvasText;
    }
}

@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
    }
}
```

> **Catatan Penting `form p.text-rose-600`:** Tailwind `text-rose-600` (`#E11D48` / equivalente oklch) pada latar `#FFFFFF` memiliki rasio kontras **4.70:1** (lulus WCAG AA `>= 4.5:1`). Tetap pertahankan class `text-rose-600` pada pesan validasi `<p>` di form `Login.tsx` agar kompatibel 100% dengan selector E2E `page.locator('form p.text-rose-600')`.

---

## 4. Sistem Tipografi Lokal

### 4.1 Import Font Lokal (Bebas CDN Eksternal)

Di `resources/js/app.tsx`, impor bobot font lokal sebelum `./bootstrap` dan `../css/app.css`:

```ts
import '@fontsource/plus-jakarta-sans/400.css';
import '@fontsource/plus-jakarta-sans/500.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/600.css';
```

### 4.2 Skala Tipografi (`rem` & Unitless `line-height`)

| Peran Tipografi | Kelas Tailwind / CSS | Ukuran (`rem` / `px`) | `line-height` (Unitless) | Pemakaian |
| --- | --- | --- | --- | --- |
| **Page Title (`<h1>`)** | `text-xl sm:text-2xl font-bold tracking-tight` | `1.25rem`–`1.5rem` (`20–24px`) | `1.25` | Satu `<h1>` tunggal di header utama halaman |
| **KPI Metric Value** | `text-2xl sm:text-[1.75rem] font-bold tracking-tight tabular-nums` | `1.5rem`–`1.75rem` (`24–28px`) | `1.15` | Angka utama pada `StatTile` & total tagihan |
| **Section Title (`<h2>`)** | `text-base font-bold tracking-tight` | `1rem` (`16px`) | `1.35` | Judul bagian form, kartu besar, judul modal |
| **Sub-heading (`<h3>`)** | `text-sm font-semibold` | `0.875rem` (`14px`) | `1.4` | Sub-grup dalam kartu, judul empty state |
| **Body & Form Input** | `text-sm` | `0.875rem` (`14px`) | `1.5` | Isi utama, input, select, textarea (mencegah auto-zoom iOS bila perlu `>= 14px` / `16px` di mobile) |
| **Table Cell & UI Label** | `text-xs` / `text-[0.8125rem]` | `0.75rem`–`0.8125rem` (`12–13px`) | `1.5` | Label input, sel tabel, tombol sekunder |
| **Table Header & Meta** | `text-[0.6875rem] font-semibold uppercase tracking-wider` | `0.6875rem` (`11px`) | `1.4` | Header `<thead>`, caption grup sidebar |
| **Monospace Data** | `font-mono tabular-nums` | Sama dengan konteks | `1.4` | `CW-YYYYMMDD-XXXX`, kode voucher (`HEMAT10K`), nomor telepon, dan semua nominal `Rp` (`tabular-nums`) |

### 4.3 Aturan Anti-Fixed-Height (WCAG 1.4.12 Text Spacing)

- **DILARANG** memakai `h-7`, `h-8`, `h-9`, `h-10`, atau `h-[...]` tetap pada elemen berisi teks (`<button>`, `<a>`, badge, tab, sel tabel, kartu).
- Gunakan **`min-h-[...]` (`min-block-size`) + padding vertikal (`py-*`)** agar elemen dapat membesar secara vertikal tanpa terpotong bila teks membungkus atau pengguna memperbesar *text spacing* browser (`line-height: 1.5`, `letter-spacing: 0.12em`).
- Contoh standar tombol: `min-h-[2.75rem] px-4 py-2` (touch-friendly `44px`) atau `min-h-[2.375rem] px-3.5 py-2` (`38px` untuk tombol tabel desktop padat).

---

## 5. Tata Letak, Spasi, Elevasi & Permukaan

### 5.1 Skala Spasi & Grid

- **Container Maksimum:** `max-w-7xl mx-auto` (`80rem`) dengan gutter `px-4 sm:px-6 lg:px-8` (`1rem` / `1.5rem` / `2rem`).
- **Vertikal Rhythm:**
  - Jarak antar section utama: `space-y-5` atau `mt-5` / `mt-6` (`1.25rem`–`1.5rem`).
  - Padding kartu standar: `p-4 sm:p-5` (`1rem`–`1.25rem`); kartu form utama / dashboard banner: `p-5 sm:p-6`.
  - Jarak grid kartu KPI: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`.

### 5.2 Sistem Elevasi (Hairline Craft)

Alih-alih bayangan tebal generik, gunakan **permukaan bertingkat dengan border hairline**:
- **Level 0 (Canvas):** `bg-[#F5F7F8]`
- **Level 1 (Card / Table Container):** `bg-white border border-[#D8E2E6] rounded-2xl shadow-[0_1px_2px_rgba(15,41,51,0.04)]`
- **Level 2 (Elevated Sub-surface / Table Head / Summary Box):** `bg-[#F8FAFC] border border-[#D8E2E6] rounded-xl`
- **Level 3 (Sticky Header / Calculator):** `bg-white` solid (100% opaque, **bukan** `bg-white/95`!) + `border-b border-[#D8E2E6]` (`z-20`).
- **Level 4 (Native `<dialog>` Modal):** `bg-white border border-[#D8E2E6] rounded-2xl shadow-2xl backdrop:bg-[#0F2933]/55 backdrop:backdrop-blur-[2px]`.

### 5.3 Arsitektur Sidebar Penuh Tinggi Dokumen

Untuk menuntaskan sidebar terputus pada halaman panjang (`05`, `25`):
- Shell luar desktop: `lg:flex lg:min-h-screen`
- Kolom sidebar desktop: `<aside className="hidden lg:block lg:w-64 lg:shrink-0 bg-[#0F2933] border-r border-[#1A3B47]">`
- Pembungkus isi nav di dalam `<aside>`: `<div className="lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">`
- Kolom konten utama: `<div className="flex min-w-0 flex-1 flex-col">`
Dengan struktur ini, latar `#0F2933` selalu membentang dari `y = 0` hingga akhir dokumen, sementara menu navigasi tetap menempel saat pengguna menggulir ke bawah!

---

## 6. Standar Ikonografi (`lucide-react`)

Seluruh SVG inline manual di `AppLayout.tsx`, `Modal.tsx`, `EmptyState.tsx`, dan `Transaksi/Nota.tsx` wajib diganti dengan komponen dari `lucide-react` berukuran seragam (`className="h-4 w-4 shrink-0"` untuk tombol/inline, `className="h-[1.125rem] w-[1.125rem] shrink-0"` untuk navigasi sidebar, `aria-hidden="true"` pada ikon dekoratif):

| Konteks | Komponen `lucide-react` |
| --- | --- |
| Brand / Logo CleanWash | `Sparkles` atau monogram `CW` + `WashingMachine` / `Droplets` |
| Dashboard | `LayoutDashboard` |
| Penerimaan Baru | `PlusCircle` |
| Transaksi | `ReceiptText` |
| Antrean Produksi | `WashingMachine` (atau `Cog` / `Layers`) |
| Insiden & Kompensasi | `AlertTriangle` |
| Pelanggan | `Users` |
| Jenis Layanan | `Tag` / `Sparkles` |
| Voucher | `TicketPercent` |
| Pengantaran / Jadwal Pengantaran | `Truck` |
| Serah Terima | `PackageCheck` |
| Audit & Piutang | `FileSpreadsheet` / `ClipboardCheck` |
| Cari / Filter | `Search`, `SlidersHorizontal`, `RotateCcw` |
| Cetak Nota | `Printer` |
| Timbang Ulang | `Scale` |
| Ubah Layanan | `ArrowLeftRight` |
| Batal / Hapus / Gagal | `XCircle`, `Trash2`, `Ban` |
| Pembayaran / Pelunasan | `Wallet`, `CreditCard` |
| Menu Mobile / Tutup / Logout | `Menu`, `X`, `LogOut`, `ArrowLeft`, `ArrowRight`, `CheckCircle2`, `Clock` |

---

## 7. Komponen UI Inti & Aturan Kepadatan

### 7.1 Hierarki Tombol (Single Primary CTA per Section)

| Varian | Kelas Token | Kapan Dipakai |
| --- | --- | --- |
| **Primary CTA** | `bg-[#0F766E] text-white hover:bg-[#115E59] shadow-xs` | Maksimal **1 per section/header/modal**: `+ Penerimaan Nota Baru`, `Terbitkan Nota & Simpan`, `Lanjut ke ...`, `Simpan ...`, `Mulai Pengantaran`, `Tandai Diterima Pelanggan` |
| **Filter / Tool Submit** | `bg-[#0F2933] text-white hover:bg-[#163C4A]` | Tombol submit pada `FilterToolbar` (`Cari`, `Terapkan`, `Terapkan Filter`) & tombol `Cek Voucher` |
| **Success / Confirm Handover** | `bg-emerald-700 text-white hover:bg-emerald-800` | Konfirmasi positif serah terima atau konfirmasi potong saldo kompensasi (`#047857`, rasio `5.48:1`) |
| **Secondary Outline** | `border border-[#7C8C9D] bg-white text-[#0F172A] hover:bg-[#F8FAFC]` | `Batal`, `Reset`, `Kembali`, `Edit`, `Detail` |
| **Soft Brand Action** | `border border-teal-200 bg-[#F0FDFA] text-[#115E59] hover:bg-[#CCFBF1]` | `+ Tambah Item`, `Buka Sesi →`, `Buka Nota →`, `Isi Lunas Penuh` |
| **Warning / Cautious** | `border border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100` | `Timbang Ulang`, `Serah Terima (Wajib Lunas KK-06)`, `Beralih ke Pelunasan` |
| **Danger Solid / Outline** | Solid: `bg-[#BE123C] text-white hover:bg-rose-800`<br/>Outline: `border border-rose-300 bg-rose-50 text-[#9F1239] hover:bg-rose-100` | Solid untuk konfirmasi destruktif final di modal; Outline untuk pemicu `Laporkan Insiden`, `Batalkan Transaksi (KK-08)`, `Hapus`, `Tandai Gagal` |

### 7.2 `StatusBadge` & Aturan Batas 2–3 Badge (Anti-Badge-Fatigue)

Setiap `StatusBadge` wajib memenuhi:
1. **Non-color-only (WCAG 1.4.1):** Menampilkan **dot indikator `6px` (`h-1.5 w-1.5 rounded-full`)** atau ikon kecil di samping label teks jelas (bukan warna latar semata).
2. **Proporsi kalem:** `inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 min-h-[1.375rem] text-xs font-medium ring-1 ring-inset` (tanpa fixed `h-*`, tanpa uppercase teriak).
3. **Matriks Pemisahan Badge vs Metadata Teks (`MetadataRow`):**

| Atribut | Tampil Sebagai `StatusBadge` (Maks 2–3 per item) | Tampil Sebagai `MetadataRow` (Teks `•`-separated) |
| --- | --- | --- |
| **Pembayaran (`StatusPembayaran`)** | Ya (`Belum Bayar`, `DP`, `Belum Lunas`, `Lunas`) | — |
| **Status Transaksi (`StatusTransaksi`)** | Ya (di header detail/tabel bila bukan `AKTIF` yang sudah diwakili tahap, atau maks 1 chip) | — |
| **Tahap Produksi Terkini** | Ya (di daftar transaksi/detail); di kartu `Produksi` diwakili oleh *Pipeline Stepper* aktif! | Tahapan historis di `Layanan/Index` tampil sebagai *inline step trail* teks bersih, bukan 5 pill per baris! |
| **Status Item / Sesi Pengantaran** | Ya (`Menunggu`, `Diambil`, `Dalam Perjalanan`, `Diterima`, `Gagal`) | — |
| **Hak Bayar Akhir (`boleh_bayar_akhir`)** | **Hanya jika `true`**: chip `Boleh Bayar Akhir` (tone indigo) | **Jika `false`**: tampil sebagai teks `Wajib Lunas` (bukan pill badge!) |
| **Kecepatan (`tingkat_kecepatan`)** | **Hanya jika `EXPRESS`**: chip `Express` (tone indigo/teal) | **Jika `REGULER`**: tampil sebagai teks `Reguler` (mempertahankan substring `'Reguler'` untuk E2E `Layanan/Index`!) |
| **Metode, Satuan, & Setrika** | — | Teks terstruktur: `BERAT (kg) • Perlu Setrika` atau `JUMLAH (pcs) • Tanpa Setrika • 2.00 pcs` (mempertahankan string `'Tanpa Setrika'` untuk E2E `Produksi/Index`!) |

### 7.3 `StatTile` (KPI & Quick-Filter Card Terstandar)

- Menggantikan kartu KPI ad-hoc di `Dashboard`, `Produksi`, `Pengantaran`, `SerahTerima`.
- Struktur internal konsisten:
  - Baris atas: Label singkat (`text-xs font-medium text-[#5B697A]`) + ikon `lucide-react` di kotak soft surface `h-8 w-8 rounded-lg` di kanan atas (atau status aktif `✓ Aktif` bila varian filter).
  - Tengah: Nilai angka besar `text-2xl font-bold tabular-nums text-[#0F172A]`.
  - Bawah: Keterangan 1 baris (`text-xs text-[#5B697A]`) + tautan aksi ringkas opsional (`Lihat detail →`).
- Varian Interaktif Filter (`aria-pressed={active}`): Saat aktif, gunakan **ring/border `2px solid #0F766E` + latar `#F0FDFA` + ikon centang `Check`** (bukan hanya ganti warna border, sehingga memenuhi WCAG 1.4.1 & 1.4.11).

### 7.4 `FilterToolbar` (Toolbar Pencarian & Filter Seragam)

- Membungkus form dengan landmark HTML5 `<search>`.
- Input memiliki `<label>` eksplisit (boleh `sr-only` jika placeholder jelas, atau label atas konsisten di semua toolbar multi-filter).
- Input & `<select>` memakai `min-h-[2.625rem]` (`42px`–`44px`), `border-[#7C8C9D]`, `bg-white`, `rounded-xl`, `text-sm`.
- Tombol submit memakai **Deep Petrol Teal** (`bg-[#0F2933] text-white hover:bg-[#163C4A]`), tombol Reset memakai outline (`border-[#7C8C9D]`).

### 7.5 `DataTable` (Tabel Operasional Semantik & Responsif)

- Pembungkus scrollabel: `<div tabIndex={0} role="region" aria-labelledby={captionId} className="overflow-x-auto">`
- Wajib menyertakan `<caption id={captionId} className="sr-only">...</caption>`.
- Header: `bg-[#F8FAFC] border-b border-[#D8E2E6] text-[0.6875rem] font-semibold uppercase tracking-wider text-[#475569]`.
- Semua `<th>` di `<thead>` wajib `scope="col"`; kolom identitas primer baris di `<tbody>` memakai `<th scope="row" className="text-left font-normal">`.
- Kolom angka/uang/aksi rata kanan (`text-right tabular-nums`).

### 7.6 `Modal` (Native `<dialog>`)

- Mempertahankan `<dialog ref={dialogRef}>` + `showModal()` + `closedby` + `onCancel` + `aria-labelledby={titleId}`.
- **DILARANG** menambah `role="dialog"` atau `aria-modal="true"` pada `<dialog>` (sudah native).
- Header modal: judul `<h2>` (`text-base font-bold text-[#0F172A]`), subjudul `text-xs text-[#5B697A]`, tombol tutup `<X />` dengan `aria-label="Tutup dialog"` dan `min-h-[2.25rem] min-w-[2.25rem]`.
- Body: `px-5 py-4 sm:px-6 sm:py-5 overflow-y-auto`.
- Footer: `bg-[#F8FAFC] border-t border-[#D8E2E6] px-5 py-3.5 sm:px-6 flex flex-wrap justify-end gap-2.5`.

---

## 8. Checklist Aksesibilitas & Web Modern (Wajib Lulus Sebelum QA Sign-Off)

1. **Skip Link (`AppLayout.tsx`):** Tautan pertama di DOM: `<a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-[#0F2933] focus:px-4 focus:py-2.5 focus:text-xs focus:font-semibold focus:text-white focus:shadow-lg">Lewati ke konten utama</a>`. Targetnya adalah **`<h1 id="main-content" tabIndex={-1}>`** (judul halaman utama tunggal).
2. **Hierarki Heading Ketat:** Tepat 1 `<h1>` per halaman (`<h1 id="main-content" tabIndex={-1}>` pada `AppLayout`, `Nota`, & `Login`), diikuti `<h2>` untuk seksi utama & judul modal, `<h3>` untuk sub-seksi. Dilarang loncat level.
3. **Navigasi Aktif Non-Color-Only:** Item aktif di sidebar wajib memiliki `aria-current="page"`, latar `#163C4A`, teks `#FFFFFF`, **dan bar aksen kiri `w-1 rounded-full bg-[#14B8A6]` + ikon berwarna `#2DD4BF`**.
4. **Target Sentuh (`>= 44px`):** Semua tombol aksi utama di `Pengantaran/Show`, `Produksi/Index`, form `Login`, form `Transaksi/Create`, dan tombol menu mobile wajib memiliki `min-h-[2.75rem]` (`44px`).
5. **No Horizontal Overflow di `390×844px`:** Pastikan semua flex row memakai `min-w-0` dan `flex-wrap`, tabel dibungkus `overflow-x-auto`, dan grid responsif dimulai dari `grid-cols-1`.
6. **Print Safety (`/transaksi/{nota}/nota`):** Seluruh toolbar navigasi dibungkus `print:hidden`; aturan `@page { size: A4 portrait; margin: 12mm; }` dan `print-color-adjust: exact` di `resources/css/app.css` dipertahankan utuh.
