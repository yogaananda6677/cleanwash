# Napkin Runbook: CleanWash

Runbook terkurasi untuk memori jangka panjang agent AI lintas sesi pada proyek **CleanWash (Laravel 12 + MySQL 8.4 + Inertia React TS)**.
Dilarang mencatat log kronologis harian di file ini — **catat log aktivitas di `WRITE.md`**, dan rawat file ini hanya untuk aturan operasional berulang beserta tindakan nyata (`Do instead:`).

## Curation Rules
- Re-prioritize on every read (item paling kritis di urutan teratas).
- Keep recurring, high-value notes only.
- Max 10 items per category.
- Every item must include `[YYYY-MM-DD]` + `Do instead:`.

---

## 1. Execution, Testing & Context Continuity (Highest Priority)
1. **[2026-11-10] Agent kehilangan konteks antar sesi atau antar delegasi subagent**
   Do instead: Wajib membaca `MEMORY.md`, 3 entri terakhir `WRITE.md`, dan `.claude/napkin.md` sebelum memulai kerja; lalu **WAJIB menulis entri baru di `WRITE.md`** setiap selesai aktivitas sebelum mengakhiri giliran atau melakukan handoff.
2. **[2026-11-10] Klaim "selesai" tanpa verifikasi eksekusi lokal**
   Do instead: Jalankan seluruh quality gate (`./vendor/bin/pint --test`, `npx tsc --noEmit`, `php artisan test`, `npm run build`) dan pastikan exit code 0 sebelum menandai task selesai atau membuka review.
3. **[2026-11-10] Migrasi database gagal saat di-rollback atau bentrok foreign key di MySQL 8.4**
   Do instead: Uji setiap migrasi baru dengan `php artisan migrate && php artisan migrate:rollback && php artisan migrate` secara berurutan pada database testing MySQL 8.4 sebelum commit.
4. **[2026-11-10] PHP 8.4 lokal tidak memiliki ekstensi `pdo_sqlite` sehingga PHPUnit default SQLite `:memory:` gagal**
   Do instead: Selalu konfigurasi `phpunit.xml` dan `.env.testing` memakai MySQL 8.4 terisolasi pada port `3307` (port `3306` dipakai container proyek lain), bukan SQLite `:memory:`.

---

## 2. Shell & Command Reliability
1. **[2026-11-10] Command CLI/Artisan/Composer menggantung menunggu prompt interaktif**
   Do instead: Selalu tambahkan flag non-interaktif (`--no-interaction`, `-n`, `-m "..."` pada `git commit`, `PAGER=cat` untuk output panjang) dan hindari membuka editor TUI (`vim`, `nano`, `less`).
2. **[2026-11-10] Commit langsung ke branch `main` atau lupa inisialisasi ignore file**
   Do instead: Selalu bekerja pada branch fitur (`feature/<task-id>-<slug>` atau `fix/<task-id>-<slug>`) dari `main`, dan pastikan `.env`, `vendor/`, `node_modules/`, serta file `.~lock.*` masuk ke `.gitignore`.
3. **[2026-11-10] Menjalankan skrip atau artisan dari direktori yang salah**
   Do instead: Verifikasi working directory berada di root proyek `/home/yoga/Data/Kuliah/Sistem Informasi` sebelum menjalankan `php artisan`, `composer`, atau `npm`.

---

## 3. CleanWash Domain & Architecture Guardrails
1. **[2026-11-10] Perubahan tarif master `JenisLayanan` merusak nilai transaksi lama (KK-09)**
   Do instead: Selalu salin `harga_satuan` ke `Transaksi.harga_satuan_snapshot` saat transaksi dibuat atau saat `ubahLayanan()` disetujui, dan hitung seluruh tagihan memakai kolom snapshot tersebut.
2. **[2026-11-10] Kalkulasi nominal uang memakai float menimbulkan galat pembulatan**
   Do instead: Gunakan `DECIMAL(12,2)` di MySQL 8.4 dan lakukan perhitungan harga final, diskon voucher, DP, serta kompensasi di Service Layer Laravel (frontend hanya menampilkan preview).
3. **[2026-11-10] Satu voucher terpakai ganda atau voucher kedaluwarsa lolos (KK-03)**
   Do instead: Validasi `masa_berlaku >= tanggal_transaksi` dan `status_penggunaan === 'TERSEDIA'` di dalam `DB::transaction()` menggunakan `lockForUpdate()`, lalu ubah menjadi `'SUDAH_DIGUNAKAN'` secara atomik.
4. **[2026-11-10] Transisi status produksi mengabaikan karakteristik layanan (mis. Sepatu disetrika)**
   Do instead: Validasi perpindahan status `RiwayatStatusProduksi` terhadap daftar `TahapLayanan` milik `JenisLayanan` (cek `perlu_setrika`) dan catat `waktu_update` serta `id_pegawai`.
5. **[2026-11-10] Penyerahan pakaian belum lunas atau penjadwalan ulang merusak pengantaran pelanggan lain (KK-06 & KK-07)**
   Do instead: Panggil `cekHakBayarAkhir()` sebelum serah terima (tolak bila sisa > 0 dan `boleh_bayar_akhir === false`), serta kelola status antar & `jadwalkanUlang()` pada level `ItemPengantaran` per `nomor_nota`, bukan level header `Pengantaran`.
6. **[2026-11-10] PHP 8.4 lokal tidak memiliki ekstensi `bcmath` sehingga `bcadd`/`bcmul` fatal error**
   Do instead: Hindari fungsi `bcmath` dan `float` untuk nominal uang/kuantitas; gunakan helper aritmatika integer-scaled decimal (`App\Support\DecimalMoney` skala 100 / sen) bersama kolom MySQL `DECIMAL(12,2)`.

---

## 4. Multi-Agent Orchestration & Workspace Directives
1. **[2026-11-10] Konflik edit file saat beberapa subagent bekerja paralel**
   Do instead: Patuhi batas kepemilikan direktori di `AGENTS.md` (`backend-developer` di `app/`/`database/`/`tests/`, `frontend-developer` di `resources/js/`, `product-manager` di `PRD.md`/`MEMORY.md`/`WRITE.md`) dan kunci kontrak props/API lebih dulu melalui `product-manager` atau `fullstack-developer`.
2. **[2026-11-10] Sumber SRS asli berada di direktori `Archive/`**
   Do instead: Rujuk `Archive/Outputtts/UTS.pdf` dan `Archive/2UTS_CleanWash_Revisi_Parafrase_Format_Gambar_Jernih.docx` secara read-only; dilarang memodifikasi atau menghapus berkas arsip UTS tersebut.
3. **[2026-11-10] Subagent pembuat kode mengesahkan pekerjaannya sendiri**
   Do instead: Selalu lakukan *cross-agent review* (`fullstack-developer` / `product-manager`) sesuai `napkin/PR_REVIEW_LIFECYCLE.md` sebelum menandai task atau phase sebagai `DONE`.
4. **[2026-11-10] Pendaftaran ulang `define_subagent` gagal dengan error "already exists"**
   Do instead: Definisi subagent di `.agents/agents/*.md` (`product-manager`, `backend-developer`, `frontend-developer`, `fullstack-developer`) otomatis ditemukan oleh Antigravity; langsung panggil `invoke_subagent` menggunakan `TypeName` tersebut tanpa memanggil `define_subagent` ulang.
5. **[2026-11-10] Subagent auto-discovered dari `.agents/agents/*.md` hanya memiliki tool baca tanpa write/shell**
   Do instead: Untuk tugas yang membutuhkan tulis file dan eksekusi CLI (`fullstack-developer`, `backend-developer`, `frontend-developer`), daftarkan subagent bernama unik via `define_subagent(..., enable_write_tools=true)` atau teruskan draf terstruktur ke Primary Agent untuk ditulis/dieksekusi.
