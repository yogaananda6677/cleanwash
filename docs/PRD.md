# Product Requirements Document (PRD)

- **Project Name**: CleanWash Laundry Management System
- **Status**: APPROVED
- **Owner**: AgentsV2 Product Manager & Systems Analyst
- **Last Updated**: 2026-11-17

## 1. Problem Statement & Goals

- **Problem**: Commercial and institutional laundry operations require seamless coordination across counter reception, shop floor production, multi-customer courier dispatch, and financial settlements. Existing manual workflows suffer from price calculation errors, lost laundry items, unverified discounts, lack of auditability for paylater customers, and clunky mobile experiences for workers on the factory floor.
- **Target Users**:
  1. `PETUGAS` (Front Desk / Cashier): Handles reception, itemization, snapshot pricing, vouchers, down payments, pickups, and financial audits.
  2. `PEGAWAI` (Production Operator): Works on the factory floor operating washers, dryers, and ironers—accessing tasks primarily via mobile smartphones.
  3. `PENGANTAR` (Delivery Courier): Operates in the field delivering orders across multi-customer routes on mobile devices.
  4. `PUBLIC / CUSTOMERS`: Prospective and existing laundry clients exploring services, pricing, company profile, and laundry status.
- **Success Metrics**:
  - 100% compliance with SRS 14 Use Cases (`UC-01`–`UC-14`) and 9 Special Conditions (`KK-01`–`KK-09`).
  - Ultra-professional modern SaaS aesthetic with consistent design tokens, elevated card components, and clear visual hierarchy.
  - 100% mobile-friendly UX for production (`/produksi`) and courier (`/pengantaran`) workflows on `375px`–`430px` screens.
  - High-converting, responsive public Web Profile at `/` featuring modern AI-generated laundry atelier imagery and company capabilities.
  - Universal "Copyright by Yoga" attribution rendered across public landing, application shells, and printed receipts.

## 2. Scope

### In Scope
- **Core Business Engine**: Pricing snapshots (`KK-09`), atomic vouchers with mutex locks (`KK-03`), dynamic production workflows (skipping iron stage for shoes/fold), auto-reweighing recalculations (`KK-01`), production-stage cancellations (`KK-08`), service switching (`KK-02`), and incident compensation (`KK-04`, `KK-05`).
- **Logistics & Settlement**: Multi-customer courier scheduling, isolated delivery reschedules (`KK-07`), handover paylater verification (`KK-06`), and audit trail.
- **Public Web Profile**: Dedicated brand landing page at `/` with hero section, AI washing machine imagery, service tiers, workflow explainer, pricing calculator, laundry tracker modal/widget, and footer.
- **Production Floor Mobile UX**: Mobile-first redesign for `Pegawai Produksi` (`/produksi`) with horizontal stage pills, single-column tactile task cards, large touch targets (>= 44px), and streamlined modals.
- **Global Professional Redesign**: Elevated styling for audit trail (`/audit`), transaction views, dashboard cards, modal dialogs, and navigation headers.
- **Attribution**: Persistent "Copyright by Yoga" across all views.

### Out of Scope
- Direct payment gateway API integration (midtrans/xendit) in V1 (system currently uses cash/DP/settlement recording).
- Native iOS/Android app store packaging (optimized mobile PWA/responsive web is used instead).

## 3. Functional Requirements

| ID | Requirement | Priority | Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| `FR-001` | **Reception & Order Itemization (`UC-07`)** | `P0` | Support multi-item `DetailPakaian` with piece/weight modes, speed tiers, auto receipt numbering (`CW-YYYYMMDD-XXXX`), and down payments (`UC-01`). |
| `FR-002` | **Snapshot Pricing Engine (`KK-09`)** | `P0` | Store `harga_satuan_snapshot` on creation so future master price alterations never mutate existing transactions. |
| `FR-003` | **Atomic Voucher Verification (`KK-03`, `UC-08`)** | `P0` | Validate voucher code, active dates, and unredeemed status using database row locks (`lockForUpdate`). |
| `FR-004` | **Dynamic Production Workflow (`UC-11`)** | `P0` | Stepper transitions through `DITERIMA -> DICUCI -> DIKERINGKAN -> [DISETRIKA] -> SELESAI`. Automatically skip `DISETRIKA` for services with `perlu_setrika = false`. |
| `FR-005` | **Reweighing & Recalculation (`KK-01`, `UC-12`)** | `P0` | Recalculate bill if actual weight changes; downgrade payment status from `LUNAS` to `BELUM_LUNAS` if bill increases. |
| `FR-006` | **Incident & Compensation Engine (`KK-04`, `KK-05`, `UC-13`)** | `P0` | Record damage/loss per specific `DetailPakaian` item, compute compensation, and deduct from remaining bill or record net payout. |
| `FR-007` | **Service Change & Stage-based Cancellation (`KK-02`, `KK-08`, `UC-10`)** | `P0` | Allow service change prior to washing; permit 0% cancellation before washing, apply cancellation fee once washing starts. |
| `FR-008` | **Multi-Customer Courier Logistics (`KK-07`, `UC-14`)** | `P0` | Allow grouping multiple customer deliveries in one session; isolated reschedule for failed deliveries without mutating siblings. |
| `FR-009` | **Controlled Handover & Paylater Rights (`KK-06`, `UC-02`)** | `P0` | Block pickup of unpaid laundry for regular customers; permit pickup for customers with `boleh_bayar_akhir = true` and log receivable. |
| `FR-010` | **Public Web Profile Landing Page** | `P0` | Render responsive public landing page at `/` with hero, AI washing machine imagery, service showcase, process steps, live tracking widget, and call-to-action buttons. |
| `FR-011` | **Production Floor Mobile Ergonomics** | `P0` | Optimize `/produksi` for mobile devices: horizontal scrolling stage filter pills, tactile cards, large touch targets (>= 44px), and responsive action sheets. |
| `FR-012` | **Professional UI/UX Redesign** | `P1` | Modernize `/audit`, `/produksi`, and application shells with refined typography, modern card elevations, clear table contrast, and consistent status indicators. |
| `FR-013` | **Copyright by Yoga Attribution** | `P0` | Display official copyright notice "Copyright © 2026 CleanWash • Developed by Yoga. All rights reserved." in layouts, landing page, and printable receipts. |

## 4. Non-Functional Requirements

| ID | Category | Requirement | Target / Verification |
| :--- | :--- | :--- | :--- |
| `NFR-001` | **Mobile Responsiveness** | Flawless rendering on `375px` to `430px` mobile screens without horizontal scroll. | Playwright mobile viewports test exits 0. |
| `NFR-002` | **Visual Contrast & A11y** | WCAG 2.1 AA compliant text contrast (>= 4.5:1 for body, >= 3:1 for large UI components). | Automated CSS audits and visual checks. |
| `NFR-003` | **Type Safety & Build** | Strict TypeScript compilation with zero errors across all Inertia components. | `npx tsc --noEmit` exits 0. |
| `NFR-004` | **Test Coverage** | Comprehensive automated Pest/PHPUnit tests for all business formulas and edge cases. | `php artisan test` 100% pass rate. |
| `NFR-005` | **Asset & Image Optimization** | High-definition AI generated images loaded responsively with web-friendly formats. | Fast initial paint and zero broken image tags. |
