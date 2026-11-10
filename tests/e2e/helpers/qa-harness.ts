import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, type Locator, type Page, type Response } from '@playwright/test';

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.resolve(CURRENT_DIR, '..', '..', '..');
export const SCREENSHOTS_DIR = path.join(PROJECT_ROOT, 'docs', 'qa', 'screenshots');

export type StaffRole = 'PETUGAS' | 'PEGAWAI' | 'PENGANTAR';

export const STAFF_CREDENTIALS: Record<
    StaffRole,
    { email: string; password: string; name: string }
> = {
    PETUGAS: {
        email: 'petugas@cleanwash.local',
        password: 'password',
        name: 'Rina Kasir',
    },
    PEGAWAI: {
        email: 'pegawai@cleanwash.local',
        password: 'password',
        name: 'Budi Produksi',
    },
    PENGANTAR: {
        email: 'kurir@cleanwash.local',
        password: 'password',
        name: 'Andi Kurir',
    },
};

export interface RuntimeMonitor {
    consoleErrors: string[];
    pageErrors: string[];
    httpFailures: Array<{ url: string; status: number; method: string }>;
    runAllowingHttpStatuses<T>(
        statuses: number[],
        action: () => Promise<T>,
    ): Promise<T>;
    assertClean(contextLabel: string): void;
    dispose(): void;
}

export function verifyLiveServerReachable(): void {
    const statusCode = execSync(
        'curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/login',
        { cwd: PROJECT_ROOT, encoding: 'utf-8' },
    ).trim();

    if (statusCode !== '200') {
        throw new Error(
            `Live CleanWash server at http://127.0.0.1:8000/login returned HTTP ${statusCode}. Ensure the web server and cleanwash-mysql are running before executing QA regression.`,
        );
    }
}

export function resetAndSeedDatabase(): void {
    execSync('php artisan migrate:fresh --seed --no-interaction', {
        cwd: PROJECT_ROOT,
        stdio: 'pipe',
        encoding: 'utf-8',
    });
}

export function ensureScreenshotsDirClean(): void {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

export function jakartaDatePlusDays(days: number): string {
    const target = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(target);
}

export function attachRuntimeMonitor(page: Page): RuntimeMonitor {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const httpFailures: Array<{ url: string; status: number; method: string }> =
        [];
    const allowedStatusesStack: number[][] = [];

    const isAllowedStatus = (status: number): boolean =>
        allowedStatusesStack.some((group) => group.includes(status));

    const handleConsole = (msg: { type(): string; text(): string }) => {
        if (msg.type() !== 'error') {
            return;
        }

        const text = msg.text();
        const resourceMatch =
            /Failed to load resource: the server responded with a status of (\d{3})/.exec(
                text,
            );
        if (resourceMatch) {
            const code = Number.parseInt(resourceMatch[1], 10);
            if (isAllowedStatus(code) && code !== 419 && code < 500) {
                return;
            }
        }

        consoleErrors.push(text);
    };

    const handlePageError = (error: Error) => {
        pageErrors.push(`${error.name}: ${error.message}`);
    };

    const handleResponse = (response: Response) => {
        const status = response.status();
        if (status < 400) {
            return;
        }

        if (status === 419 || status >= 500) {
            httpFailures.push({
                url: response.url(),
                status,
                method: response.request().method(),
            });
            return;
        }

        if (!isAllowedStatus(status)) {
            httpFailures.push({
                url: response.url(),
                status,
                method: response.request().method(),
            });
        }
    };

    page.on('console', handleConsole);
    page.on('pageerror', handlePageError);
    page.on('response', handleResponse);

    return {
        consoleErrors,
        pageErrors,
        httpFailures,
        async runAllowingHttpStatuses<T>(
            statuses: number[],
            action: () => Promise<T>,
        ): Promise<T> {
            allowedStatusesStack.push(statuses);
            try {
                return await action();
            } finally {
                allowedStatusesStack.pop();
            }
        },
        assertClean(contextLabel: string): void {
            expect(
                consoleErrors,
                `[${contextLabel}] Expected 0 console.error entries`,
            ).toEqual([]);
            expect(
                pageErrors,
                `[${contextLabel}] Expected 0 uncaught pageerror entries`,
            ).toEqual([]);
            expect(
                httpFailures,
                `[${contextLabel}] Expected 0 unexpected HTTP >=400 / 419 / >=500 responses`,
            ).toEqual([]);
        },
        dispose(): void {
            page.off('console', handleConsole);
            page.off('pageerror', handlePageError);
            page.off('response', handleResponse);
        },
    };
}

export async function waitForPageReady(page: Page): Promise<void> {
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(async () => {
        await document.fonts.ready;
    });
    await page.waitForTimeout(150);
}

export async function captureScreenshot(
    page: Page,
    fileName: string,
    options: { fullPage?: boolean } = {},
): Promise<string> {
    ensureScreenshotsDirClean();
    await waitForPageReady(page);
    const fullPath = path.join(SCREENSHOTS_DIR, fileName);
    await page.screenshot({
        path: fullPath,
        fullPage: options.fullPage ?? true,
    });
    return fullPath;
}

export async function loginAs(page: Page, role: StaffRole): Promise<void> {
    const creds = STAFF_CREDENTIALS[role];
    if (!page.url().includes('/login')) {
        await page.goto('/login');
    }
    await page.getByLabel('Alamat Email').fill(creds.email);
    await page.getByLabel('Kata Sandi').fill(creds.password);
    await Promise.all([
        page.waitForURL('**/dashboard'),
        page.getByRole('button', { name: 'Masuk' }).click(),
    ]);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText(`Selamat bertugas, ${creds.name}`)).toBeVisible();
}

export async function logout(page: Page): Promise<void> {
    const logoutBtn = page.getByRole('button', { name: /Keluar/ });
    await expect(logoutBtn).toBeVisible();
    await Promise.all([
        page.waitForURL('**/login'),
        logoutBtn.click(),
    ]);
    await expect(page.getByRole('button', { name: 'Masuk' })).toBeVisible();
}

export async function selectOptionByText(
    selectLocator: Locator,
    textSubstring: string,
): Promise<string> {
    const optionValue = await selectLocator
        .locator('option')
        .evaluateAll((options, query) => {
            const match = options.find((opt) =>
                (opt.textContent ?? '').includes(query),
            );
            return match ? (match as HTMLOptionElement).value : '';
        }, textSubstring);

    if (!optionValue) {
        throw new Error(
            `Could not find <option> containing text "${textSubstring}"`,
        );
    }

    await selectLocator.selectOption(optionValue);
    return optionValue;
}

export function extractNotaFromUrl(url: string): string {
    const match = /\/transaksi\/(CW-\d{8}-\d{4})(?:\/|$)/.exec(url);
    if (!match) {
        throw new Error(`Could not extract nomor_nota from URL: ${url}`);
    }
    return match[1];
}

export function extractPengantaranIdFromUrl(url: string): string {
    const match = /\/pengantaran\/(\d+)(?:\/|$)/.exec(url);
    if (!match) {
        throw new Error(`Could not extract id_pengantaran from URL: ${url}`);
    }
    return match[1];
}

export async function createTransaksiViaUi(
    page: Page,
    params: {
        pelangganText: string;
        layananText: string;
        kuantitas: string;
        items: Array<{
            jenis_pakaian: string;
            jumlah_potong: string;
            kondisi_pakaian: string;
        }>;
        voucherCode?: string;
        dpMode?: 'ZERO' | 'HALF' | 'FULL' | { custom: string };
        catatan?: string;
    },
): Promise<string> {
    await page.goto('/transaksi/create');
    await expect(
        page.getByRole('heading', { name: 'Penerimaan Nota Baru' }),
    ).toBeVisible();

    await selectOptionByText(page.getByLabel('Pelanggan'), params.pelangganText);
    await selectOptionByText(
        page.getByLabel('Jenis Layanan (Aktif)'),
        params.layananText,
    );
    await page.locator('#transaksi-kuantitas').fill(params.kuantitas);

    for (let index = 0; index < params.items.length; index += 1) {
        if (index > 0) {
            await page.getByRole('button', { name: '+ Tambah Item' }).click();
        }
        const item = params.items[index];
        await page.locator(`#detail-jenis-${index}`).fill(item.jenis_pakaian);
        await page.locator(`#detail-potong-${index}`).fill(item.jumlah_potong);
        await page.locator(`#detail-kondisi-${index}`).fill(item.kondisi_pakaian);
    }

    if (params.voucherCode) {
        await page.locator('#transaksi-voucher').fill(params.voucherCode);
        await page.getByRole('button', { name: 'Cek Voucher' }).click();
        await expect(
            page.getByText(new RegExp(`Voucher\\s+${params.voucherCode}\\s+valid!`, 'i')),
        ).toBeVisible();
    }

    if (params.dpMode === 'ZERO') {
        await page.getByRole('button', { name: 'Rp 0' }).click();
    } else if (params.dpMode === 'HALF') {
        await page.getByRole('button', { name: '50%' }).click();
    } else if (params.dpMode === 'FULL') {
        await page.getByRole('button', { name: 'Lunas', exact: true }).click();
    } else if (params.dpMode && typeof params.dpMode === 'object') {
        await page.locator('#transaksi-dp').fill(params.dpMode.custom);
    }

    if (params.catatan) {
        await page.locator('#transaksi-catatan').fill(params.catatan);
    }

    await Promise.all([
        page.waitForURL(/\/transaksi\/CW-\d{8}-\d{4}$/),
        page.getByRole('button', { name: 'Terbitkan Nota & Simpan' }).click(),
    ]);

    return extractNotaFromUrl(page.url());
}

export async function advanceProduksiToStage(
    page: Page,
    nomorNota: string,
    stages: Array<'DICUCI' | 'DIKERINGKAN' | 'DISETRIKA' | 'SELESAI'>,
): Promise<void> {
    await page.goto('/produksi');
    await page.getByLabel('Cari Nota / Pelanggan').fill(nomorNota);
    await page.getByRole('button', { name: 'Terapkan Filter' }).click();

    const card = page.locator('article').filter({ hasText: nomorNota }).first();
    await expect(card).toBeVisible();

    const stageLabelMap: Record<
        'DICUCI' | 'DIKERINGKAN' | 'DISETRIKA' | 'SELESAI',
        string
    > = {
        DICUCI: 'Lanjut ke Dicuci',
        DIKERINGKAN: 'Lanjut ke Dikeringkan',
        DISETRIKA: 'Lanjut ke Disetrika',
        SELESAI: 'Lanjut ke Selesai',
    };

    for (const nextStage of stages) {
        if ((await card.count()) === 0) {
            await page.getByLabel('Cari Nota / Pelanggan').fill(nomorNota);
            await page.getByRole('button', { name: 'Terapkan Filter' }).click();
            await expect(card).toBeVisible();
        }

        await card.getByRole('button', { name: new RegExp(stageLabelMap[nextStage]) }).click();
        await expect(
            page.getByRole('status').filter({
                hasText: `berhasil diperbarui ke ${nextStage}`,
            }),
        ).toBeVisible();

        if (nextStage === 'SELESAI') {
            break;
        }
    }
}
