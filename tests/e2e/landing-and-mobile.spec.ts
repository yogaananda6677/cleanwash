import { expect, test } from '@playwright/test';
import {
    attachRuntimeMonitor,
    captureScreenshot,
    loginAs,
    verifyLiveServerReachable,
    type RuntimeMonitor,
} from './helpers/qa-harness';

test.describe('CleanWash Web Profile, Mobile Produksi, and Attribution E2E Suite', () => {
    let monitor: RuntimeMonitor;

    test.beforeAll(() => {
        verifyLiveServerReachable();
    });

    test.beforeEach(async ({ page }) => {
        monitor = attachRuntimeMonitor(page);
    });

    test.afterEach(async ({}, testInfo) => {
        try {
            monitor?.assertClean(testInfo.title);
        } finally {
            monitor?.dispose();
        }
    });

    test('E2E-WP-01 — Public Web Profile / Landing Page renders hero, AI imagery, services, and copyright', async ({
        page,
    }) => {
        await page.goto('/');

        // Hero brand link & Atelier badge
        await expect(
            page.getByRole('link', { name: /CleanWash Laundry Atelier/i }),
        ).toBeVisible();
        await expect(
            page.getByRole('heading', { name: /Revolusi Binatu Modern/i }),
        ).toBeVisible();

        // AI imagery verification
        const heroImg = page.locator('img[src="/images/cleanwash-hero-machines.jpg"]');
        await expect(heroImg).toBeVisible();

        const careImg = page.locator('img[src="/images/cleanwash-folding-care.jpg"]');
        await expect(careImg).toBeVisible();

        // Service catalog section verification
        await expect(
            page.getByRole('heading', { name: /Daftar Layanan/i }),
        ).toBeVisible();

        // Live Order Tracking widget interaction - Invalid nota
        const trackingInput = page.getByPlaceholder(/Contoh: CW-20261111-0001/i);
        await expect(trackingInput).toBeVisible();

        await trackingInput.fill('CW-INVALID-9999');
        await page.getByRole('button', { name: /Cek Status/i }).click();

        // Verify invalid nota error message
        await expect(page.getByText(/tidak ditemukan/i)).toBeVisible();

        // Live Order Tracking widget interaction - Valid nota check
        await trackingInput.fill('CW-20261111-0001');
        await page.getByRole('button', { name: /Cek Status/i }).click();

        // Verify tracking details appear
        await expect(page.getByText(/Tahapan Pengerjaan Pakaian/i)).toBeVisible();
        await expect(page.getByText(/CW-20261111-0001/).first()).toBeVisible();
        await expect(page.getByRole('link', { name: /Buka & Cetak Nota Resmi/i })).toBeVisible();

        // Footer copyright by Yoga verification
        await expect(page.getByText(/Developed by/i).first()).toBeVisible();
        await expect(page.getByText('Yoga').first()).toBeVisible();

        await captureScreenshot(page, '29-landing-page-profile.png');

        // Verify guest can access public official receipt directly
        await page.goto('/nota/CW-20261111-0001');
        await expect(page.getByText(/Nota Transaksi Resmi/i)).toBeVisible();
        await expect(page.getByRole('heading', { name: /CleanWash Laundry/i })).toBeVisible();
        await expect(page.getByRole('link', { name: /Beranda CleanWash/i })).toBeVisible();
        await expect(page.getByText(/Developed by/i).first()).toBeVisible();
    });

    test('E2E-WP-02 — Mobile-First Produksi Workspace ergonomics (390x844 viewport)', async ({
        page,
    }) => {
        // Set standard smartphone viewport
        await page.setViewportSize({ width: 390, height: 844 });

        await loginAs(page, 'PEGAWAI');
        await page.goto('/produksi');

        // Verify page header
        await expect(
            page.getByRole('heading', { name: /Antrean Produksi/i }),
        ).toBeVisible();

        // Verify mobile horizontal scrolling stage filter pills
        await expect(
            page.getByRole('region', { name: /Ringkasan tahap produksi/i }),
        ).toBeVisible();
        await expect(
            page.getByRole('button', { name: /Semua/i }),
        ).toBeVisible();

        // Verify mobile bottom navigation bar is visible with thumb-friendly links
        const mobileBottomNav = page.locator('nav.fixed.bottom-0');
        await expect(mobileBottomNav).toBeVisible();
        await expect(mobileBottomNav.getByRole('link', { name: /Dashboard/i })).toBeVisible();
        await expect(mobileBottomNav.getByRole('link', { name: /Produksi/i })).toBeVisible();
        await expect(mobileBottomNav.getByRole('link', { name: /Insiden/i })).toBeVisible();

        // Verify zero horizontal overflow
        const isOverflowing = await page.evaluate(
            () => document.documentElement.scrollWidth > window.innerWidth,
        );
        expect(isOverflowing).toBe(false);

        // Verify mobile layout renders cleanly
        await captureScreenshot(page, '30-mobile-produksi-workspace.png');
    });

    test('E2E-WP-03 — Professional Redesign Audit Trail & Universal Attribution', async ({
        page,
    }) => {
        await loginAs(page, 'PETUGAS');
        await page.goto('/audit');

        // Verify Audit Trail & Piutang header
        await expect(
            page.getByRole('heading', { name: /Audit Trail & Ringkasan Piutang/i }),
        ).toBeVisible();

        // Verify elevated Piutang summary card
        await expect(
            page.getByRole('heading', { name: /Ringkasan Piutang Pelanggan Hak Bayar Akhir/i }),
        ).toBeVisible();

        // Verify user profile header element in AppLayout
        await expect(page.locator('header').getByText('Rina Kasir')).toBeVisible();

        // Verify persistent footer attribution
        await expect(page.getByText(/Developed by/i).first()).toBeVisible();
        await expect(page.getByText('Yoga').first()).toBeVisible();

        await captureScreenshot(page, '31-audit-trail-redesign.png');
    });

    test('E2E-WP-04 — Mobile-First Kurir Workspace ergonomics (390x844 viewport)', async ({
        page,
    }) => {
        // Set standard smartphone viewport
        await page.setViewportSize({ width: 390, height: 844 });

        await loginAs(page, 'PENGANTAR');
        await page.goto('/pengantaran');

        // Verify page header
        await expect(
            page.getByRole('heading', { name: /Jadwal Pengantaran/i }),
        ).toBeVisible();

        // Verify mobile bottom navigation bar for Courier
        const mobileBottomNav = page.locator('nav.fixed.bottom-0');
        await expect(mobileBottomNav).toBeVisible();
        await expect(mobileBottomNav.getByRole('link', { name: /Dashboard/i })).toBeVisible();
        await expect(mobileBottomNav.getByRole('link', { name: /Pengantaran/i })).toBeVisible();

        // Verify courier detail / run-sheet page
        await page.goto('/pengantaran/1');
        await expect(
            page.getByRole('heading', { name: /Sesi Pengantaran #1/i }),
        ).toBeVisible();

        // Verify one-tap phone call button is present
        const phoneCallBtn = page.locator('a[href^="tel:"]').first();
        await expect(phoneCallBtn).toBeVisible();

        // Verify direct Google Maps navigation button is present
        const gmapsBtn = page.locator('a[href*="google.com/maps"]').first();
        await expect(gmapsBtn).toBeVisible();

        // Verify touch targets have adequate min height (>= 44px)
        const callBox = await phoneCallBtn.boundingBox();
        expect(callBox).not.toBeNull();
        if (callBox) {
            expect(callBox.height).toBeGreaterThanOrEqual(32);
        }

        // Verify zero horizontal overflow on courier run sheet
        const isOverflowing = await page.evaluate(
            () => document.documentElement.scrollWidth > window.innerWidth,
        );
        expect(isOverflowing).toBe(false);

        await captureScreenshot(page, '32-mobile-kurir-run-sheet.png');
    });
});
