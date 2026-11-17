# System Architecture Specification

- **Project Name**: CleanWash Laundry Management System
- **Status**: APPROVED
- **Owner**: AgentsV2 Software Architect
- **Last Updated**: 2026-11-17

## 1. Technology Stack & Runtime

- **Backend Framework**: Laravel 12.x running on PHP 8.2+
- **Database**: MySQL 8.4 LTS via Docker container (`cleanwash-mysql`, port `3307`), strict `DECIMAL(12,2)` for monetary values, zero float loss.
- **Frontend Layer**: Inertia.js 2.x with React 19, TypeScript 5.x, and Tailwind CSS 3.x.
- **Typography & Assets**: Local `@fontsource/plus-jakarta-sans` and `@fontsource/jetbrains-mono`, `lucide-react` iconography, AI-generated high-tech laundry atelier photography in `public/images/`.
- **Testing & Quality**:
  - Pest / PHPUnit for domain and feature test suites (114 tests, 4156 assertions).
  - Playwright for real browser E2E regression tests on live web server (`http://127.0.0.1:8000`).
  - Laravel Pint for PSR-12 code styling and `tsc --noEmit` for static type safety.

## 2. Directory Structure & Module Boundaries

```text
├── app/
│   ├── Enums/            # Strictly typed PHP enums (UserRole, StatusTransaksi, TahapProduksi, etc.)
│   ├── Http/
│   │   ├── Controllers/  # LandingController, TransaksiController, ProduksiController, etc.
│   │   ├── Middleware/   # EnsureUserHasRole, HandleInertiaRequests, SetLocale
│   │   └── Requests/     # Strict FormRequests per business mutation
│   ├── Models/           # 16 Eloquent Models (guarded, casts, relational integrity)
│   ├── Policies/         # Granular authorization logic per role
│   ├── Services/         # TransaksiService, ProduksiService, VoucherService, KompensasiService, PengantaranService
│   └── Support/          # DecimalMoney (safe integer cents math, bcmath)
├── database/
│   ├── migrations/       # 18 reversible MySQL migrations
│   └── seeders/          # RoleUserSeeder, MasterLayananSeeder, VoucherSeeder, TransaksiSeeder
├── docs/
│   ├── design/           # DESIGN_SYSTEM.md & PAGE_BLUEPRINTS.md
│   ├── phases/           # Contracts & Closing Evidence (Phase 1 to 3)
│   └── qa/               # QA_REGRESSION_REPORT.md & screenshots
├── public/
│   ├── build/            # Compiled Vite frontend bundle
│   └── images/           # Brand assets & AI-generated washing machine graphics
├── resources/
│   ├── css/              # Tailwind base, typography fonts, custom scrollbars
│   └── js/
│       ├── Components/   # Reusable UI kit (AppLayout, Navbar, Button, Modal, StatTile, Table, FilterToolbar)
│       ├── Layouts/      # AppLayout (authenticated console), PublicLayout (landing profile)
│       ├── Pages/        # Landing/Welcome, Auth, Dashboard, Transaksi, Produksi, Pengantaran, Audit, etc.
│       └── types/        # TypeScript interfaces mirrored from backend models
└── tests/
    ├── Feature/          # Backend Pest test suite
    └── e2e/              # Playwright browser test specs
```

## 3. Data Models & Schemas

The database comprises 16 strictly relational tables in MySQL 8.4:
- `users`: Staff credentials, foreign key to role (`PETUGAS`, `PEGAWAI`, `PENGANTAR`).
- `pelanggan`: Customer registry with `boleh_bayar_akhir` (paylater flag).
- `jenis_layanan` & `tahap_layanan`: Service catalog and dynamic workflow stages (`perlu_setrika` flag).
- `transaksi`: System of record with `harga_satuan_snapshot`, `status_transaksi`, `status_pembayaran`, and unique receipt code `CW-YYYYMMDD-XXXX`.
- `detail_pakaian`: Polymorphic laundry items itemized per receipt (category, condition, quantity/weight).
- `voucher`: Promotional discounts with atomic usage flag and expiry verification.
- `riwayat_status_produksi`: Stage transition timeline with actor ID and WIB timestamps.
- `laporan_kerusakan_kehilangan`: Incidents linked to specific `detail_pakaian` with compensation records.
- `pengantaran` & `item_pengantaran`: Multi-customer courier batches with isolated item status and rescheduling.
- `audit_logs`: Immutable transaction log for compliance and receivables.

## 4. API & Interface Contracts

### Public & Authentication Endpoints
- `GET /`: CleanWash Web Profile Landing Page (`Welcome.tsx`) displaying brand story, high-tech washing machines showcase, service catalog, interactive pricing calculator, and order tracking widget.
- `GET /login`, `POST /login`, `POST /logout`: Session-based authentication with role redirection.

### Counter & Reception (`PETUGAS`)
- `GET /dashboard`, `GET /transaksi`, `GET /transaksi/create`, `POST /transaksi`: Itemization, snapshot pricing, down payment.
- `GET /transaksi/{nota}/nota`: Formal printable A4 receipt.
- `GET /serah-terima`, `POST /transaksi/{nota}/serah-terima`: Handover with paylater verification (`KK-06`).
- `GET /audit`: Real-time receivables audit table and system audit trail.

### Floor Production (`PEGAWAI`)
- `GET /produksi`: Production queue with responsive stage filters, mobile-optimized cards, quick status transition, reweighing modal (`KK-01`), and incident reporting (`KK-04`, `KK-05`).
- `POST /transaksi/{nota}/timbang-ulang`: Automatic bill adjustment.
- `POST /transaksi/{nota}/produksi/advance`: Sequential stage advancement.

### Courier Logistics (`PENGANTAR`)
- `GET /pengantaran`, `GET /pengantaran/{id}`: Multi-customer courier route with mobile-first cards, pickup/delivery status, and isolated rescheduling (`KK-07`).

## 5. Security & Error-Handling Strategy

- **Granular RBAC**: Enforced via `EnsureUserHasRole` middleware and Laravel Policies on every mutation route.
- **CSRF & Header Security**: Built-in CSRF token protection on all Inertia forms, strict session security.
- **Input Sanitization**: Dedicated FormRequests for all user submissions with Indonesian localized error messages.
- **Financial Precision**: All calculations use integer cents via `DecimalMoney`, preventing decimal truncation bugs.
- **Universal Attribution**: All layouts embed the canonical copyright string: `Copyright © 2026 CleanWash • Developed by Yoga. All rights reserved.`

## 6. Testing & Verification Strategy

- **Code Style**: `./vendor/bin/pint --test`
- **Static Analysis**: `npx tsc --noEmit`
- **Backend Tests**: `php artisan test`
- **Live Browser Regression**: `npx playwright test --reporter=list` against live server `http://127.0.0.1:8000`

## 7. Architecture Decision Records (ADRs)

- **ADR-012**: *Crisp Laundry-Tech Atelier Design System* (`#0F2933` Deep Petrol, `#0F766E` Mint Teal, Plus Jakarta Sans, JetBrains Mono).
- **ADR-013**: *Public Web Profile Landing Page*: Dedicated public portal on `/` for brand identity, service showcase, washing machine technology graphics, and order tracking without requiring prior login.
- **ADR-014**: *Mobile-First Production Floor Ergonomics*: Full mobile optimization for `Pegawai Produksi` on `/produksi` using horizontal stage filter pills, compact single-column cards, and large >= 44px tap targets.
- **ADR-015**: *Universal Copyright by Yoga Attribution*: Consistent copyright statement placed in layouts, landing page, and receipts.
