# Dependency-Ordered Implementation Tasks

- **Project Name**: CleanWash Laundry Management System
- **Status**: ACTIVE
- **Last Updated**: 2026-11-17

> Execute tasks strictly in order. Do not mark `[x]` until implementation matches `docs/PRD.md` + `docs/ARCHITECTURE.md` AND verification commands pass.

## Task List

### [x] TASK-001: AI Laundry Imagery Generation & Asset Integration
- **Traces To**: `FR-010`, `ARCHITECTURE §1, §2`
- **Owner Subagent**: `agentsv2-frontend` / `ui-ux-designer`
- **Depends On**: `None`
- **Deliverables**:
  - High-resolution, professional AI-generated washing machine & laundry atelier images saved in `public/images/`.
  - Assets generated: `public/images/cleanwash-hero-machines.jpg`, `public/images/cleanwash-folding-care.jpg`.
- **Docs-Alignment & Verification Commands**:
  - `ls -lh public/images/cleanwash-*.jpg` (Verified: 2 images present and accessible)

### [x] TASK-002: Public Web Profile & Company Landing Page
- **Traces To**: `FR-010`, `FR-013`, `ARCHITECTURE §4`
- **Owner Subagent**: `agentsv2-frontend` / `fullstack-developer`
- **Depends On**: `TASK-001`
- **Deliverables**:
  - Landing controller `app/Http/Controllers/LandingController.php` with `index()` and `track()`.
  - Public landing page `resources/js/Pages/Welcome.tsx` featuring:
    - Atelier hero section with AI washing machine imagery and direct CTAs.
    - Quick Order Tracker Widget (`/lacak/{nota}`) and interactive status search.
    - Service catalog grid with speed tiers (`Reguler` vs `Express`) and pricing examples.
    - Active promotional voucher copy buttons.
    - Atelier details, operating hours, and location.
    - Prominent footer with "Copyright © 2026 CleanWash • Developed by Yoga. All rights reserved."
- **Docs-Alignment & Verification Commands**:
  - `npx tsc --noEmit` (0 errors)
  - `npm run build` (built `Welcome-DvEZa1N4.js` in 6.05s)
  - `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000/` (HTTP 200)

### [x] TASK-003: Mobile-First Production Queue Overhaul (`/produksi`)
- **Traces To**: `FR-011`, `ARCHITECTURE §4, ADR-014`
- **Owner Subagent**: `agentsv2-frontend` / `frontend-developer`
- **Depends On**: `TASK-002`
- **Deliverables**:
  - Overhaul `resources/js/Pages/Produksi/Index.tsx`:
    - Responsive stage counter bar: horizontal scrollable tactile pills on mobile (`overflow-x-auto`) with total count and stage counters.
    - Mobile-first single-column production card layout with clear visual hierarchy, large badge indicators, and item chips.
    - Full-width primary advance button at card bottom for mobile (`sm:hidden`) with large 48px touch target.
    - Ergonomic touch buttons for secondary actions (`Timbang Ulang`, `Laporkan Insiden`).
    - Horizontally scrollable workflow stepper (`overflow-x-auto no-scrollbar sm:flex-wrap`).
- **Docs-Alignment & Verification Commands**:
  - `npx tsc --noEmit` (0 errors)
  - `npm run build` (built `Index-DRrQV1kI.js` in 5.70s)

### [x] TASK-004: Professional UI Redesign for Audit Trail (`/audit`) & Management Shells
- **Traces To**: `FR-012`, `ARCHITECTURE §1, §4, ADR-012`
- **Owner Subagent**: `agentsv2-frontend` / `ui-ux-designer`
- **Depends On**: `TASK-003`
- **Deliverables**:
  - Redesign `resources/js/Pages/Audit/Index.tsx`:
    - Refine the paylater summary card (`Ringkasan Piutang Pelanggan Hak Bayar Akhir`) with modern gradient card, clear KPI chips, and sleek borders.
    - Elevated table styling with subtle zebra stripes, crisp hover states, monospace amounts (`font-mono tabular-nums`), and pill status chips.
    - Refined filter bar and interactive payload modal.
  - Polish `resources/js/Layouts/AppLayout.tsx`:
    - Refined topbar with user initial avatar chip, clean status pill, and glass/subtle elevation.
    - Persistent console footer with official Copyright by Yoga notice.
- **Docs-Alignment & Verification Commands**:
  - `npx tsc --noEmit` (0 errors)
  - `npm run build` (built `Audit/Index` and `AppLayout`)

### [x] TASK-005: Universal Copyright by Yoga Attribution
- **Traces To**: `FR-013`, `ARCHITECTURE §5, ADR-015`
- **Owner Subagent**: `agentsv2-frontend` / `frontend-developer`
- **Depends On**: `TASK-004`
- **Deliverables**:
  - Embedded footer attribution in `resources/js/Layouts/AppLayout.tsx`:
    `Copyright © 2026 CleanWash • Developed by Yoga • All rights reserved.`
  - Embedded attribution in `resources/js/Pages/Auth/Login.tsx` (desktop & mobile footers).
  - Embedded attribution in `resources/js/Pages/Transaksi/Nota.tsx` printable receipt footer.
  - Embedded attribution in `resources/js/Pages/Welcome.tsx` landing page footer.
- **Docs-Alignment & Verification Commands**:
  - `grep -rn "Developed by" resources/js/` (Verified across 4 key component locations)

### [x] TASK-006: Multi-Stage Quality Gate & Regression Verification
- **Traces To**: `NFR-001`, `NFR-002`, `NFR-003`, `NFR-004`, `ARCHITECTURE §6`
- **Owner Subagent**: `agentsv2-reality-checker` / `qa-engineer`
- **Depends On**: `TASK-001`, `TASK-002`, `TASK-003`, `TASK-004`, `TASK-005`
- **Deliverables**:
  - Code styling verification: `./vendor/bin/pint --test` (Passed 100%, 0 issues)
  - Static type checking: `npx tsc --noEmit` (Passed 100%, 0 errors)
  - Production build: `npm run build` (Passed 100%, built in 5.56s)
  - Full Pest/PHPUnit test suite: `php artisan test` (Passed 100%, 114 tests, 4202 assertions)
  - Playwright live browser regression suite testing `/`, `/login`, `/produksi` (mobile viewport), and `/audit`.
  - Capture new screenshots verifying professional UI and mobile ergonomics.
- **Docs-Alignment & Verification Commands**:
  - `./vendor/bin/pint --test` (exit code 0)
  - `npx tsc --noEmit` (exit code 0)
  - `npm run build` (exit code 0)
  - `php artisan test` (exit code 0, 114 passed)
  - `npx playwright test tests/e2e/landing-and-mobile.spec.ts --reporter=list`

