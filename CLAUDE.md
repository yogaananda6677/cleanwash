# Agent Guidelines & Execution Entrypoint (CLAUDE.md)

Panduan operasional wajib, siklus kerja 6 tahap, pembagian 3 Phase proyek **CleanWash**, aturan delegasi 4 Subagent, serta protokol anti-hilang konteks mengacu pada dokumen utama:

👉 **[AGENTS.md](file:///home/yoga/Data/Kuliah/Sistem%20Informasi/AGENTS.md)**

## Dokumen Wajib Baca di Awal Sesi
1. **[PRD.md](file:///home/yoga/Data/Kuliah/Sistem%20Informasi/PRD.md)** — Spesifikasi produk, 14 Use Case, 13 Class, State Machine, dan 9 Kondisi Khusus CleanWash.
2. **[MEMORY.md](file:///home/yoga/Data/Kuliah/Sistem%20Informasi/MEMORY.md)** — Snapshot fase aktif, Invariants, ADR, dan checklist progres.
3. **[WRITE.md](file:///home/yoga/Data/Kuliah/Sistem%20Informasi/WRITE.md)** — **Catatan aktivitas wajib (*append-only*):** baca 3 entri terakhir sebelum bekerja, dan **WAJIB menulis entri baru setiap selesai melakukan kegiatan**.
4. **[.claude/napkin.md](file:///home/yoga/Data/Kuliah/Sistem%20Informasi/.claude/napkin.md)** — Runbook aturan & gotcha terkurasi.

## Referensi Pendukung & Subagent
- **Napkin Skill:** [napkin/SKILL.md](file:///home/yoga/Data/Kuliah/Sistem%20Informasi/napkin/SKILL.md)
- **Quality Gate & PR Review:** [napkin/PR_REVIEW_LIFECYCLE.md](file:///home/yoga/Data/Kuliah/Sistem%20Informasi/napkin/PR_REVIEW_LIFECYCLE.md)
- **Definisi Subagent:** [.agents/agents/](file:///home/yoga/Data/Kuliah/Sistem%20Informasi/.agents/agents) (`product-manager.md`, `backend-developer.md`, `frontend-developer.md`, `fullstack-developer.md`)
