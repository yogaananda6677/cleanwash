# Agent Project Memory — CleanWash

Dokumen ini adalah memori status arsitektur proyek **CleanWash** untuk manusia dan AI Agent. Baca dokumen ini bersama [PRD.md](file:///home/yoga/Data/Kuliah/Sistem%20Informasi/PRD.md), [AGENTS.md](file:///home/yoga/Data/Kuliah/Sistem%20Informasi/AGENTS.md), [WRITE.md](file:///home/yoga/Data/Kuliah/Sistem%20Informasi/WRITE.md), dan [.claude/napkin.md](file:///home/yoga/Data/Kuliah/Sistem%20Informasi/.claude/napkin.md) sebelum merencanakan atau mengubah kode.

> Jangan menandai pekerjaan atau phase sebagai `DONE` hanya karena kode sudah ditulis. Status `DONE` hanya sah setelah seluruh acceptance criteria, 6 Gerbang Kualitas di [napkin/PR_REVIEW_LIFECYCLE.md](file:///home/yoga/Data/Kuliah/Sistem%20Informasi/napkin/PR_REVIEW_LIFECYCLE.md), dan pembaruan wajib `WRITE.md` dipenuhi.

---

## 1. Project Snapshot

| Field | Current Value |
| --- | --- |
| **Product** | CleanWash — Sistem Informasi Manajemen Operasional Laundry |
| **SRS Reference** | [UTS.pdf](file:///home/yoga/Data/Kuliah/Sistem%20Informasi/Archive/Outputtts/UTS.pdf) & [2UTS_CleanWash_Revisi_Parafrase_Format_Gambar_Jernih.docx](file:///home/yoga/Data/Kuliah/Sistem%20Informasi/Archive/2UTS_CleanWash_Revisi_Parafrase_Format_Gambar_Jernih.docx) |
| **Current Phase** | Phase 1 — Fondasi Sistem, Master Data & Penerimaan Transaksi |
| **Current Status** | `IN_PROGRESS` (`P1-01` s.d. `P1-05` selesai; siap review/merge `P1-05` & lanjut `P1-06` UI Frontend) |
| **Last Updated** | 2026-11-10 |
| **Updated By** | Backend Developer (`cw-backend-dev`) — P1-05 Reception, Snapshot Tarif (`KK-09`), Atomic Voucher Lock (`KK-03`), & DP Pembayaran |

---

## 2. Product Intent

Membangun sistem informasi operasional laundry **CleanWash** berbasis web (**Laravel 12 + PHP 8.2+ + MySQL 8.4 + Inertia.js React TypeScript + Tailwind CSS**) untuk mengelola 4 aktor (*Pelanggan* sebagai pemicu/entitas, *Petugas/Kasir*, *Pegawai/Produksi*, *Petugas Pengantaran/Kurir*), 14 Use Case, 13 Class domain (+ `TahapLayanan`), dan 9 Kondisi Khusus secara konsisten, auditabel, dan bebas kehilangan konteks antar sesi pengembangan.

---

## 3. Invariants — Jangan Dilanggar

1. **Backend Laravel sebagai System of Record**: Seluruh kalkulasi tagihan, validasi voucher, perpindahan status produksi, pemotongan kompensasi, dan cek hak bayar akhir wajib dijalankan di backend service layer.
2. **Imutabilitas Snapshot Tarif (`KK-09`)**: `Transaksi.harga_satuan_snapshot` wajib disalin saat transaksi dibuat/diubah layanan; perubahan master `JenisLayanan.harga_satuan` tidak boleh mengubah nota lama.
3. **Presisi Nominal Keuangan**: Seluruh nominal uang di MySQL 8.4 wajib menggunakan `DECIMAL(12,2)` (dilarang `FLOAT`/`DOUBLE`).
4. **Klaim Voucher Atomik (`KK-03`)**: Validasi `masa_berlaku` & `status_penggunaan = TERSEDIA` serta penguncian menjadi `SUDAH_DIGUNAKAN` wajib berjalan dalam `DB::transaction()` + `lockForUpdate()`.
5. **Tahap Produksi Dinamis per Layanan**: `RiwayatStatusProduksi` wajib divalidasi terhadap `TahapLayanan` milik `JenisLayanan` (mis. layanan `perlu_setrika = false` seperti sepatu dilarang masuk tahap `Disetrika`), lengkap dengan `waktu_update` dan `id_pegawai`.
6. **Kompensasi Tertaut ke `DetailPakaian` (`KK-04`, `KK-05`)**: Laporan kerusakan/kehilangan wajib menunjuk `id_detail` pakaian spesifik dan memotong saldo tagihan transaksi secara transparan (termasuk pencatatan kelebihan ganti rugi bila > sisa tagihan).
7. **Penimbangan Ulang & Penyesuaian Status Lunas (`KK-01`)**: `timbangUlang()` wajib menghitung ulang `total_harga`; bila tadinya `LUNAS` namun tagihan bertambah, status pembayaran turun kembali ke `BELUM_LUNAS`.
8. **Pembatalan & Ubah Layanan Berbasis Tahap (`KK-02`, `KK-08`)**: `ubahLayanan()` dan `batalkanTransaksi()` wajib memeriksa `RiwayatStatusProduksi` terakhir dan menerapkan aturan biaya proses setelah pencucian (`Dicuci`) dimulai.
9. **Gerbang Hak Bayar Akhir (`KK-06`) & Isolasi Pengantaran (`KK-07`)**: Serah terima pakaian belum lunas diblokir kecuali `Pelanggan.boleh_bayar_akhir = true`. Kegagalan satu `ItemPengantaran` dan `jadwalkanUlang()` tidak boleh mengganggu status `ItemPengantaran` lain pada `Pengantaran` yang sama.
10. **Wajib Tulis `.md` Anti-Hilang Konteks**: Setiap akhir aktivitas/subtask, agent wajib membaca & memperbarui `WRITE.md` (dan `MEMORY.md`/`.claude/napkin.md` bila relevan) sebelum mengakhiri giliran atau melakukan handoff.

---

## 4. Confirmed Architecture Decisions (ADR)

| ID | Decision | Status | Reason |
| --- | --- | --- | --- |
| **ADR-001** | **Laravel 12 (PHP 8.2+)** sebagai framework backend utama | ACCEPTED | Mengikuti spesifikasi kebutuhan non-fungsional SRS CleanWash (§5.2) dan ketersediaan runtime PHP 8.4. |
| **ADR-002** | **MySQL 8.4** sebagai database relasional utama | ACCEPTED | Mengikuti SRS CleanWash (§5.2); mendukung `DECIMAL`, foreign key ketat, dan *row-level locking* (`FOR UPDATE`). |
| **ADR-003** | **Inertia.js + React + TypeScript + Tailwind CSS** untuk layer frontend | ACCEPTED | Memberikan batas tegas antara Backend (`app/`, `database/`, `routes/`) dan Frontend (`resources/js/`) sehingga subagent BE & FE bekerja optimal tanpa saling menimpa. |
| **ADR-004** | **Pemisahan Tabel `Transaksi`, `DetailPakaian`, dan `TahapLayanan`** | ACCEPTED | Memenuhi struktur Class Diagram SRS agar insiden kerusakan menunjuk item spesifik dan alur produksi mengikuti `perlu_setrika` tiap layanan. |
| **ADR-005** | **Kolom Snapshot Tarif (`harga_satuan_snapshot`) pada `Transaksi`** | ACCEPTED | Menjamin kondisi khusus `KK-09` (perubahan tarif master tidak mengubah nota lama). |
| **ADR-006** | **Tabel Asosiasi `ItemPengantaran` untuk relasi `*..*` `Transaksi`–`Pengantaran`** | ACCEPTED | Memenuhi `KK-07` agar satu kurir dapat membawa banyak transaksi lintas pelanggan dan menjadwalkan ulang satu nota gagal secara terpisah. |
| **ADR-007** | **Arsitektur Memori 3 Lapis (`WRITE.md` + `MEMORY.md` + `.claude/napkin.md`)** | ACCEPTED | Mengatasi celah `napkin.md` yang bukan log kronologis sehingga tidak ada kehilangan konteks antar sesi dan antar subagent. |
| **ADR-008** | **Orkestrasi 4 Subagent Terspesialisasi (`.agents/agents/*.md`)** | ACCEPTED | Memisahkan tanggung jawab `product-manager`, `backend-developer`, `frontend-developer`, dan `fullstack-developer` beserta *cross-agent review gate*. |
| **ADR-009** | **6 Gerbang Kualitas Adaptasi `napkin/PR_REVIEW_LIFECYCLE.md`** | ACCEPTED | Menggantikan gate Golang/Flutter dari acuan `PTT_app` menjadi gate Laravel Pint, TypeScript, PHPUnit/Pest, MySQL rollback, dan wajib isi `WRITE.md`. |
| **ADR-010** | **`App\Support\DecimalMoney` (skala 100 integer) & MySQL `3307` Terisolasi** | ACCEPTED | Runtime PHP 8.4 lokal tidak memiliki `ext-bcmath` maupun `ext-pdo_sqlite`, serta port `3306` dipakai proyek lain; seluruh aritmatika uang memakai integer skala 100 dan DB dev/test terisolasi di MySQL 8.4 port `3307`. |

---

## 5. Phase Progress Summary

Status yang diizinkan: `NOT_STARTED`, `IN_PROGRESS`, `BLOCKED`, `DONE`.

| Phase | Scope | Status | Started | Completed | Evidence |
| --- | --- | --- | --- | --- | --- |
| **Phase 0 (Docs)** | PRD, AGENTS.md, 4 Subagent, Napkin & Context Ledger | `DONE` | 2026-11-10 | 2026-11-10 | [WRITE.md](file:///home/yoga/Data/Kuliah/Sistem%20Informasi/WRITE.md) Entry `#001` |
| **Phase 1** | Fondasi Sistem, Master Data & Penerimaan Transaksi (DP & Voucher) | `IN_PROGRESS` | 2026-11-10 | — | [PHASE_1_CONTRACTS.md](file:///home/yoga/Data/Kuliah/Sistem%20Informasi/docs/phases/PHASE_1_CONTRACTS.md) & [WRITE.md](file:///home/yoga/Data/Kuliah/Sistem%20Informasi/WRITE.md) Entry `#002`–`#006` |
| **Phase 2** | Operasional Produksi, Timbang Ulang, Ubah/Batal & Kompensasi Insiden | `NOT_STARTED` | — | — | Menunggu Phase 1 `DONE` |
| **Phase 3** | Pengantaran Multi-Pelanggan, Pelunasan Akhir, Serah Terima & Hardening | `NOT_STARTED` | — | — | Menunggu Phase 2 `DONE` |

---

## 6. Detailed 3-Phase Checklist

### Phase 1 — Fondasi Sistem, Master Data & Penerimaan Transaksi (DP & Voucher)
- [x] `P1-01` (`product-manager`): Breakdown task detail & kontrak payload Inertia/Request Phase 1 ([PHASE_1_CONTRACTS.md](file:///home/yoga/Data/Kuliah/Sistem%20Informasi/docs/phases/PHASE_1_CONTRACTS.md)).
- [x] `P1-02` (`fullstack-developer`): Scaffolding Laravel 12 + MySQL 8.4 + Inertia React TS + Tailwind + CI Workflow.
- [x] `P1-03` (`backend-developer`): Migrasi seluruh tabel MySQL 8.4, seeder aktor/role (`Petugas`, `Pegawai`, `PetugasPengantaran`), Auth & RBAC Policy.
- [x] `P1-04` (`backend-developer`): CRUD Master `Pelanggan` (`boleh_bayar_akhir`), `JenisLayanan` + `TahapLayanan`, dan `Voucher`.
- [x] `P1-05` (`backend-developer`): Engine Penerimaan `Transaksi` + `DetailPakaian`, `harga_satuan_snapshot` (`KK-09`), validasi/lock atomik `Voucher` (`KK-03`), DP `Pembayaran`, & automated tests.
- [ ] `P1-06` (`frontend-developer`): UI Login, App Shell per peran, Master CRUD pages, dan Form Kasir Penerimaan Nota dinamis.
- [ ] `P1-07` (`fullstack-developer` + `product-manager`): Halaman Detail & Cetak Nomor Nota, integrasi E2E Phase 1, audit 6 Gerbang, & Phase 1 Sign-off.

### Phase 2 — Operasional Produksi, Timbang Ulang, Penyesuaian & Kompensasi Insiden
- [ ] `P2-01` (`product-manager`): Spesifikasi aturan selisih ubah layanan, biaya pembatalan setelah cuci, dan formula kompensasi.
- [ ] `P2-02` (`backend-developer`): `ProduksiService` (`timbangUlang` + hitung ulang harga `KK-01`, state machine `RiwayatStatusProduksi` sesuai `TahapLayanan`).
- [ ] `P2-03` (`backend-developer`): `ubahLayanan()` (`KK-02`) dan `batalkanTransaksi()` (`KK-08`) + unit/feature tests.
- [ ] `P2-04` (`backend-developer`): `KompensasiService` untuk `LaporanKerusakanKehilangan` per `DetailPakaian` (`KK-04`, `KK-05`) + tests.
- [ ] `P2-05` (`frontend-developer`): UI Antrean Produksi `Pegawai` (progres tahapan dinamis, timbang ulang, lapor insiden) & UI Ubah/Batal di sisi `Petugas`.
- [ ] `P2-06` (`fullstack-developer` + `product-manager`): Integrasi notifikasi/indikator lintas aktor, E2E tests Phase 2, audit 6 Gerbang, & Phase 2 Sign-off.

### Phase 3 — Pengantaran Multi-Pelanggan, Pelunasan Akhir, Serah Terima & Hardening
- [ ] `P3-01` (`product-manager`): Matriks UAT lengkap 14 Use Case & 9 Kondisi Khusus + spesifikasi Dashboard/Audit view.
- [ ] `P3-02` (`backend-developer`): `PengantaranService` (`Pengantaran` + `ItemPengantaran` `*..*`, status berurutan, `jadwalkanUlang` independen `KK-07`).
- [ ] `P3-03` (`backend-developer`): `SerahTerimaService` (`cekHakBayarAkhir` `KK-06`, `catatPelunasan`, `updateStatusLunas`) & endpoint Dashboard/Audit Log.
- [ ] `P3-04` (`frontend-developer`): UI Kurir (`PetugasPengantaran`), modal Pelunasan & Serah Terima Kasir, Dashboard & Audit Trail viewer.
- [ ] `P3-05` (`fullstack-developer` + `product-manager`): Security & NFR audit (RBAC, CSRF, N+1, decimal precision, backup/restore check), UAT 14 Use Case & 9 Kondisi Khusus, & Final Release Sign-off.
