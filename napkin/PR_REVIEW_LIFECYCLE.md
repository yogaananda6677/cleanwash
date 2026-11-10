# Rules for Review Lifecycle, Quality Gates & Pull Request Gate

Dokumen ini mendefinisikan standar mutu mutlak yang harus dipenuhi oleh Primary Agent maupun seluruh Subagent (*Product Manager, Backend Developer, Frontend Developer, Fullstack Developer*) sebelum sebuah perubahan dinyatakan selesai, di-handoff, atau di-merge ke branch `main`.

> ⚠️ **Prinsip Utama:** Tidak ada kode yang boleh masuk ke branch `main` tanpa lulus 100% uji otomatis lokal, audit invarian SRS CleanWash, dan pembaruan wajib `WRITE.md`.

---

## 1. Siklus Hidup Review (6 Gerbang Kualitas CleanWash)

```text
[Gerbang 1: Static & Style] ──> [Gerbang 2: Automated Test Suite] ──> [Gerbang 3: Security & RBAC]
                                                                               │
[Gerbang 6: PM & Merge Gate] <── [Gerbang 5: Mandatory Write .md]  <── [Gerbang 4: DB, Contract & SRS]
```

---

### Gerbang 1: Static Analysis, Formatting & Code Hygiene
- [ ] **Backend (Laravel 12 / PHP 8.2+):**
  - Lulus formatter Laravel Pint tanpa perubahan: `./vendor/bin/pint --test`.
  - Lulus static analysis (PHPStan/Larastan level proyek jika terpasang).
  - Tidak ada `dd(...)`, `dump(...)`, `var_dump(...)`, atau kode mati/unused imports.
  - Fungsi/method ringkas, error handling eksplisit (DB transaction untuk mutasi multi-tabel).
- [ ] **Frontend (Inertia React + TypeScript + Tailwind):**
  - Lulus pemeriksaan tipe TypeScript tanpa error: `npx tsc --noEmit`.
  - Lulus linter (jika terpasang, misal `npm run lint`) dan bebas `console.log` debug yang tertinggal.
  - Tidak ada duplikasi aturan bisnis kritis (seperti kalkulasi harga final/validasi voucher final) yang mengabaikan server.

---

### Gerbang 2: Automated Test Gate (Zero Regression & TDD Matrix)
- [ ] **Backend & Feature Tests (Pest / PHPUnit):**
  - Seluruh unit & feature test lulus 100%: `php artisan test` (exit code 0).
  - Setiap service atau endpoint bisnis baru wajib menyertakan minimal 3 kelompok kasus uji:
    1. *Happy Path*
    2. *Boundary & Edge Cases* (merujuk langsung ke **9 Kondisi Khusus SRS CleanWash**: `KK-01` s.d. `KK-09`)
    3. *Unhappy / Authorization Path* (payload invalid, role tidak berhak, transisi status ilegal, voucher kedaluwarsa/terpakai).
- [ ] **Frontend Build & Smoke Verification:**
  - Build produksi Vite lulus bersih tanpa error: `npm run build` (dan frontend test jika tersedia).
- [ ] **Toleransi Kegagalan:** **0%**. Jika ada 1 test gagal atau di-skip tanpa alasan sah, PR/handoff **diblokir**.

---

### Gerbang 3: Security, RBAC, Privacy & Secret Audit
- [ ] **Zero Secrets in Git:**
  - Pastikan `.env`, API key, database password, atau dump database lokal tidak ikut ter-stage (`git status`).
- [ ] **Otorisasi Aktor & RBAC Ketat:**
  - Setiap route terproteksi Policy/Middleware peran yang sesuai (`Petugas`, `Pegawai`, `PetugasPengantaran`).
  - `Pegawai` tidak bisa mengubah master tarif/pelanggan/pelunasan; `PetugasPengantaran` hanya bisa memperbarui item pengantaran miliknya.
- [ ] **Keamanan Laravel Dasar:**
  - Semua Eloquent model mendefinisikan `$fillable` atau `$guarded` secara eksplisit (anti mass-assignment).
  - Input request selalu melewati `FormRequest` validation; proteksi CSRF aktif; permission file wajar (`644`/`755`, dilarang `777`).

---

### Gerbang 4: Database, Contract & SRS Traceability Sync
- [ ] **MySQL 8.4 Migration & Rollback Safety:**
  - Setiap migrasi baru wajib teruji maju dan mundur: `php artisan migrate` dan `php artisan migrate:rollback` berjalan bersih tanpa error constraint.
  - Seluruh kolom nominal uang menggunakan `decimal(..., 12, 2)`.
- [ ] **Contract & SRS Sync:**
  - Perubahan payload controller/Inertia wajib sinkron dengan tipe TypeScript (`resources/js/types/`) dan [PRD.md](file:///home/yoga/Data/Kuliah/Sistem%20Informasi/PRD.md).
  - Pastikan aturan SRS (seperti `harga_satuan_snapshot`, `TahapLayanan` per layanan, `DetailPakaian` target insiden, `ItemPengantaran` independen, dan `boleh_bayar_akhir`) tidak dilanggar.

---

### Gerbang 5: Mandatory Write `.md` & PR Metadata Evidence *(Aturan Tambahan Wajib)*
- [ ] **Wajib Tulis `WRITE.md`:** Aktivitas terbaru beserta daftar file berubah, hasil perintah uji nyata, dan *next action* telah dicatat di [WRITE.md](file:///home/yoga/Data/Kuliah/Sistem%20Informasi/WRITE.md).
- [ ] **Sinkronisasi `MEMORY.md` & `.claude/napkin.md`:**
  - Jika ada perubahan progres Phase, checkbox, atau ADR baru, [MEMORY.md](file:///home/yoga/Data/Kuliah/Sistem%20Informasi/MEMORY.md) wajib diperbarui.
  - Jika ditemukan gotcha/aturan berulang baru, [.claude/napkin.md](file:///home/yoga/Data/Kuliah/Sistem%20Informasi/.claude/napkin.md) wajib diperbarui.
- [ ] **Template Deskripsi PR / Handoff Standar:**
  ```markdown
  ## Deskripsi Perubahan
  [Ringkasan perubahan dan referensi Use Case / Kondisi Khusus SRS terkait]

  ## Referensi Phase & Task
  Phase: [Phase 1 / 2 / 3] — Task ID: [mis. P1-05]

  ## Bukti Uji Otomatis (Evidence)
  - [x] `./vendor/bin/pint --test` -> PASSED
  - [x] `npx tsc --noEmit` -> PASSED
  - [x] `php artisan test` -> PASSED (X passed, 0 failed)
  - [x] `npm run build` -> PASSED

  ## Checklist Konteks & Keamanan
  - [x] `WRITE.md` diperbarui dengan log aktivitas & next step
  - [x] `MEMORY.md` / `.claude/napkin.md` sinkron
  - [x] Tidak ada secret / file `.env` ikut ter-commit
  - [x] Otorisasi RBAC & invarian SRS terverifikasi
  ```

---

### Gerbang 6: Cross-Agent Adversarial Review & Merge Gate
1. **Dilarang Self-Approve:** Subagent atau agent pembuat kode dilarang mengesahkan PR/task miliknya sendiri.
2. **Cross-Agent Verification:**
   - Perubahan kode backend/frontend wajib direview oleh subagent berbeda (`fullstack-developer` atau `backend-developer`/`frontend-developer` pendamping) untuk audit teknis.
   - Subagent `product-manager` wajib memverifikasi kecocokan *Acceptance Criteria* terhadap `PRD.md` dan SRS sebelum task/phase ditandai `DONE`.
3. **CI & Strategi Merge:** Pastikan seluruh check hijau dan gunakan **Squash and Merge** (`git merge --squash` / PR squash merge) agar histori branch `main` bersih dan linear.
