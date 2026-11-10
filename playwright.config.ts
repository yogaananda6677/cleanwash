import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: false,
    workers: 1,
    retries: 0,
    timeout: 180_000,
    expect: {
        timeout: 12_000,
    },
    reporter: [['list']],
    use: {
        baseURL: 'http://127.0.0.1:8000',
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        timezoneId: 'Asia/Jakarta',
        locale: 'id-ID',
        actionTimeout: 15_000,
        navigationTimeout: 30_000,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
});
