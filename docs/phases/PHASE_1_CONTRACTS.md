# Phase 1 Contracts & Acceptance Criteria — CleanWash

| Field | Value |
| --- | --- |
| **Task ID** | `P1-01` |
| **Phase** | Phase 1 — Fondasi Sistem, Master Data & Penerimaan Transaksi (DP & Voucher) |
| **SRS Scope** | `UC-01` (bagian DP), `UC-03`, `UC-04`, `UC-05`, `UC-06`, `UC-07`, `UC-08`, `UC-09`, `KK-03`, `KK-09`, *Activity 1*, *Sequence 1*, *Class Diagram* |
| **Target Stack** | Laravel 12 (PHP 8.4), MySQL 8.4 (isolated port `3307`), Inertia.js + React + TypeScript + Tailwind CSS |
| **Environment Guardrails** | Tanpa ketergantungan ekstensi PHP `bcmath` maupun `pdo_sqlite` |
| **Status** | Locked Baseline for `P1-02` s.d. `P1-07` |

---

## 1. Breakdown Work Package `P1-01` s.d. `P1-07` & Urutan Ketergantungan

### 1.1 Graf Ketergantungan
`P1-01 (PM)` $\rightarrow$ `P1-02 (FS)` $\rightarrow$ `P1-03 (BE)` $\rightarrow$ `P1-04 (BE)` $\rightarrow$ `P1-05 (BE)` $\rightarrow$ `P1-07 (FS + PM)`
*(Catatan: `P1-06 (FE)` dapat mulai paralel setelah `P1-02` + `P1-03` dengan mengacu kontrak TypeScript & route pada dokumen ini, lalu terintegrasi penuh dengan `P1-05` sebelum `P1-07`.)*

### 1.2 Langkah Atomik Per Work Package

1. **`P1-01` (`product-manager`) — Scoping & Contracts (`docs/p1-01-contracts`)**
   - Mengunci breakdown Phase 1, cetak biru skema penuh Phase 1–3, kontrak route/FormRequest/JSON/Inertia TypeScript, dan `AC-P1-01`..`AC-P1-12`.
2. **`P1-02` (`fullstack-developer`) — Scaffolding, MySQL 8.4 Port `3307` & CI (`feature/p1-02-scaffolding`)**
   - Inisialisasi Laravel 12 tanpa menghapus dokumen root/arsip (`PRD.md`, `AGENTS.md`, `CLAUDE.md`, `MEMORY.md`, `WRITE.md`, `docs/`, `napkin/`, `.agents/`, `.claude/`, `Archive/`).
   - Konfigurasi `docker-compose.yml`, `.env.example`, `.env`, dan `phpunit.xml` ke **MySQL 8.4 terisolasi port `3307`** (database runtime `cleanwash` + database test `cleanwash_testing`); **dilarang** memakai `sqlite`/`:memory:` karena `ext-pdo_sqlite` tidak tersedia.
   - Siapkan helper aritmatika desimal aman `App\Support\DecimalMoney` (berbasis integer skala 100 / sen) agar **bebas `ext-bcmath`** dan **bebas `float` drift**.
   - Pasang & verifikasi Inertia React + TypeScript strict (`tsconfig.json`), Tailwind CSS, Laravel Pint (`pint.json`), serta `.github/workflows/ci.yml` dengan service container `mysql:8.4`.
   - Verifikasi `./vendor/bin/pint --test`, `npx tsc --noEmit`, `php artisan test`, dan `npm run build` exit code `0`.
3. **`P1-03` (`backend-developer`) — Full Schema Phase 1–3, Seeder, Auth & RBAC (`feature/p1-03-schema-auth`)**
   - Migrasi penuh seluruh 16 tabel domain Phase 1–3 di MySQL 8.4 + tabel standar Laravel (`sessions`, `cache`, `jobs`), dengan `DECIMAL(12,2)` untuk seluruh nominal uang dan `down()` rollback bersih.
   - Uji `php artisan migrate && php artisan migrate:rollback && php artisan migrate` pada MySQL port `3307`.
   - Buat Eloquent Models dengan `$fillable`, `$casts`, PK non-auto-increment (`nomor_nota`, `nomor_voucher`), enum `UserRole` (`PETUGAS`, `PEGAWAI`, `PENGANTAR`), dan relasi.
   - Buat Seeder akun & profil aktor default (`Petugas`, `Pegawai`, `PetugasPengantaran`) + contoh `JenisLayanan` & `TahapLayanan`.
   - Implementasi Auth (`GET /login`, `POST /login`, `POST /logout`, `GET /dashboard`), middleware `role:...`, `HandleInertiaRequests` (`auth.user`, `flash`), dan feature tests Auth + RBAC `403`.
4. **`P1-04` (`backend-developer`) — Master CRUD & Endpoint Validasi Voucher (`feature/p1-04-master-crud`)**
   - `PelangganController` + `PelangganService` + `PelangganPolicy` (CRUD + pencarian + toggle `boleh_bayar_akhir`).
   - `JenisLayananController` + `JenisLayananService` (CRUD `JenisLayanan` + sinkronisasi otomatis/validasi `TahapLayanan` sesuai `perlu_setrika` & pasangan `metode_hitung`/`satuan`).
   - `VoucherController` + `VoucherService::cekValiditasPreview()` untuk CRUD Voucher dan endpoint JSON `POST /voucher/validate`.
   - Unit & feature tests (happy path, invalid payload `422`, RBAC `403` untuk `PEGAWAI` & `PENGANTAR`).
5. **`P1-05` (`backend-developer`) — Reception, Snapshot & Atomic Voucher Engine (`feature/p1-05-reception-engine`)**
   - `VoucherService::validasiDanKunci()` di dalam `DB::transaction()` menggunakan `SELECT ... FOR UPDATE` (`lockForUpdate()`) untuk `KK-03`.
   - `TransaksiService::buatTransaksi()` dalam `DB::transaction()`: nomor nota unik (`CW-YYYYMMDD-XXXX`), salin `harga_satuan_snapshot` (`KK-09`), simpan `DetailPakaian` (`1..*`), hitung `subtotal` & `total_harga` dengan `DecimalMoney`, catat initial `RiwayatStatusProduksi = DITERIMA`, catat DP `Pembayaran` (`PembayaranService`), dan tulis `audit_logs`.
   - `TransaksiController` (`index`, `create`, `store`, `show`, `nota`) + FormRequest validation.
   - Automated tests: `BERAT` vs `JUMLAH`, `KK-09` (ubah harga master tidak mengubah nota lama), `KK-03` (kedaluwarsa, sudah dipakai, simulasi klaim bersamaan), DP (`BELUM_BAYAR`, `DP`, `LUNAS`, overpay `422`), `DetailPakaian` minimal 1.
6. **`P1-06` (`frontend-developer`) — Login, App Shell, Master CRUD & Form Kasir (`feature/p1-06-frontend-ui`)**
   - Definisi tipe TypeScript di `resources/js/types/` sinkron 100% dengan kontrak §3.
   - `AppLayout` berbasis peran (`PETUGAS`, `PEGAWAI`, `PENGANTAR`), `Auth/Login`, dan landing `/dashboard`.
   - Halaman Master CRUD: `Pelanggan/Index`, `Layanan/Index`, `Voucher/Index`.
   - Halaman Transaksi: `Transaksi/Index`, `Transaksi/Create` (form dinamis `kg` vs `pcs`, baris dinamis `DetailPakaian` `min 1`, cek voucher live `POST /voucher/validate`, input DP, estimasi preview), dan `Transaksi/Show`.
   - Lulus `npx tsc --noEmit` dan `npm run build`.
7. **`P1-07` (`fullstack-developer` + `product-manager`) — Halaman Cetak Nota & Phase 1 Gate (`feature/p1-07-nota-gate`)**
   - Halaman cetak `Transaksi/Nota` (`GET /transaksi/{nota}/nota`, layout `@media print`).
   - E2E feature test alur penuh Penerimaan $\rightarrow$ Voucher $\rightarrow$ DP $\rightarrow$ Cetak Nota $\rightarrow$ Verifikasi Imutabilitas Snapshot setelah ubah tarif master.
   - Cross-agent review 6 Gerbang Kualitas (`napkin/PR_REVIEW_LIFECYCLE.md`) + verifikasi `AC-P1-01`..`AC-P1-12` + sign-off `MEMORY.md` & `WRITE.md`.

---

## 2. Kontrak Skema Tabel MySQL 8.4 (Migrasi Penuh Phase 1–3 di `P1-03`)

**Aturan Teknis Global Migrasi:**
- Engine: `InnoDB`, charset `utf8mb4`, collation `utf8mb4_unicode_ci`.
- Seluruh nominal uang wajib `decimal(..., 12, 2)`; kuantitas/berat `decimal(..., 8, 2)`.
- Wajib ada `down()` yang men-drop tabel pada urutan terbalik FK agar `php artisan migrate:rollback` lulus bersih.
- Hindari ketergantungan `ext-bcmath` dan `ext-pdo_sqlite`; seluruh aritmatika uang di PHP memakai integer skala 100 (`App\Support\DecimalMoney`).

### Urutan Migrasi & Spesifikasi Kolom Inti

1. **`users`** (+ tabel standar Laravel `password_reset_tokens`, `sessions`, `cache`, `jobs`)
   - `id` (`BIGINT UNSIGNED` AI PK), `name` (`VARCHAR(120)`), `email` (`VARCHAR(150)` UNIQUE), `password` (`VARCHAR(255)`), `role` (`VARCHAR(20)` INDEX: `PETUGAS` | `PEGAWAI` | `PENGANTAR`), `is_active` (`BOOLEAN` default `true`), `remember_token`, `timestamps`.
2. **`petugas`**
   - `id_petugas` (`BIGINT UNSIGNED` AI PK), `user_id` (`BIGINT UNSIGNED` UNIQUE FK $\rightarrow$ `users.id` `restrictOnDelete`), `nama_petugas` (`VARCHAR(120)`), `timestamps`.
3. **`pegawai`**
   - `id_pegawai` (`BIGINT UNSIGNED` AI PK), `user_id` (`BIGINT UNSIGNED` UNIQUE FK $\rightarrow$ `users.id` `restrictOnDelete`), `nama_pegawai` (`VARCHAR(120)`), `timestamps`.
4. **`petugas_pengantaran`**
   - `id_petugas_antar` (`BIGINT UNSIGNED` AI PK), `user_id` (`BIGINT UNSIGNED` UNIQUE FK $\rightarrow$ `users.id` `restrictOnDelete`), `nama_petugas_antar` (`VARCHAR(120)`), `timestamps`.
5. **`pelanggan`**
   - `id_pelanggan` (`BIGINT UNSIGNED` AI PK), `nama` (`VARCHAR(120)`), `no_telepon` (`VARCHAR(25)` UNIQUE), `alamat` (`TEXT`), `boleh_bayar_akhir` (`BOOLEAN` default `false`), `timestamps`.
6. **`jenis_layanan`**
   - `id_layanan` (`BIGINT UNSIGNED` AI PK), `nama_layanan` (`VARCHAR(100)`), `tingkat_kecepatan` (`VARCHAR(20)`: `REGULER` | `EXPRESS`), `metode_hitung` (`VARCHAR(20)`: `BERAT` | `JUMLAH`), `satuan` (`VARCHAR(10)`: `kg` | `pcs`), `harga_satuan` (`DECIMAL(12,2)`), `perlu_setrika` (`BOOLEAN` default `true`), `is_active` (`BOOLEAN` default `true`), `timestamps`.
   - `UNIQUE(nama_layanan, tingkat_kecepatan)`.
7. **`tahap_layanan`**
   - `id_tahap` (`BIGINT UNSIGNED` AI PK), `id_layanan` (`BIGINT UNSIGNED` FK $\rightarrow$ `jenis_layanan.id_layanan` `cascadeOnDelete`), `nama_tahap` (`VARCHAR(50)`: `DITERIMA` | `DICUCI` | `DIKERINGKAN` | `DISETRIKA` | `SELESAI`), `urutan` (`TINYINT UNSIGNED`), `timestamps`.
   - `UNIQUE(id_layanan, urutan)` dan `UNIQUE(id_layanan, nama_tahap)`.
8. **`voucher`**
   - `nomor_voucher` (`VARCHAR(50)` PK), `nilai` (`DECIMAL(12,2)`), `masa_berlaku` (`DATE`), `status_penggunaan` (`VARCHAR(25)` default `'TERSEDIA'`: `TERSEDIA` | `SUDAH_DIGUNAKAN` | `KEDALUWARSA`), `digunakan_pada` (`TIMESTAMP` nullable), `timestamps`.
   - `INDEX(status_penggunaan, masa_berlaku)`.
9. **`transaksi`**
   - `nomor_nota` (`VARCHAR(30)` PK, format `CW-YYYYMMDD-XXXX`), `id_pelanggan` (`BIGINT UNSIGNED` FK $\rightarrow$ `pelanggan.id_pelanggan` `restrictOnDelete`), `id_petugas` (`BIGINT UNSIGNED` FK $\rightarrow$ `petugas.id_petugas` `restrictOnDelete`), `id_layanan` (`BIGINT UNSIGNED` FK $\rightarrow$ `jenis_layanan.id_layanan` `restrictOnDelete`), `nomor_voucher` (`VARCHAR(50)` nullable `UNIQUE` FK $\rightarrow$ `voucher.nomor_voucher` `restrictOnDelete`), `tanggal_penerimaan` (`DATETIME`), `berat_atau_jumlah` (`DECIMAL(8,2)`), `catatan_khusus` (`TEXT` nullable), `harga_satuan_snapshot` (`DECIMAL(12,2)`), `nilai_voucher_snapshot` (`DECIMAL(12,2)` default `0.00`), `total_kompensasi` (`DECIMAL(12,2)` default `0.00`), `biaya_pembatalan` (`DECIMAL(12,2)` default `0.00`), `total_harga` (`DECIMAL(12,2)`), `status_pembayaran` (`VARCHAR(20)` default `'BELUM_BAYAR'`: `BELUM_BAYAR` | `DP` | `LUNAS` | `BELUM_LUNAS`), `status_transaksi` (`VARCHAR(20)` default `'AKTIF'`: `AKTIF` | `SELESAI` | `DIAMBIL` | `DIBATALKAN`), `diambil_pada` (`TIMESTAMP` nullable), `timestamps`.
   - `INDEX(tanggal_penerimaan)`, `INDEX(status_pembayaran)`, `INDEX(status_transaksi)`.
10. **`detail_pakaian`**
    - `id_detail` (`BIGINT UNSIGNED` AI PK), `nomor_nota` (`VARCHAR(30)` FK $\rightarrow$ `transaksi.nomor_nota` `cascadeOnDelete`), `jenis_pakaian` (`VARCHAR(100)`), `jumlah_potong` (`INT UNSIGNED`), `kondisi_pakaian` (`VARCHAR(255)`), `timestamps`.
11. **`pembayaran`**
    - `id_pembayaran` (`BIGINT UNSIGNED` AI PK), `nomor_nota` (`VARCHAR(30)` FK $\rightarrow$ `transaksi.nomor_nota` `restrictOnDelete`), `id_petugas` (`BIGINT UNSIGNED` FK $\rightarrow$ `petugas.id_petugas` `restrictOnDelete`), `tanggal_bayar` (`DATETIME`), `jenis_bayar` (`VARCHAR(20)`: `DP` | `PELUNASAN`), `nominal_bayar` (`DECIMAL(12,2)`), `timestamps`.
12. **`riwayat_status_produksi`**
    - `id_status_produksi` (`BIGINT UNSIGNED` AI PK), `nomor_nota` (`VARCHAR(30)` FK $\rightarrow$ `transaksi.nomor_nota` `cascadeOnDelete`), `id_pegawai` (`BIGINT UNSIGNED` nullable FK $\rightarrow$ `pegawai.id_pegawai` `restrictOnDelete` — nullable khusus entri awal `DITERIMA` saat penerimaan nota di kasir), `tahap_status` (`VARCHAR(50)`), `waktu_update` (`DATETIME`), `catatan` (`TEXT` nullable), `timestamps`.
    - `INDEX(nomor_nota, waktu_update)`.
13. **`laporan_kerusakan_kehilangan`** *(Phase 2)*
    - `id_laporan` (`BIGINT UNSIGNED` AI PK), `nomor_nota` (`VARCHAR(30)` FK $\rightarrow$ `transaksi.nomor_nota` `restrictOnDelete`), `id_detail` (`BIGINT UNSIGNED` FK $\rightarrow$ `detail_pakaian.id_detail` `restrictOnDelete`), `id_petugas` (`BIGINT UNSIGNED` nullable FK $\rightarrow$ `petugas.id_petugas` `restrictOnDelete`), `id_pegawai_pelapor` (`BIGINT UNSIGNED` nullable FK $\rightarrow$ `pegawai.id_pegawai` `restrictOnDelete`), `jenis_insiden` (`VARCHAR(20)`: `RUSAK` | `HILANG`), `keterangan` (`TEXT`), `nilai_kompensasi` (`DECIMAL(12,2)` default `0.00`), `kelebihan_ganti_rugi` (`DECIMAL(12,2)` default `0.00`), `timestamps`.
14. **`pengantaran`** *(Phase 3)*
    - `id_pengantaran` (`BIGINT UNSIGNED` AI PK), `id_petugas_antar` (`BIGINT UNSIGNED` FK $\rightarrow$ `petugas_pengantaran.id_petugas_antar` `restrictOnDelete`), `tanggal_pengantaran` (`DATE`), `status_pengantaran` (`VARCHAR(20)` default `'DIJADWALKAN'`: `DIJADWALKAN` | `BERJALAN` | `SELESAI`), `timestamps`.
15. **`item_pengantaran`** *(Phase 3)*
    - `id_item_antar` (`BIGINT UNSIGNED` AI PK), `id_pengantaran` (`BIGINT UNSIGNED` FK $\rightarrow$ `pengantaran.id_pengantaran` `cascadeOnDelete`), `nomor_nota` (`VARCHAR(30)` FK $\rightarrow$ `transaksi.nomor_nota` `restrictOnDelete`), `status_terima_pelanggan` (`VARCHAR(25)` default `'MENUNGGU'`: `MENUNGGU` | `DIAMBIL` | `DALAM_PERJALANAN` | `DITERIMA` | `GAGAL`), `alasan_gagal` (`TEXT` nullable), `waktu_update` (`DATETIME` nullable), `timestamps`.
    - `INDEX(id_pengantaran, status_terima_pelanggan)`, `INDEX(nomor_nota)`.
16. **`audit_logs`**
    - `id` (`BIGINT UNSIGNED` AI PK), `user_id` (`BIGINT UNSIGNED` nullable FK $\rightarrow$ `users.id` `nullOnDelete`), `actor_role` (`VARCHAR(20)`), `action` (`VARCHAR(60)`), `subject_type` (`VARCHAR(100)`), `subject_id` (`VARCHAR(60)`), `payload_before` (`JSON` nullable), `payload_after` (`JSON` nullable), `created_at` (`TIMESTAMP`).

---

## 3. Kontrak Route, FormRequest & Tipe TypeScript / Inertia Props

### 3.1 Auth & Shared Inertia Props
- **Routes:**
  - `GET /` $\rightarrow$ redirect `/dashboard` (auth) atau `/login` (guest)
  - `GET /login` (`guest`) $\rightarrow$ Inertia `Auth/Login`
  - `POST /login` (`guest`) $\rightarrow$ `LoginRequest`: `email` (`required|email`), `password` (`required|string`), `remember` (`nullable|boolean`). Akun dengan `is_active = false` wajib ditolak (`422` pada `email`).
  - `POST /logout` (`auth`) $\rightarrow$ invalidate session & redirect `/login`.
  - `GET /dashboard` (`auth`) $\rightarrow$ Inertia `Dashboard/Index` (ringkasan Phase 1 sesuai peran).
- **Shared Props (`HandleInertiaRequests`):**
```ts
export type UserRole = 'PETUGAS' | 'PEGAWAI' | 'PENGANTAR';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  actor_id: number | null;
}

export interface FlashMessages {
  success?: string | null;
  error?: string | null;
  warning?: string | null;
}

export interface SharedPageProps {
  auth: {
    user: AuthUser | null;
  };
  flash: FlashMessages;
  errors: Record<string, string>;
}
```

### 3.2 Master `Pelanggan` (Middleware: `auth`, `role:PETUGAS`)
- **Routes:** `GET /pelanggan` (`Pelanggan/Index`), `POST /pelanggan`, `PUT/PATCH /pelanggan/{pelanggan}`, `DELETE /pelanggan/{pelanggan}` (tolak `422` jika sudah memiliki `transaksi`).
- **Validation (`StorePelangganRequest` / `UpdatePelangganRequest`):**
  - `nama`: `['required', 'string', 'max:120']`
  - `no_telepon`: `['required', 'string', 'max:25', Rule::unique('pelanggan', 'no_telepon')->ignore($id, 'id_pelanggan')]`
  - `alamat`: `['required', 'string', 'max:1000']`
  - `boleh_bayar_akhir`: `['required', 'boolean']`
- **TypeScript Props:**
```ts
export interface PelangganItem {
  id_pelanggan: number;
  nama: string;
  no_telepon: string;
  alamat: string;
  boleh_bayar_akhir: boolean;
  transaksi_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  links: Array<{ url: string | null; label: string; active: boolean }>;
}

export interface PelangganIndexProps extends SharedPageProps {
  pelanggan: Paginated<PelangganItem>;
  filters: { search: string };
}
```

### 3.3 Master `JenisLayanan` + `TahapLayanan` (Middleware: `auth`, `role:PETUGAS`)
- **Routes:** `GET /layanan` (`Layanan/Index`), `POST /layanan`, `PUT/PATCH /layanan/{layanan}`, `DELETE /layanan/{layanan}` (tolak `422` jika sudah dipakai di `transaksi`).
- **Validation (`StoreJenisLayananRequest` / `UpdateJenisLayananRequest`):**
  - `nama_layanan`: `['required', 'string', 'max:100']` (unik kombinasi bersama `tingkat_kecepatan`)
  - `tingkat_kecepatan`: `['required', Rule::in(['REGULER', 'EXPRESS'])]`
  - `metode_hitung`: `['required', Rule::in(['BERAT', 'JUMLAH'])]`
  - `satuan`: `['required', Rule::in(['kg', 'pcs'])]` + rule wajib: `BERAT` $\leftrightarrow$ `kg`, `JUMLAH` $\leftrightarrow$ `pcs`
  - `harga_satuan`: `['required', 'numeric', 'gt:0', 'max:999999999.99', 'decimal:0,2']`
  - `perlu_setrika`: `['required', 'boolean']`
  - `is_active`: `['sometimes', 'boolean']`
  - `tahap_layanan`: `['nullable', 'array', 'min:2']` (jika null, backend membentuk urutan kanonik otomatis: `perlu_setrika=true` $\rightarrow$ `[DITERIMA, DICUCI, DIKERINGKAN, DISETRIKA, SELESAI]`; `perlu_setrika=false` $\rightarrow$ `[DITERIMA, DICUCI, DIKERINGKAN, SELESAI]`. Jika dikirim manual, wajib berawal `DITERIMA`, berakhir `SELESAI`, dan **dilarang** mengandung `DISETRIKA` bila `perlu_setrika=false`).
- **TypeScript Props:** *(Semua nominal `DECIMAL(12,2)` diserialisasi sebagai `string` fixed 2 desimal, mis. `"12000.00"`)*
```ts
export type TingkatKecepatan = 'REGULER' | 'EXPRESS';
export type MetodeHitung = 'BERAT' | 'JUMLAH';
export type SatuanLayanan = 'kg' | 'pcs';
export type TahapProduksiCode = 'DITERIMA' | 'DICUCI' | 'DIKERINGKAN' | 'DISETRIKA' | 'SELESAI';

export interface TahapLayananItem {
  id_tahap: number;
  id_layanan: number;
  nama_tahap: TahapProduksiCode;
  urutan: number;
}

export interface JenisLayananItem {
  id_layanan: number;
  nama_layanan: string;
  tingkat_kecepatan: TingkatKecepatan;
  metode_hitung: MetodeHitung;
  satuan: SatuanLayanan;
  harga_satuan: string;
  perlu_setrika: boolean;
  is_active: boolean;
  tahap_layanan: TahapLayananItem[];
}

export interface LayananIndexProps extends SharedPageProps {
  layanan: Paginated<JenisLayananItem>;
  filters: { search: string };
}
```

### 3.4 Master `Voucher` & `POST /voucher/validate` (Middleware: `auth`, `role:PETUGAS`)
- **Routes:** `GET /voucher` (`Voucher/Index`), `POST /voucher`, `PUT/PATCH /voucher/{voucher}`, `DELETE /voucher/{voucher}` (tolak `422` jika dipakai transaksi), `POST /voucher/validate` (JSON).
- **Validation:**
  - `StoreVoucherRequest`: `nomor_voucher` (`required|string|max:50|alpha_dash|unique:voucher,nomor_voucher`, dinormalisasi uppercase), `nilai` (`required|numeric|gt:0|max:999999999.99|decimal:0,2`), `masa_berlaku` (`required|date|after_or_equal:today`).
  - `UpdateVoucherRequest`: `nilai` (`required|numeric|gt:0|decimal:0,2`), `masa_berlaku` (`required|date`), `status_penggunaan` (`sometimes|in:TERSEDIA,KEDALUWARSA`); tolak modifikasi bila status saat ini `SUDAH_DIGUNAKAN`.
  - `ValidateVoucherRequest` (`POST /voucher/validate`): `nomor_voucher` (`required|string|max:50`), `tanggal_transaksi` (`nullable|date`, default tanggal hari ini zona `Asia/Jakarta`).
- **Kontrak JSON `POST /voucher/validate`:**
  - **200 OK (Valid):**
    `{ "valid": true, "nomor_voucher": "HEMAT10K", "nilai": "10000.00", "masa_berlaku": "2026-12-31", "status_penggunaan": "TERSEDIA", "message": "Voucher valid dan siap digunakan." }`
  - **422 Unprocessable Entity (Invalid — `NOT_FOUND` | `EXPIRED` | `ALREADY_USED`):**
    `{ "valid": false, "reason": "EXPIRED", "message": "...", "errors": { "nomor_voucher": ["..."] } }`
- **TypeScript Props:**
```ts
export type VoucherStatus = 'TERSEDIA' | 'SUDAH_DIGUNAKAN' | 'KEDALUWARSA';

export interface VoucherItem {
  nomor_voucher: string;
  nilai: string;
  masa_berlaku: string;
  status_penggunaan: VoucherStatus;
  effective_status: VoucherStatus;
  digunakan_pada: string | null;
}

export interface VoucherValidateResponse {
  valid: boolean;
  nomor_voucher?: string;
  nilai?: string;
  masa_berlaku?: string;
  status_penggunaan?: VoucherStatus;
  reason?: 'NOT_FOUND' | 'EXPIRED' | 'ALREADY_USED';
  message: string;
}

export interface VoucherIndexProps extends SharedPageProps {
  voucher: Paginated<VoucherItem>;
  filters: { search: string; status?: VoucherStatus | '' };
}
```

### 3.5 Penerimaan `Transaksi` + `DetailPakaian` + DP + Cetak Nota (Middleware: `auth`, `role:PETUGAS`)
- **Routes:** `GET /transaksi` (`Transaksi/Index`), `GET /transaksi/create` (`Transaksi/Create`), `POST /transaksi`, `GET /transaksi/{nota}` (`Transaksi/Show`), `GET /transaksi/{nota}/nota` (`Transaksi/Nota`).
- **Validation (`StoreTransaksiRequest`):**
  - `id_pelanggan`: `['required', 'integer', 'exists:pelanggan,id_pelanggan']`
  - `id_layanan`: `['required', 'integer', 'exists:jenis_layanan,id_layanan']` (+ layanan wajib `is_active === true`)
  - `berat_atau_jumlah`: `['required', 'numeric', 'gt:0', 'max:99999.99', 'decimal:0,2']` (+ wajib bilangan bulat `>= 1` bila `metode_hitung === 'JUMLAH'`)
  - `nomor_voucher`: `['nullable', 'string', 'max:50']` (validasi & lock atomik di `VoucherService` dalam `DB::transaction()`)
  - `nominal_dp`: `['nullable', 'numeric', 'gte:0', 'decimal:0,2']` (service menolak `422` bila `nominal_dp > total_harga`)
  - `catatan_khusus`: `['nullable', 'string', 'max:1000']`
  - `detail_pakaian`: `['required', 'array', 'min:1']`
  - `detail_pakaian.*.jenis_pakaian`: `['required', 'string', 'max:100']`
  - `detail_pakaian.*.jumlah_potong`: `['required', 'integer', 'min:1', 'max:10000']`
  - `detail_pakaian.*.kondisi_pakaian`: `['required', 'string', 'max:255']`
- **Aturan Status Pembayaran saat Penerimaan (`TransaksiService`):**
  - `subtotal_layanan = berat_atau_jumlah * harga_satuan_snapshot`
  - `total_harga = max(0, subtotal_layanan - nilai_voucher_snapshot)`
  - `nominal_dp == 0 && total_harga > 0` $\rightarrow$ `status_pembayaran = 'BELUM_BAYAR'`, tanpa baris `pembayaran`.
  - `0 < nominal_dp < total_harga` $\rightarrow$ `status_pembayaran = 'DP'`, insert `pembayaran` (`jenis_bayar = 'DP'`).
  - `nominal_dp == total_harga` (atau `total_harga == 0`) $\rightarrow$ `status_pembayaran = 'LUNAS'`; jika `nominal_dp > 0` insert `pembayaran` (`jenis_bayar = 'PELUNASAN'`).
- **TypeScript Props:**
```ts
export type StatusPembayaran = 'BELUM_BAYAR' | 'DP' | 'LUNAS' | 'BELUM_LUNAS';
export type StatusTransaksi = 'AKTIF' | 'SELESAI' | 'DIAMBIL' | 'DIBATALKAN';
export type JenisBayar = 'DP' | 'PELUNASAN';

export interface DetailPakaianItem {
  id_detail: number;
  nomor_nota: string;
  jenis_pakaian: string;
  jumlah_potong: number;
  kondisi_pakaian: string;
}

export interface PembayaranItem {
  id_pembayaran: number;
  nomor_nota: string;
  id_petugas: number;
  tanggal_bayar: string;
  jenis_bayar: JenisBayar;
  nominal_bayar: string;
  petugas?: { id_petugas: number; nama_petugas: string };
}

export interface RiwayatStatusProduksiItem {
  id_status_produksi: number;
  nomor_nota: string;
  id_pegawai: number | null;
  tahap_status: TahapProduksiCode;
  waktu_update: string;
  catatan: string | null;
}

export interface TransaksiDetail {
  nomor_nota: string;
  tanggal_penerimaan: string;
  berat_atau_jumlah: string;
  catatan_khusus: string | null;
  harga_satuan_snapshot: string;
  nilai_voucher_snapshot: string;
  total_kompensasi: string;
  biaya_pembatalan: string;
  subtotal_layanan: string;
  total_harga: string;
  total_dibayar: string;
  sisa_tagihan: string;
  status_pembayaran: StatusPembayaran;
  status_transaksi: StatusTransaksi;
  diambil_pada: string | null;
  pelanggan: PelangganItem;
  petugas: { id_petugas: number; nama_petugas: string };
  layanan: JenisLayananItem;
  voucher: VoucherItem | null;
  detail_pakaian: DetailPakaianItem[];
  pembayaran: PembayaranItem[];
  riwayat_status_produksi: RiwayatStatusProduksiItem[];
}

export interface TransaksiCreateProps extends SharedPageProps {
  pelangganOptions: Array<Pick<PelangganItem, 'id_pelanggan' | 'nama' | 'no_telepon' | 'boleh_bayar_akhir'>>;
  layananOptions: JenisLayananItem[];
}

export interface TransaksiIndexProps extends SharedPageProps {
  transaksi: Paginated<TransaksiDetail>;
  filters: { search: string; status_pembayaran?: StatusPembayaran | '' };
}

export interface TransaksiShowProps extends SharedPageProps {
  transaksi: TransaksiDetail;
}

export interface TransaksiNotaProps extends SharedPageProps {
  transaksi: TransaksiDetail;
}
```

---

## 4. Acceptance Criteria Phase 1 (`AC-P1-01` s.d. `AC-P1-12`)

| ID | Referensi SRS / Task | Kriteria Penerimaan Terukur (Happy, Boundary/KK, Unhappy) |
| --- | --- | --- |
| **`AC-P1-01`** | `P1-02`, NFR Lingkungan | Aplikasi Laravel 12 + Inertia React TS berjalan tanpa ekstensi PHP `pdo_sqlite` maupun `bcmath`, terhubung ke MySQL 8.4 terisolasi port `3307`; `./vendor/bin/pint --test`, `npx tsc --noEmit`, `php artisan test`, dan `npm run build` lulus exit code `0`. |
| **`AC-P1-02`** | `P1-03`, Model Data §10 | Seluruh 16 tabel Phase 1–3 bermigrasi dan `migrate:rollback` bersih di MySQL 8.4 port `3307`; seluruh kolom nominal uang bertipe `DECIMAL(12,2)`. |
| **`AC-P1-03`** | `P1-03`, `P1-06`, RBAC | Login mengisi `auth.user` (`PETUGAS` \| `PEGAWAI` \| `PENGANTAR`); akun `is_active=false` ditolak; `PEGAWAI` dan `PENGANTAR` ditolak HTTP `403` saat mengakses route `/pelanggan`, `/layanan`, `/voucher`, `/transaksi`. |
| **`AC-P1-04`** | `UC-04`, `FR-01` | `Petugas` dapat CRUD `Pelanggan` beserta flag `boleh_bayar_akhir`; `no_telepon` duplikat ditolak `422`; pelanggan yang memiliki transaksi ditolak penghapusannya. |
| **`AC-P1-05`** | `UC-05`, `UC-08`, `FR-03` | `Petugas` dapat CRUD `JenisLayanan` (`REGULER`/`EXPRESS`, `BERAT`/`JUMLAH`, `kg`/`pcs`, `harga_satuan`, `perlu_setrika`); `BERAT` wajib `kg`, `JUMLAH` wajib `pcs`; `TahapLayanan` untuk layanan `perlu_setrika=false` terbukti tidak memuat tahap `DISETRIKA`. |
| **`AC-P1-06`** | `UC-03`, `FR-04` | `Petugas` dapat CRUD `Voucher` (`nomor_voucher` unik, `nilai > 0`, `masa_berlaku >= today` saat buat baru); voucher berstatus `SUDAH_DIGUNAKAN` tidak dapat dihapus atau dikembalikan ke `TERSEDIA` lewat CRUD. |
| **`AC-P1-07`** | `UC-06`, `UC-07`, `UC-08`, `FR-02` | `POST /transaksi` menghasilkan `nomor_nota` unik (`CW-YYYYMMDD-XXXX`), minimal 1 `DetailPakaian` (`detail_pakaian` kosong ditolak `422`), validasi bilangan bulat untuk `JUMLAH`, kalkulasi backend integer-scaled decimal akurat, entri awal `RiwayatStatusProduksi = DITERIMA`, dan `audit_logs`. |
| **`AC-P1-08`** | **`KK-09`**, `UC-08` | `Transaksi.harga_satuan_snapshot` disalin saat transaksi dibuat; pengujian otomatis membuktikan pengubahan `JenisLayanan.harga_satuan` sesudahnya tidak mengubah `harga_satuan_snapshot`, `total_harga`, maupun `sisa_tagihan` nota lama. |
| **`AC-P1-09`** | **`KK-03`**, `UC-09` | `POST /voucher/validate` dan `POST /transaksi` menolak (`422`) voucher tidak dikenal (`NOT_FOUND`), melewati `masa_berlaku` (`EXPIRED`), atau sudah dipakai (`ALREADY_USED`) dengan pesan eksplisit. |
| **`AC-P1-10`** | **`KK-03`**, `UC-09` | Klaim voucher pada `POST /transaksi` dijalankan dalam `DB::transaction()` + `lockForUpdate()` (`SELECT ... FOR UPDATE`), mengubah status menjadi `SUDAH_DIGUNAKAN` dan menyimpan `nilai_voucher_snapshot`; simulasi klaim ganda/konkuren pada kode sama hanya meloloskan tepat 1 transaksi. |
| **`AC-P1-11`** | `UC-01` (DP), `FR-05` | `nominal_dp = 0` (`total_harga > 0`) $\rightarrow$ `BELUM_BAYAR`; `0 < nominal_dp < total_harga` $\rightarrow$ `DP` + record `Pembayaran(DP)`; `nominal_dp == total_harga` atau `total_harga == 0` $\rightarrow$ `LUNAS`; `nominal_dp > total_harga` ditolak `422`. |
| **`AC-P1-12`** | `UC-06`, `UC-01`, Activity/Seq 1 | Halaman `GET /transaksi/{nota}/nota` menampilkan seluruh rincian nota siap cetak (`@media print`) termasuk `DetailPakaian`, `harga_satuan_snapshot`, voucher, `DP`, `sisa_tagihan`, dan `status_pembayaran` sinkron dengan MySQL 8.4. |
