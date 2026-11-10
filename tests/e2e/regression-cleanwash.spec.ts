import { expect, test } from '@playwright/test';
import {
    advanceProduksiToStage,
    attachRuntimeMonitor,
    captureScreenshot,
    createTransaksiViaUi,
    extractPengantaranIdFromUrl,
    jakartaDatePlusDays,
    loginAs,
    logout,
    resetAndSeedDatabase,
    selectOptionByText,
    verifyLiveServerReachable,
    type RuntimeMonitor,
} from './helpers/qa-harness';

interface RegressionState {
    nota1: string;
    sesi1: string;
    nota2: string;
    nota3A: string;
    nota3AReuse: string;
    nota3B: string;
    nota4A: string;
    nota4B: string;
    sesi4: string;
    sesi4Reschedule: string;
    nota5A: string;
    nota5B: string;
    sesi5: string;
}

const state: RegressionState = {
    nota1: '',
    sesi1: '',
    nota2: '',
    nota3A: '',
    nota3AReuse: '',
    nota3B: '',
    nota4A: '',
    nota4B: '',
    sesi4: '',
    sesi4Reschedule: '',
    nota5A: '',
    nota5B: '',
    sesi5: '',
};

test.describe.serial('CleanWash Live Browser Full Regression Suite', () => {
    let monitor: RuntimeMonitor;

    test.beforeAll(() => {
        verifyLiveServerReachable();
        resetAndSeedDatabase();
    });

    test.beforeEach(async ({ page }) => {
        monitor = attachRuntimeMonitor(page);
    });

    test.afterEach(async ({}, testInfo) => {
        try {
            monitor.assertClean(testInfo.title);
        } finally {
            monitor.dispose();
        }
    });

    test('REG-00 — Auth, Validasi Login, & RBAC Cross-Role', async ({ page }) => {
        await page.goto('/login');
        await expect(
            page.getByRole('heading', { name: 'CleanWash Laundry' }),
        ).toBeVisible();

        await page.getByLabel('Alamat Email').fill('petugas@cleanwash.local');
        await page.getByLabel('Kata Sandi').fill('password-salah-123');
        await page.getByRole('button', { name: 'Masuk' }).click();

        await expect(page).toHaveURL(/\/login$/);
        const emailError = page.locator('form p.text-rose-600').first();
        await expect(emailError).toBeVisible();
        await expect(emailError).not.toHaveText('');
        await captureScreenshot(page, '01-login-invalid-password.png');

        await loginAs(page, 'PETUGAS');
        await expect(
            page.getByRole('link', { name: 'Dashboard' }),
        ).toHaveAttribute('aria-current', 'page');
        for (const label of [
            'Penerimaan Baru',
            'Transaksi',
            'Insiden & Kompensasi',
            'Pelanggan',
            'Jenis Layanan',
            'Voucher',
            'Pengantaran',
            'Serah Terima',
            'Audit & Piutang',
        ]) {
            await expect(
                page.getByRole('link', { name: label, exact: true }),
            ).toBeVisible();
        }
        await captureScreenshot(page, '02-dashboard-petugas.png');

        await monitor.runAllowingHttpStatuses([403], async () => {
            const response = await page.goto('/produksi');
            expect(response?.status()).toBe(403);
        });

        await page.goto('/dashboard');
        await logout(page);

        await loginAs(page, 'PEGAWAI');
        await expect(page.getByText('Antrean Transaksi Aktif')).toBeVisible();
        await expect(page.getByText('Perlu Timbang Ulang')).toBeVisible();

        await monitor.runAllowingHttpStatuses([403], async () => {
            const response = await page.goto('/pelanggan');
            expect(response?.status()).toBe(403);
        });

        await page.goto('/dashboard');
        await logout(page);

        await loginAs(page, 'PENGANTAR');
        await expect(page.getByText('Jadwal Pengantaran Aktif')).toBeVisible();
        await expect(page.getByText('Item Antar Aktif')).toBeVisible();
        await expect(page.getByText('Terkirim Hari Ini')).toBeVisible();
        await expect(
            page.getByText('Gagal Perlu Tindak Lanjut'),
        ).toBeVisible();
        await expect(
            page.getByRole('link', { name: 'Jadwal Pengantaran', exact: true }),
        ).toBeVisible();

        await captureScreenshot(page, '03-dashboard-kurir.png');

        await monitor.runAllowingHttpStatuses([403], async () => {
            const response = await page.goto('/pelanggan');
            expect(response?.status()).toBe(403);
        });

        await page.goto('/dashboard');
        await logout(page);
    });

    test('REG-01 — Cucian Kiloan + Master CRUD + Voucher (KK-03) + Naik Tarif (KK-09) + Timbang Ulang (KK-01) + Blokir Kurir (KK-06) + Pelunasan', async ({
        page,
    }) => {
        await loginAs(page, 'PETUGAS');

        // UC-03: Create active voucher REGRESI10K (retained active through end of suite)
        await page.goto('/voucher');
        await page.getByRole('button', { name: '+ Tambah Voucher' }).click();
        await page.getByLabel('Nomor / Kode Voucher').fill('REGRESI10K');
        await page.getByLabel('Nilai Potongan (Rp)').fill('10000');
        await page
            .getByLabel('Masa Berlaku (Tanggal Terakhir Berlaku)')
            .fill(jakartaDatePlusDays(60));
        await page.getByRole('button', { name: 'Simpan Voucher' }).click();

        await expect(
            page.getByRole('status').filter({ hasText: 'Voucher berhasil ditambahkan' }),
        ).toBeVisible();
        await expect(
            page.locator('tr').filter({ hasText: 'REGRESI10K' }),
        ).toBeVisible();

        // UC-04: Pelanggan CRUD (Create, Edit, and Delete temp record)
        await page.goto('/pelanggan');
        await page.getByRole('button', { name: '+ Tambah Pelanggan' }).click();
        await page.getByLabel('Nama Pelanggan').fill('Rudi Hartono');
        await page.getByLabel('Nomor Telepon').fill('081299998888');
        await page
            .getByLabel('Alamat Lengkap')
            .fill('Jl. Sudirman No. 10, Yogyakarta');
        await page.getByRole('button', { name: 'Simpan Pelanggan' }).click();
        await expect(
            page.locator('tr').filter({ hasText: 'Rudi Hartono' }),
        ).toBeVisible();

        await page
            .locator('tr')
            .filter({ hasText: 'Rudi Hartono' })
            .getByRole('button', { name: 'Edit' })
            .click();
        await page
            .getByLabel('Alamat Lengkap')
            .fill('Jl. Sudirman No. 10B, Sleman');
        await page.getByRole('button', { name: 'Simpan Perubahan' }).click();
        await expect(
            page
                .locator('tr')
                .filter({ hasText: 'Rudi Hartono' })
                .getByText('Jl. Sudirman No. 10B, Sleman'),
        ).toBeVisible();

        await page.getByRole('button', { name: '+ Tambah Pelanggan' }).click();
        await page.getByLabel('Nama Pelanggan').fill('Pelanggan Uji Hapus');
        await page.getByLabel('Nomor Telepon').fill('081200009999');
        await page.getByLabel('Alamat Lengkap').fill('Jl. Sementara No. 1');
        await page.getByRole('button', { name: 'Simpan Pelanggan' }).click();
        const tempRow = page
            .locator('tr')
            .filter({ hasText: 'Pelanggan Uji Hapus' });
        await expect(tempRow).toBeVisible();
        await tempRow.getByRole('button', { name: 'Hapus' }).click();
        await page.getByRole('button', { name: 'Ya, Hapus Pelanggan' }).click();
        await expect(tempRow).toHaveCount(0);

        // UC-06..UC-09 + KK-03: Create Nota 1 with EXPIRED15K test then HEMAT10K + full payment
        await page.goto('/transaksi/create');
        await selectOptionByText(page.getByLabel('Pelanggan'), 'Siti Aminah');
        await selectOptionByText(
            page.getByLabel('Jenis Layanan (Aktif)'),
            'Cuci Setrika (REGULER)',
        );
        await page.locator('#transaksi-kuantitas').fill('2.00');
        await page.locator('#detail-jenis-0').fill('Kemeja Kerja Putih');
        await page.locator('#detail-potong-0').fill('3');
        await page.locator('#detail-kondisi-0').fill('Baik');
        await page.getByRole('button', { name: '+ Tambah Item' }).click();
        await page.locator('#detail-jenis-1').fill('Celana Bahan Hitam');
        await page.locator('#detail-potong-1').fill('2');
        await page
            .locator('#detail-kondisi-1')
            .fill('Noda ringan di bagian bawah');

        await page.locator('#transaksi-voucher').fill('EXPIRED15K');
        await monitor.runAllowingHttpStatuses([422], async () => {
            await page.getByRole('button', { name: 'Cek Voucher' }).click();
            await expect(
                page.getByRole('alert').filter({ hasText: /kedaluwarsa/i }),
            ).toBeVisible();
        });
        await captureScreenshot(page, '04-voucher-expired-kk03.png');

        await page.getByRole('button', { name: 'Kosongkan' }).click();
        await page.locator('#transaksi-voucher').fill('HEMAT10K');
        await page.getByRole('button', { name: 'Cek Voucher' }).click();
        await expect(page.getByText(/Voucher HEMAT10K valid!/i)).toBeVisible();

        await page.getByRole('button', { name: 'Lunas', exact: true }).click();
        await expect(page.locator('#transaksi-dp')).toHaveValue('6000.00');

        await Promise.all([
            page.waitForURL(/\/transaksi\/CW-\d{8}-\d{4}$/),
            page.getByRole('button', { name: 'Terbitkan Nota & Simpan' }).click(),
        ]);

        state.nota1 = /\/transaksi\/(CW-\d{8}-\d{4})/.exec(page.url())?.[1] ?? '';
        expect(state.nota1).toMatch(/^CW-\d{8}-\d{4}$/);

        await expect(page.getByText('Rp 6.000').first()).toBeVisible();
        await expect(page.getByText('HEMAT10K', { exact: true })).toBeVisible();
        await captureScreenshot(page, '05-transaksi-nota1-tersimpan-lunas.png');

        await page.getByRole('link', { name: 'Cetak Nota' }).click();
        await page.waitForURL(`**/transaksi/${state.nota1}/nota`);
        await expect(
            page.getByRole('heading', { name: 'CleanWash Laundry' }),
        ).toBeVisible();
        await expect(page.getByText(state.nota1).first()).toBeVisible();
        await expect(page.getByText('Rp 8.000/kg').first()).toBeVisible();
        await captureScreenshot(page, '06-nota1-cetak.png');

        // UC-05 + KK-09: Update Cuci Setrika REGULER tariff 8000 -> 9500
        await page.goto('/layanan');
        const layananRow = page
            .locator('tr')
            .filter({ hasText: 'Cuci Setrika' })
            .filter({ hasText: 'Reguler' });
        await layananRow.getByRole('button', { name: 'Edit' }).click();
        await page.getByLabel('Harga Satuan (Rp)').fill('9500');
        await page.getByRole('button', { name: 'Simpan Perubahan' }).click();
        await expect(layananRow.getByText('Rp 9.500/kg')).toBeVisible();
        await captureScreenshot(page, '07-layanan-ubah-tarif-9500.png');

        await page.goto(`/transaksi/${state.nota1}`);
        await expect(
            page.getByText('Imutabilitas Tarif Snapshot (KK-09)'),
        ).toBeVisible();
        await expect(page.getByText('Rp 8.000/kg').first()).toBeVisible();
        await captureScreenshot(page, '08-nota1-snapshot-kk09.png');

        await logout(page);

        // UC-11 & UC-12 (KK-01): Pegawai re-weighs 2.00 -> 3.50 kg, downgrades LUNAS -> BELUM_LUNAS
        await loginAs(page, 'PEGAWAI');
        await page.goto('/produksi');
        await page.getByLabel('Cari Nota / Pelanggan').fill(state.nota1);
        await page.getByRole('button', { name: 'Terapkan Filter' }).click();

        const nota1Card = page
            .locator('article')
            .filter({ hasText: state.nota1 })
            .first();
        await expect(nota1Card).toBeVisible();
        await nota1Card.getByRole('button', { name: 'Timbang Ulang' }).click();

        const timbangDialog = page.locator('dialog[open]');
        await expect(timbangDialog).toBeVisible();
        await timbangDialog.locator('input[name="berat_aktual"]').fill('3.50');
        await timbangDialog
            .locator('textarea[name="catatan"]')
            .fill('Berat aktual naik menjadi 3.50 kg di timbangan produksi');
        await expect(
            timbangDialog.getByText('Peringatan Status Pembayaran (KK-01)'),
        ).toBeVisible();
        await expect(timbangDialog.getByText('Rp 18.000')).toBeVisible();
        await captureScreenshot(page, '09-modal-timbang-ulang-kk01.png', {
            fullPage: false,
        });

        await timbangDialog
            .getByRole('button', { name: 'Simpan Berat Aktual' })
            .click();
        await expect(
            page.getByRole('status').filter({ hasText: 'berhasil disimpan' }),
        ).toBeVisible();
        await expect(nota1Card.getByText('3.50 kg')).toBeVisible();
        await expect(nota1Card.getByText('Rp 18.000')).toBeVisible();
        await expect(nota1Card.getByText('Belum Lunas')).toBeVisible();
        await captureScreenshot(
            page,
            '10-produksi-pasca-timbang-ulang-belum-lunas.png',
        );

        await advanceProduksiToStage(page, state.nota1, [
            'DICUCI',
            'DIKERINGKAN',
            'DISETRIKA',
            'SELESAI',
        ]);
        await logout(page);

        // KK-06 Courier block on BELUM_LUNAS regular customer -> Pelunasan -> Success
        await loginAs(page, 'PETUGAS');
        await page.goto('/pengantaran');
        await page
            .getByRole('button', { name: '+ Buat Jadwal Pengantaran' })
            .first()
            .click();
        const jadwalDialog = page.locator('dialog[open]');
        await selectOptionByText(
            jadwalDialog.locator('select[name="id_petugas_antar"]'),
            'Andi Kurir',
        );
        await jadwalDialog
            .locator('label')
            .filter({ hasText: state.nota1 })
            .locator('input[type="checkbox"]')
            .check();
        await Promise.all([
            page.waitForURL(/\/pengantaran\/\d+$/),
            jadwalDialog
                .getByRole('button', { name: 'Buat Jadwal (1 Nota)' })
                .click(),
        ]);
        state.sesi1 = extractPengantaranIdFromUrl(page.url());
        await logout(page);

        await loginAs(page, 'PENGANTAR');
        await page.goto(`/pengantaran/${state.sesi1}`);
        await page
            .getByRole('button', { name: 'Mulai Pengantaran' })
            .first()
            .click();
        await expect(
            page.getByRole('status').filter({ hasText: 'telah dimulai' }),
        ).toBeVisible();

        const sesi1Card = page
            .locator('article')
            .filter({ hasText: state.nota1 })
            .first();
        await sesi1Card
            .getByRole('button', { name: 'Ambil dari Outlet' })
            .click();
        await expect(sesi1Card.getByText('Diambil', { exact: true })).toBeVisible();
        await sesi1Card
            .getByRole('button', { name: 'Mulai Dalam Perjalanan' })
            .click();
        await expect(
            sesi1Card.getByText('Dalam Perjalanan', { exact: true }),
        ).toBeVisible();
        await expect(
            sesi1Card.getByText('Peringatan Wajib Lunas (KK-06)'),
        ).toBeVisible();

        await sesi1Card
            .getByRole('button', { name: 'Tandai Diterima Pelanggan' })
            .click();
        await expect(
            page.getByRole('alert').filter({ hasText: 'KK-06' }),
        ).toBeVisible();
        await expect(
            sesi1Card.getByText('Dalam Perjalanan', { exact: true }),
        ).toBeVisible();
        await captureScreenshot(page, '11-kurir-blokir-belum-lunas-kk06.png');

        await logout(page);

        // Petugas records pelunasan via PelunasanModal
        await loginAs(page, 'PETUGAS');
        await page.goto(`/transaksi/${state.nota1}`);
        await page.getByRole('button', { name: 'Catat Pelunasan' }).click();
        const pelunasanDialog = page.locator('dialog[open]');
        await expect(pelunasanDialog).toBeVisible();
        await expect(
            pelunasanDialog.locator('input[name="nominal_bayar"]'),
        ).toHaveValue('12000.00');
        await captureScreenshot(page, '12-modal-pelunasan-nota1.png', {
            fullPage: false,
        });

        await pelunasanDialog
            .getByRole('button', { name: 'Catat Pembayaran Pelunasan' })
            .click();
        await expect(
            page.getByRole('status').filter({ hasText: 'Pelunasan' }),
        ).toBeVisible();
        await expect(page.getByText('Lunas', { exact: true }).first()).toBeVisible();
        await logout(page);

        // Courier completes delivery
        await loginAs(page, 'PENGANTAR');
        await page.goto(`/pengantaran/${state.sesi1}`);
        await sesi1Card
            .getByRole('button', { name: 'Tandai Diterima Pelanggan' })
            .click();
        await expect(
            page.getByRole('status').filter({ hasText: 'DITERIMA' }),
        ).toBeVisible();
        await expect(sesi1Card.getByText('Diterima', { exact: true })).toBeVisible();
        await expect(sesi1Card.getByText('Diambil', { exact: true })).toBeVisible();
        await captureScreenshot(page, '13-kurir-sukses-diterima.png');

        await logout(page);
    });

    test('REG-02 — Cuci Sepatu (Tanpa Setrika) + Lapor Insiden (KK-04) + Konfirmasi Kasir', async ({
        page,
    }) => {
        await loginAs(page, 'PETUGAS');
        state.nota2 = await createTransaksiViaUi(page, {
            pelangganText: 'Dewi Lestari',
            layananText: 'Cuci Sepatu (REGULER)',
            kuantitas: '2',
            items: [
                {
                    jenis_pakaian: 'Sepatu Sneakers Putih',
                    jumlah_potong: '1',
                    kondisi_pakaian: 'Kotor lumpur di sol',
                },
                {
                    jenis_pakaian: 'Sepatu Running Hitam',
                    jumlah_potong: '1',
                    kondisi_pakaian: 'Baik',
                },
            ],
            dpMode: { custom: '15000' },
        });
        await logout(page);

        await loginAs(page, 'PEGAWAI');
        await page.goto('/produksi');
        await page.getByLabel('Cari Nota / Pelanggan').fill(state.nota2);
        await page.getByRole('button', { name: 'Terapkan Filter' }).click();

        const nota2Card = page
            .locator('article')
            .filter({ hasText: state.nota2 })
            .first();
        await expect(nota2Card).toBeVisible();
        await expect(nota2Card.getByText('Tanpa Setrika')).toBeVisible();
        await expect(nota2Card.getByText(/Disetrika/i)).toHaveCount(0);
        await captureScreenshot(page, '14-produksi-sepatu-tanpa-setrika.png');

        await advanceProduksiToStage(page, state.nota2, ['DICUCI']);

        await page.getByLabel('Cari Nota / Pelanggan').fill(state.nota2);
        await page.getByRole('button', { name: 'Terapkan Filter' }).click();
        await expect(nota2Card).toBeVisible();

        await nota2Card.getByRole('button', { name: 'Laporkan Insiden' }).click();
        const insidenDialog = page.locator('dialog[open]');
        await expect(insidenDialog).toBeVisible();
        await selectOptionByText(
            insidenDialog.locator('select[name="id_detail"]'),
            'Sepatu Sneakers Putih',
        );
        await insidenDialog
            .locator('input[name="jenis_insiden"][value="RUSAK"]')
            .check();
        await insidenDialog
            .locator('textarea[name="keterangan"]')
            .fill('Sol karet kanan terkelupas saat proses penggosokan awal');
        await expect(
            insidenDialog.getByText('MENUNGGU_KONFIRMASI'),
        ).toBeVisible();
        await captureScreenshot(page, '15-modal-lapor-insiden-rusak.png', {
            fullPage: false,
        });

        await insidenDialog
            .getByRole('button', { name: 'Ajukan Laporan Insiden' })
            .click();
        await expect(
            page.getByRole('status').filter({ hasText: 'berhasil' }),
        ).toBeVisible();

        await advanceProduksiToStage(page, state.nota2, ['DIKERINGKAN']);
        await page.getByLabel('Cari Nota / Pelanggan').fill(state.nota2);
        await page.getByRole('button', { name: 'Terapkan Filter' }).click();
        await expect(
            nota2Card.getByRole('button', { name: /Lanjut ke Selesai/ }),
        ).toBeVisible();
        await expect(
            nota2Card.getByRole('button', { name: /Disetrika/i }),
        ).toHaveCount(0);
        await advanceProduksiToStage(page, state.nota2, ['SELESAI']);
        await logout(page);

        await loginAs(page, 'PETUGAS');
        await page.goto('/dashboard');
        await expect(
            page.getByText('1 Insiden Menunggu Konfirmasi'),
        ).toBeVisible();
        await page.getByRole('link', { name: /Konfirmasi Sekarang/ }).click();
        await page.waitForURL(/\/insiden/);

        const insidenRow = page
            .locator('tr')
            .filter({ hasText: state.nota2 })
            .first();
        await expect(insidenRow).toBeVisible();
        await insidenRow
            .getByRole('button', { name: 'Konfirmasi & Potong Saldo' })
            .click();

        const konfirmasiDialog = page.locator('dialog[open]');
        await expect(konfirmasiDialog).toBeVisible();
        await konfirmasiDialog
            .locator('textarea[name="keterangan_konfirmasi"]')
            .fill('Disetujui sesuai kebijakan kompensasi kerusakan 5x item');
        await captureScreenshot(page, '16-modal-konfirmasi-kompensasi.png', {
            fullPage: false,
        });

        await konfirmasiDialog
            .getByRole('button', { name: 'Konfirmasi & Potong Saldo' })
            .click();
        await expect(
            page.getByRole('status').filter({ hasText: 'dikonfirmasi' }),
        ).toBeVisible();

        await page.goto(`/transaksi/${state.nota2}/nota`);
        await expect(
            page.getByText(/Rincian Laporan Insiden & Kompensasi/i),
        ).toBeVisible();
        await expect(
            page.getByText(
                'Sol karet kanan terkelupas saat proses penggosokan awal',
            ),
        ).toBeVisible();
        await expect(
            page.getByText('Terkonfirmasi', { exact: true }),
        ).toBeVisible();
        await captureScreenshot(page, '17-nota2-cetak-dengan-insiden.png');

        await page.getByRole('link', { name: '← Kembali ke Detail' }).click();
        await page.waitForURL(`**/transaksi/${state.nota2}`);
        await logout(page);
    });

    test('REG-03 — Ubah Layanan Cross-Method (KK-02) & Pembatalan Dua Cabang (KK-08)', async ({
        page,
    }) => {
        await loginAs(page, 'PETUGAS');

        // Branch A: Nota 3A with BERKAH5K cancelled free at DITERIMA -> voucher released & reused
        state.nota3A = await createTransaksiViaUi(page, {
            pelangganText: 'Siti Aminah',
            layananText: 'Cuci Setrika (REGULER)',
            kuantitas: '2.00',
            items: [
                {
                    jenis_pakaian: 'Jaket Denim',
                    jumlah_potong: '2',
                    kondisi_pakaian: 'Baik',
                },
            ],
            voucherCode: 'BERKAH5K',
            dpMode: 'ZERO',
        });

        await page
            .getByRole('button', { name: 'Batalkan Transaksi (KK-08)' })
            .click();
        const batalADialog = page.locator('dialog[open]');
        await expect(
            batalADialog.getByText(/Pembatalan Gratis \(Tahap DITERIMA/),
        ).toBeVisible();
        await expect(
            batalADialog.getByText(/BERKAH5K.*dilepas kembali/i),
        ).toBeVisible();
        await batalADialog
            .locator('textarea[name="alasan_pembatalan"]')
            .fill('Pelanggan membatalkan sebelum proses pencucian dimulai');
        await batalADialog
            .getByRole('button', { name: 'Konfirmasi Pembatalan' })
            .click();

        await expect(
            page.getByText('Transaksi Dibatalkan (KK-08)', { exact: true }),
        ).toBeVisible();
        await expect(page.getByText('Batal Gratis')).toHaveCount(0);
        await expect(page.getByText('Rp 0').first()).toBeVisible();
        await captureScreenshot(page, '18-nota3a-batal-gratis-diterima-kk08.png');

        state.nota3AReuse = await createTransaksiViaUi(page, {
            pelangganText: 'Dewi Lestari',
            layananText: 'Cuci Setrika (EXPRESS)',
            kuantitas: '1.00',
            items: [
                {
                    jenis_pakaian: 'Sprei Katun',
                    jumlah_potong: '1',
                    kondisi_pakaian: 'Baik',
                },
            ],
            voucherCode: 'BERKAH5K',
            dpMode: 'ZERO',
        });
        await expect(page.getByText('BERKAH5K', { exact: true })).toBeVisible();

        // Branch B: Create helper voucher PROMOBATAL5K (so REGRESI10K stays TERSEDIA), advance to DICUCI, cross-method change + post-wash cancel
        await page.goto('/voucher');
        await page.getByRole('button', { name: '+ Tambah Voucher' }).click();
        await page.getByLabel('Nomor / Kode Voucher').fill('PROMOBATAL5K');
        await page.getByLabel('Nilai Potongan (Rp)').fill('5000');
        await page
            .getByLabel('Masa Berlaku (Tanggal Terakhir Berlaku)')
            .fill(jakartaDatePlusDays(30));
        await page.getByRole('button', { name: 'Simpan Voucher' }).click();
        await expect(
            page.locator('tr').filter({ hasText: 'PROMOBATAL5K' }),
        ).toBeVisible();

        state.nota3B = await createTransaksiViaUi(page, {
            pelangganText: 'Siti Aminah',
            layananText: 'Cuci Setrika (EXPRESS)',
            kuantitas: '2.00',
            items: [
                {
                    jenis_pakaian: 'Sepatu & Jaket Khusus',
                    jumlah_potong: '2',
                    kondisi_pakaian: 'Noda debu',
                },
            ],
            voucherCode: 'PROMOBATAL5K',
            dpMode: 'ZERO',
        });
        await logout(page);

        await loginAs(page, 'PEGAWAI');
        await advanceProduksiToStage(page, state.nota3B, ['DICUCI']);
        await logout(page);

        await loginAs(page, 'PETUGAS');
        await page.goto(`/transaksi/${state.nota3B}`);
        await page.getByRole('button', { name: 'Ubah Layanan (KK-02)' }).click();
        const ubahDialog = page.locator('dialog[open]');
        await expect(ubahDialog).toBeVisible();
        await selectOptionByText(
            ubahDialog.locator('select[name="id_layanan_baru"]'),
            'Cuci Sepatu (EXPRESS)',
        );
        await ubahDialog
            .locator('input[name="berat_atau_jumlah_baru"]')
            .fill('2');
        await ubahDialog
            .locator('textarea[name="alasan_perubahan"]')
            .fill('Pelanggan meminta ganti ke Cuci Sepatu Express 2 pasang');
        await expect(ubahDialog.getByText('Rp 75.000')).toBeVisible();
        await captureScreenshot(
            page,
            '19-modal-ubah-layanan-cross-method-kk02.png',
            { fullPage: false },
        );

        await ubahDialog
            .getByRole('button', { name: 'Simpan Perubahan Layanan' })
            .click();
        await expect(
            page.getByRole('status').filter({ hasText: 'Layanan' }),
        ).toBeVisible();
        await expect(page.getByText('Cuci Sepatu').first()).toBeVisible();
        await expect(page.getByText('Rp 75.000').first()).toBeVisible();

        await page
            .getByRole('button', { name: 'Batalkan Transaksi (KK-08)' })
            .click();
        const batalBDialog = page.locator('dialog[open]');
        await expect(
            batalBDialog.getByText('Wajib Biaya Proses Berjalan (KK-08)'),
        ).toBeVisible();
        await expect(
            batalBDialog.locator('input[name="biaya_pembatalan"]'),
        ).toHaveValue('40000.00');
        await expect(
            batalBDialog.getByText(/PROMOBATAL5K.*SUDAH_DIGUNAKAN/),
        ).toBeVisible();
        await batalBDialog
            .locator('textarea[name="alasan_pembatalan"]')
            .fill('Pembatalan disetujui setelah proses pencucian berjalan');
        await batalBDialog
            .getByRole('button', { name: 'Konfirmasi Pembatalan' })
            .click();

        await expect(page.getByText('Dibatalkan', { exact: true }).first()).toBeVisible();
        await page.getByRole('link', { name: 'Cetak Nota' }).click();
        await page.waitForURL(`**/transaksi/${state.nota3B}/nota`);
        await expect(
            page.getByText('Status Pembatalan Transaksi'),
        ).toBeVisible();
        await expect(page.getByText('PROMOBATAL5K', { exact: true })).toBeVisible();
        await expect(page.getByText('Rp 40.000').first()).toBeVisible();
        await captureScreenshot(page, '20-nota3b-batal-pasca-cuci-kk08.png');

        await page.getByRole('link', { name: '← Kembali ke Detail' }).click();
        await page.waitForURL(`**/transaksi/${state.nota3B}`);
        await logout(page);
    });

    test('REG-04 — Pengantaran Multi-Pelanggan Gagal Antar + Reschedule Independen (KK-07) + Paylater Piutang (KK-06)', async ({
        page,
    }) => {
        await loginAs(page, 'PETUGAS');

        state.nota4A = await createTransaksiViaUi(page, {
            pelangganText: 'Dewi Lestari',
            layananText: 'Cuci Sepatu (REGULER)',
            kuantitas: '1',
            items: [
                {
                    jenis_pakaian: 'Sepatu Pantofel Kulit',
                    jumlah_potong: '1',
                    kondisi_pakaian: 'Baik',
                },
            ],
            dpMode: 'FULL',
        });

        state.nota4B = await createTransaksiViaUi(page, {
            pelangganText: 'Bapak Hendra Wijaya',
            layananText: 'Cuci Setrika (EXPRESS)',
            kuantitas: '3.00',
            items: [
                {
                    jenis_pakaian: 'Setelan Kemeja & Celana Kantor',
                    jumlah_potong: '6',
                    kondisi_pakaian: 'Baik',
                },
            ],
            dpMode: 'ZERO',
        });
        await logout(page);

        await loginAs(page, 'PEGAWAI');
        await advanceProduksiToStage(page, state.nota4A, [
            'DICUCI',
            'DIKERINGKAN',
            'SELESAI',
        ]);
        await advanceProduksiToStage(page, state.nota4B, [
            'DICUCI',
            'DIKERINGKAN',
            'DISETRIKA',
            'SELESAI',
        ]);
        await logout(page);

        await loginAs(page, 'PETUGAS');
        await page.goto('/pengantaran');
        await page
            .getByRole('button', { name: '+ Buat Jadwal Pengantaran' })
            .first()
            .click();

        const jadwalDialog = page.locator('dialog[open]');
        await selectOptionByText(
            jadwalDialog.locator('select[name="id_petugas_antar"]'),
            'Andi Kurir',
        );
        await jadwalDialog
            .locator('label')
            .filter({ hasText: state.nota4A })
            .locator('input[type="checkbox"]')
            .check();
        await jadwalDialog
            .locator('label')
            .filter({ hasText: state.nota4B })
            .locator('input[type="checkbox"]')
            .check();
        await expect(
            jadwalDialog.getByText(/2 nota,\s*2 pelanggan/),
        ).toBeVisible();
        await captureScreenshot(page, '21-modal-buat-jadwal-multi-pelanggan.png', {
            fullPage: false,
        });

        await Promise.all([
            page.waitForURL(/\/pengantaran\/\d+$/),
            jadwalDialog
                .getByRole('button', { name: 'Buat Jadwal (2 Nota)' })
                .click(),
        ]);
        state.sesi4 = extractPengantaranIdFromUrl(page.url());
        await logout(page);

        await loginAs(page, 'PENGANTAR');
        await page.goto(`/pengantaran/${state.sesi4}`);
        await page
            .getByRole('button', { name: 'Mulai Pengantaran' })
            .first()
            .click();

        const card4A = page
            .locator('article')
            .filter({ hasText: state.nota4A })
            .first();
        await card4A.getByRole('button', { name: 'Ambil dari Outlet' }).click();
        await expect(card4A.getByText('Diambil', { exact: true })).toBeVisible();
        await card4A
            .getByRole('button', { name: 'Mulai Dalam Perjalanan' })
            .click();
        await expect(
            card4A.getByText('Dalam Perjalanan', { exact: true }),
        ).toBeVisible();
        await card4A
            .getByRole('button', { name: 'Tandai Diterima Pelanggan' })
            .click();
        await expect(card4A.getByText('Diterima', { exact: true })).toBeVisible();

        const card4B = page
            .locator('article')
            .filter({ hasText: state.nota4B })
            .first();
        await card4B.getByRole('button', { name: 'Ambil dari Outlet' }).click();
        await expect(card4B.getByText('Diambil', { exact: true })).toBeVisible();
        await card4B
            .getByRole('button', { name: 'Mulai Dalam Perjalanan' })
            .click();
        await expect(
            card4B.getByText('Dalam Perjalanan', { exact: true }),
        ).toBeVisible();
        await card4B.getByRole('button', { name: 'Tandai Gagal' }).click();

        const failDialog = page.locator('dialog[open]');
        await failDialog
            .locator('textarea[name="alasan_gagal"]')
            .fill('Pelanggan sedang tidak berada di rumah');
        await failDialog
            .getByRole('button', { name: 'Simpan Status Gagal' })
            .click();

        await expect(
            card4B.getByText('Pelanggan sedang tidak berada di rumah'),
        ).toBeVisible();
        await expect(card4A.getByText('Diterima', { exact: true })).toBeVisible();

        await card4B
            .getByRole('button', { name: 'Jadwalkan Ulang (KK-07)' })
            .click();
        const rescheduleDialog = page.locator('dialog[open]');
        await expect(rescheduleDialog).toBeVisible();
        await captureScreenshot(page, '22-modal-jadwalkan-ulang-kk07.png', {
            fullPage: false,
        });

        await Promise.all([
            page.waitForURL((url) => {
                const match = url.pathname.match(/\/pengantaran\/(\d+)$/);
                return Boolean(match && match[1] !== state.sesi4);
            }),
            rescheduleDialog
                .getByRole('button', { name: 'Buat Jadwal Ulang' })
                .click(),
        ]);
        state.sesi4Reschedule = extractPengantaranIdFromUrl(page.url());
        expect(state.sesi4Reschedule).not.toBe(state.sesi4);

        // Verify sibling isolation in original session
        await page.goto(`/pengantaran/${state.sesi4}`);
        await expect(card4A.getByText('Diterima', { exact: true })).toBeVisible();
        await expect(
            card4B.getByText('Sudah dijadwalkan ulang pada sesi lain.'),
        ).toBeVisible();

        // Deliver Nota 4B on rescheduled session with boleh_bayar_akhir = true (KK-06)
        await page.goto(`/pengantaran/${state.sesi4Reschedule}`);
        await page
            .getByRole('button', { name: 'Mulai Pengantaran' })
            .first()
            .click();
        const card4BResched = page
            .locator('article')
            .filter({ hasText: state.nota4B })
            .first();
        await card4BResched
            .getByRole('button', { name: 'Ambil dari Outlet' })
            .click();
        await card4BResched
            .getByRole('button', { name: 'Mulai Dalam Perjalanan' })
            .click();
        await expect(
            card4BResched.getByText('Hak Bayar Akhir Aktif (KK-06)'),
        ).toBeVisible();
        await card4BResched
            .getByRole('button', { name: 'Tandai Diterima Pelanggan' })
            .click();

        await expect(
            card4BResched.getByText('Diterima', { exact: true }),
        ).toBeVisible();
        await expect(
            card4BResched.getByText('Belum Lunas', { exact: true }),
        ).toBeVisible();
        await captureScreenshot(page, '23-kurir-serah-terima-paylater-kk06.png');

        await logout(page);

        // Petugas checks Piutang tab & Audit page, then settles piutang
        await loginAs(page, 'PETUGAS');
        await page.goto('/serah-terima?mode=PIUTANG');
        const piutangRow = page
            .locator('tr')
            .filter({ hasText: state.nota4B })
            .first();
        await expect(piutangRow).toBeVisible();
        await expect(
            piutangRow.getByText('Boleh Bayar Akhir', { exact: true }),
        ).toBeVisible();
        await expect(
            piutangRow.getByText('Belum Lunas', { exact: true }),
        ).toBeVisible();
        await captureScreenshot(page, '24-serah-terima-tab-piutang.png');

        await page.goto('/audit');
        await expect(
            page.getByText('Ringkasan Piutang Pelanggan Hak Bayar Akhir (KK-06)'),
        ).toBeVisible();
        await expect(
            page.locator('tr').filter({ hasText: state.nota4B }).first(),
        ).toBeVisible();
        await expect(
            page.getByText('PENGANTARAN_RESCHEDULED', { exact: true }).first(),
        ).toBeVisible();
        await captureScreenshot(page, '25-audit-piutang-dan-trail.png');

        await page.goto('/serah-terima?mode=PIUTANG');
        await piutangRow
            .getByRole('button', { name: /Catat\s*Pelunasan/ })
            .click();
        const pelunasanDialog = page.locator('dialog[open]');
        await expect(
            pelunasanDialog.locator('input[name="nominal_bayar"]'),
        ).toHaveValue('42000.00');
        await pelunasanDialog
            .getByRole('button', { name: 'Catat Pembayaran Pelunasan' })
            .click();
        await expect(
            page.getByRole('status').filter({ hasText: 'Pelunasan' }),
        ).toBeVisible();
        await expect(
            page.locator('tr').filter({ hasText: state.nota4B }),
        ).toHaveCount(0);

        await logout(page);
    });

    test('REG-05 — Loket /serah-terima, Anti-Konflik Kurir, & Mobile Viewport (390×844)', async ({
        page,
    }) => {
        await loginAs(page, 'PETUGAS');
        state.nota5A = await createTransaksiViaUi(page, {
            pelangganText: 'Siti Aminah',
            layananText: 'Cuci Sepatu (REGULER)',
            kuantitas: '1',
            items: [
                {
                    jenis_pakaian: 'Sepatu Slip On',
                    jumlah_potong: '1',
                    kondisi_pakaian: 'Baik',
                },
            ],
            dpMode: 'FULL',
        });
        state.nota5B = await createTransaksiViaUi(page, {
            pelangganText: 'Dewi Lestari',
            layananText: 'Cuci Sepatu (REGULER)',
            kuantitas: '1',
            items: [
                {
                    jenis_pakaian: 'Sepatu Boots Kulit',
                    jumlah_potong: '1',
                    kondisi_pakaian: 'Baik',
                },
            ],
            dpMode: 'FULL',
        });
        await logout(page);

        await loginAs(page, 'PEGAWAI');
        await advanceProduksiToStage(page, state.nota5A, [
            'DICUCI',
            'DIKERINGKAN',
            'SELESAI',
        ]);
        await advanceProduksiToStage(page, state.nota5B, [
            'DICUCI',
            'DIKERINGKAN',
            'SELESAI',
        ]);
        await logout(page);

        await loginAs(page, 'PETUGAS');
        await page.goto('/pengantaran');
        await page
            .getByRole('button', { name: '+ Buat Jadwal Pengantaran' })
            .first()
            .click();
        const jadwalDialog = page.locator('dialog[open]');
        await selectOptionByText(
            jadwalDialog.locator('select[name="id_petugas_antar"]'),
            'Andi Kurir',
        );
        await jadwalDialog
            .locator('label')
            .filter({ hasText: state.nota5A })
            .locator('input[type="checkbox"]')
            .check();
        await jadwalDialog
            .locator('label')
            .filter({ hasText: state.nota5B })
            .locator('input[type="checkbox"]')
            .check();
        await Promise.all([
            page.waitForURL(/\/pengantaran\/\d+$/),
            jadwalDialog
                .getByRole('button', { name: 'Buat Jadwal (2 Nota)' })
                .click(),
        ]);
        state.sesi5 = extractPengantaranIdFromUrl(page.url());

        // Handover Nota 5A at loket while MENUNGGU (auto-closes item MENUNGGU -> GAGAL)
        await page.goto('/serah-terima');
        const row5A = page
            .locator('tr')
            .filter({ hasText: state.nota5A })
            .first();
        await expect(row5A).toBeVisible();
        await row5A
            .getByRole('button', { name: 'Serah Terima', exact: true })
            .click();

        const serahDialog = page.locator('dialog[open]');
        await expect(
            serahDialog.getByText('Penutupan Otomatis Jadwal Kurir (MENUNGGU)'),
        ).toBeVisible();
        await serahDialog
            .getByRole('button', { name: 'Konfirmasi Serah Terima' })
            .click();
        await expect(
            page.getByRole('status').filter({ hasText: state.nota5A }),
        ).toBeVisible();

        await page.goto(`/transaksi/${state.nota5A}`);
        await expect(
            page.getByText('Diambil', { exact: true }).first(),
        ).toBeVisible();
        await expect(
            page.getByText(/Diambil langsung oleh pelanggan di loket kasir\./).first(),
        ).toBeVisible();
        await captureScreenshot(page, '26-serah-terima-loket-nota5a.png');
        await logout(page);

        // Handover of Nota 5A auto-closed item 5A (MENUNGGU -> GAGAL) and moved session to BERJALAN
        await loginAs(page, 'PENGANTAR');
        await page.goto(`/pengantaran/${state.sesi5}`);
        await expect(
            page.getByText('Berjalan', { exact: true }).first(),
        ).toBeVisible();
        const card5A = page
            .locator('article')
            .filter({ hasText: state.nota5A })
            .first();
        await expect(card5A.getByText('Gagal', { exact: true })).toBeVisible();
        await expect(
            card5A.getByText(/Diambil langsung oleh pelanggan di loket kasir\./),
        ).toBeVisible();

        const card5B = page
            .locator('article')
            .filter({ hasText: state.nota5B })
            .first();
        await card5B.getByRole('button', { name: 'Ambil dari Outlet' }).click();
        await expect(card5B.getByText('Diambil', { exact: true })).toBeVisible();
        await logout(page);

        // Petugas sees loket handover blocked for Nota 5B while DIAMBIL by courier
        await loginAs(page, 'PETUGAS');
        await page.goto(`/transaksi/${state.nota5B}`);
        await expect(
            page.getByText(/Sedang Diantar Kurir \(DIAMBIL\)/).first(),
        ).toBeVisible();
        await expect(
            page.getByRole('button', { name: /Serah Terima Loket/ }),
        ).toHaveCount(0);

        await page.goto('/serah-terima');
        const row5B = page
            .locator('tr')
            .filter({ hasText: state.nota5B })
            .first();
        await row5B.getByRole('button', { name: 'Info Kurir Aktif' }).click();
        const blockedDialog = page.locator('dialog[open]');
        await expect(
            blockedDialog.getByText('Sedang Dibawa Kurir Pengantaran'),
        ).toBeVisible();
        await expect(
            blockedDialog.getByRole('button', {
                name: 'Konfirmasi Serah Terima',
            }),
        ).toBeDisabled();
        await captureScreenshot(
            page,
            '27-blokir-serah-terima-loket-kurir-aktif.png',
            { fullPage: false },
        );
        await blockedDialog
            .getByRole('button', { name: 'Tutup', exact: true })
            .click();
        await logout(page);

        // Courier completes Nota 5B -> DITERIMA
        await loginAs(page, 'PENGANTAR');
        await page.goto(`/pengantaran/${state.sesi5}`);
        await card5B
            .getByRole('button', { name: 'Mulai Dalam Perjalanan' })
            .click();
        await card5B
            .getByRole('button', { name: 'Tandai Diterima Pelanggan' })
            .click();
        await expect(card5B.getByText('Diterima', { exact: true })).toBeVisible();

        // Mobile viewport 390x844 responsiveness verification
        await page.setViewportSize({ width: 390, height: 844 });

        await page.goto(`/pengantaran/${state.sesi5}`);
        const pengantaranOverflow = await page.evaluate(() => ({
            scrollWidth: document.documentElement.scrollWidth,
            innerWidth: window.innerWidth,
        }));
        expect(pengantaranOverflow.scrollWidth).toBeLessThanOrEqual(
            pengantaranOverflow.innerWidth,
        );
        await captureScreenshot(page, '28-mobile-viewport-pengantaran.png');

        await page.goto('/dashboard');
        const dashKurirOverflow = await page.evaluate(() => ({
            scrollWidth: document.documentElement.scrollWidth,
            innerWidth: window.innerWidth,
        }));
        expect(dashKurirOverflow.scrollWidth).toBeLessThanOrEqual(
            dashKurirOverflow.innerWidth,
        );
        await page.getByRole('button', { name: 'Buka menu navigasi' }).click();
        await expect(
            page.getByRole('dialog', { name: 'Menu navigasi CleanWash' }),
        ).toBeVisible();
        await page.getByRole('button', { name: 'Tutup menu navigasi' }).click();
        await logout(page);

        await loginAs(page, 'PEGAWAI');
        await page.goto('/produksi');
        const produksiOverflow = await page.evaluate(() => ({
            scrollWidth: document.documentElement.scrollWidth,
            innerWidth: window.innerWidth,
        }));
        expect(produksiOverflow.scrollWidth).toBeLessThanOrEqual(
            produksiOverflow.innerWidth,
        );
        await logout(page);

        await loginAs(page, 'PETUGAS');
        await page.goto('/dashboard');
        const dashPetugasOverflow = await page.evaluate(() => ({
            scrollWidth: document.documentElement.scrollWidth,
            innerWidth: window.innerWidth,
        }));
        expect(dashPetugasOverflow.scrollWidth).toBeLessThanOrEqual(
            dashPetugasOverflow.innerWidth,
        );
        await logout(page);

        await page.setViewportSize({ width: 1440, height: 900 });
    });
});
