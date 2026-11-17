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

        // Live Order Tracking widget interaction
        const trackingInput = page.getByPlaceholder(/Contoh: CW-20261111-0001/i);
        await expect(trackingInput).toBeVisible();

        await trackingInput.fill('CW-INVALID-9999');
        await page.getByRole('button', { name: /Cek Status/i }).click();

        // Verify invalid nota error message
        await expect(page.getByText(/tidak ditemukan/i)).toBeVisible();

        // Footer copyright by Yoga verification
        await expect(page.getByText(/Developed by/i).first()).toBeVisible();
        await expect(page.getByText('Yoga').first()).toBeVisible();

        await captureScreenshot(page, '29-landing-page-profile.png');
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
});
