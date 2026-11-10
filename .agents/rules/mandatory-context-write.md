# Workspace Rule: Protokol Anti-Hilang Konteks & Hukum Wajib Tulis `.md`

Aturan ini selalu aktif (*always-on*) untuk setiap agent dan subagent yang beroperasi di workspace **CleanWash**.

## 1. Wajib Baca Sebelum Bertindak
Sebelum menulis kode, menjalankan migrasi, atau merencanakan tugas baru:
1. Baca [MEMORY.md](file:///home/yoga/Data/Kuliah/Sistem%20Informasi/MEMORY.md) untuk mengetahui Phase aktif, Invariants, dan ADR.
2. Baca minimal 3 entri terakhir di [WRITE.md](file:///home/yoga/Data/Kuliah/Sistem%20Informasi/WRITE.md) agar kesinambungan kerja tidak terputus.
3. Baca [.claude/napkin.md](file:///home/yoga/Data/Kuliah/Sistem%20Informasi/.claude/napkin.md) untuk menerapkan seluruh aturan & gotcha terkini.

## 2. Hukum Wajib Tulis `.md` Setiap Selesai Kegiatan
- **Dilarang keras** mengakhiri tugas, giliran respons, atau mendelegasikan/mengembalikan hasil subagent tanpa menambahkan entri kegiatan terbaru di **[WRITE.md](file:///home/yoga/Data/Kuliah/Sistem%20Informasi/WRITE.md)**.
- Setiap entri `WRITE.md` wajib memuat fakta terverifikasi: file yang disentuh, hasil perintah verifikasi aktual, keputusan/blocker, dan **Next Exact Action**.
- Jika ada status checklist/phase atau keputusan arsitektur berubah, wajib sinkronkan **[MEMORY.md](file:///home/yoga/Data/Kuliah/Sistem%20Informasi/MEMORY.md)**.
- Jika ditemukan kesalahan berulang atau aturan teknis baru, wajib kurasi ke **[.claude/napkin.md](file:///home/yoga/Data/Kuliah/Sistem%20Informasi/.claude/napkin.md)** menggunakan format `[YYYY-MM-DD]` + `Do instead:`.

## 3. Proteksi Dokumen Arsip SRS
- Seluruh file di dalam `Archive/` (termasuk `Archive/Outputtts/UTS.pdf`) adalah referensi SRS *read-only* dan tidak boleh diubah atau dihapus.
