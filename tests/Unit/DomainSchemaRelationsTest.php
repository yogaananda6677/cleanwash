<?php

namespace Tests\Unit;

use App\Enums\JenisBayar;
use App\Enums\JenisInsiden;
use App\Enums\MetodeHitung;
use App\Enums\SatuanLayanan;
use App\Enums\StatusItemPengantaran;
use App\Enums\StatusPembayaran;
use App\Enums\StatusPengantaran;
use App\Enums\StatusTransaksi;
use App\Enums\TahapProduksi;
use App\Enums\TingkatKecepatan;
use App\Enums\UserRole;
use App\Enums\VoucherStatus;
use App\Models\AuditLog;
use App\Models\DetailPakaian;
use App\Models\ItemPengantaran;
use App\Models\JenisLayanan;
use App\Models\LaporanKerusakanKehilangan;
use App\Models\Pegawai;
use App\Models\Pelanggan;
use App\Models\Pembayaran;
use App\Models\Pengantaran;
use App\Models\Petugas;
use App\Models\PetugasPengantaran;
use App\Models\RiwayatStatusProduksi;
use App\Models\TahapLayanan;
use App\Models\Transaksi;
use App\Models\User;
use App\Models\Voucher;
use Database\Seeders\CleanWashSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class DomainSchemaRelationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_all_sixteen_domain_tables_exist_with_innodb_and_expected_decimal_precisions(): void
    {
        $expectedTables = [
            'users',
            'petugas',
            'pegawai',
            'petugas_pengantaran',
            'pelanggan',
            'jenis_layanan',
            'tahap_layanan',
            'voucher',
            'transaksi',
            'detail_pakaian',
            'pembayaran',
            'riwayat_status_produksi',
            'laporan_kerusakan_kehilangan',
            'pengantaran',
            'item_pengantaran',
            'audit_logs',
        ];

        foreach ($expectedTables as $table) {
            $this->assertTrue(Schema::hasTable($table), "Expected table [{$table}] to exist.");

            $tableMeta = DB::selectOne(
                'SELECT ENGINE FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
                [$table]
            );
            $this->assertNotNull($tableMeta);
            $this->assertSame('InnoDB', $tableMeta->ENGINE);
        }

        $decimalColumns = [
            ['jenis_layanan', 'harga_satuan', 12, 2],
            ['voucher', 'nilai', 12, 2],
            ['transaksi', 'berat_atau_jumlah', 8, 2],
            ['transaksi', 'harga_satuan_snapshot', 12, 2],
            ['transaksi', 'nilai_voucher_snapshot', 12, 2],
            ['transaksi', 'total_kompensasi', 12, 2],
            ['transaksi', 'biaya_pembatalan', 12, 2],
            ['transaksi', 'total_harga', 12, 2],
            ['pembayaran', 'nominal_bayar', 12, 2],
            ['laporan_kerusakan_kehilangan', 'nilai_kompensasi', 12, 2],
            ['laporan_kerusakan_kehilangan', 'kelebihan_ganti_rugi', 12, 2],
        ];

        foreach ($decimalColumns as [$table, $column, $precision, $scale]) {
            $columnMeta = DB::selectOne(
                'SELECT DATA_TYPE, NUMERIC_PRECISION, NUMERIC_SCALE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
                [$table, $column]
            );

            $this->assertNotNull($columnMeta, "Column [{$table}.{$column}] missing.");
            $this->assertSame('decimal', $columnMeta->DATA_TYPE, "Column [{$table}.{$column}] must be DECIMAL.");
            $this->assertSame($precision, (int) $columnMeta->NUMERIC_PRECISION, "Column [{$table}.{$column}] precision mismatch.");
            $this->assertSame($scale, (int) $columnMeta->NUMERIC_SCALE, "Column [{$table}.{$column}] scale mismatch.");
        }
    }

    public function test_models_casts_non_incrementing_primary_keys_and_all_relationships_work(): void
    {
        $petugasUser = User::factory()->petugas()->create();
        $pegawaiUser = User::factory()->pegawai()->create();
        $kurirUser = User::factory()->pengantar()->create();

        $petugas = Petugas::create([
            'user_id' => $petugasUser->id,
            'nama_petugas' => 'Rina Kasir',
        ]);
        $pegawai = Pegawai::create([
            'user_id' => $pegawaiUser->id,
            'nama_pegawai' => 'Budi Produksi',
        ]);
        $kurir = PetugasPengantaran::create([
            'user_id' => $kurirUser->id,
            'nama_petugas_antar' => 'Andi Kurir',
        ]);

        $this->assertSame($petugas->id_petugas, $petugasUser->actorId());
        $this->assertSame($pegawai->id_pegawai, $pegawaiUser->actorId());
        $this->assertSame($kurir->id_petugas_antar, $kurirUser->actorId());
        $this->assertTrue($petugas->user->is($petugasUser));
        $this->assertTrue($pegawai->user->is($pegawaiUser));
        $this->assertTrue($kurir->user->is($kurirUser));

        $pelanggan = Pelanggan::create([
            'nama' => 'Siti Aminah',
            'no_telepon' => '081234567890',
            'alamat' => 'Jl. Melati No. 1',
            'boleh_bayar_akhir' => false,
        ]);

        $layanan = JenisLayanan::create([
            'nama_layanan' => 'Cuci Setrika',
            'tingkat_kecepatan' => TingkatKecepatan::REGULER,
            'metode_hitung' => MetodeHitung::BERAT,
            'satuan' => SatuanLayanan::KG,
            'harga_satuan' => '8000.00',
            'perlu_setrika' => true,
            'is_active' => true,
        ]);

        $tahap1 = TahapLayanan::create([
            'id_layanan' => $layanan->id_layanan,
            'nama_tahap' => TahapProduksi::DITERIMA,
            'urutan' => 1,
        ]);
        $tahap2 = TahapLayanan::create([
            'id_layanan' => $layanan->id_layanan,
            'nama_tahap' => TahapProduksi::DICUCI,
            'urutan' => 2,
        ]);

        $voucher = Voucher::create([
            'nomor_voucher' => 'PROMO10K',
            'nilai' => '10000.00',
            'masa_berlaku' => '2026-12-31',
            'status_penggunaan' => VoucherStatus::TERSEDIA,
        ]);

        $this->assertFalse($voucher->incrementing);
        $this->assertSame('string', $voucher->getKeyType());
        $this->assertSame('PROMO10K', $voucher->getKey());
        $this->assertSame('10000.00', $voucher->nilai);
        $this->assertSame(VoucherStatus::TERSEDIA, $voucher->status_penggunaan);

        $transaksi = Transaksi::create([
            'nomor_nota' => 'CW-20261110-0001',
            'id_pelanggan' => $pelanggan->id_pelanggan,
            'id_petugas' => $petugas->id_petugas,
            'id_layanan' => $layanan->id_layanan,
            'nomor_voucher' => $voucher->nomor_voucher,
            'tanggal_penerimaan' => now(),
            'berat_atau_jumlah' => '3.50',
            'catatan_khusus' => 'Pisahkan baju putih',
            'harga_satuan_snapshot' => '8000.00',
            'nilai_voucher_snapshot' => '10000.00',
            'total_kompensasi' => '0.00',
            'biaya_pembatalan' => '0.00',
            'total_harga' => '18000.00',
            'status_pembayaran' => StatusPembayaran::DP,
            'status_transaksi' => StatusTransaksi::AKTIF,
        ]);

        $this->assertFalse($transaksi->incrementing);
        $this->assertSame('string', $transaksi->getKeyType());
        $this->assertSame('CW-20261110-0001', $transaksi->getKey());
        $this->assertSame('3.50', $transaksi->berat_atau_jumlah);
        $this->assertSame('8000.00', $transaksi->harga_satuan_snapshot);
        $this->assertSame('18000.00', $transaksi->total_harga);
        $this->assertSame(StatusPembayaran::DP, $transaksi->status_pembayaran);
        $this->assertSame(StatusTransaksi::AKTIF, $transaksi->status_transaksi);

        $detail = DetailPakaian::create([
            'nomor_nota' => $transaksi->nomor_nota,
            'jenis_pakaian' => 'Kemeja Kerja',
            'jumlah_potong' => 4,
            'kondisi_pakaian' => 'Normal',
        ]);

        $pembayaran = Pembayaran::create([
            'nomor_nota' => $transaksi->nomor_nota,
            'id_petugas' => $petugas->id_petugas,
            'tanggal_bayar' => now(),
            'jenis_bayar' => JenisBayar::DP,
            'nominal_bayar' => '10000.00',
        ]);

        $riwayatAwal = RiwayatStatusProduksi::create([
            'nomor_nota' => $transaksi->nomor_nota,
            'id_pegawai' => null,
            'tahap_status' => TahapProduksi::DITERIMA,
            'waktu_update' => now(),
            'catatan' => 'Diterima kasir',
        ]);

        $riwayatCuci = RiwayatStatusProduksi::create([
            'nomor_nota' => $transaksi->nomor_nota,
            'id_pegawai' => $pegawai->id_pegawai,
            'tahap_status' => TahapProduksi::DICUCI,
            'waktu_update' => now()->addMinutes(5),
            'catatan' => 'Mulai cuci',
        ]);

        $laporan = LaporanKerusakanKehilangan::create([
            'nomor_nota' => $transaksi->nomor_nota,
            'id_detail' => $detail->id_detail,
            'id_petugas' => $petugas->id_petugas,
            'id_pegawai_pelapor' => $pegawai->id_pegawai,
            'jenis_insiden' => JenisInsiden::RUSAK,
            'keterangan' => 'Kancing lepas',
            'nilai_kompensasi' => '5000.00',
            'kelebihan_ganti_rugi' => '0.00',
        ]);

        $pengantaran = Pengantaran::create([
            'id_petugas_antar' => $kurir->id_petugas_antar,
            'tanggal_pengantaran' => '2026-11-10',
            'status_pengantaran' => StatusPengantaran::BERJALAN,
        ]);

        $itemPengantaran = ItemPengantaran::create([
            'id_pengantaran' => $pengantaran->id_pengantaran,
            'nomor_nota' => $transaksi->nomor_nota,
            'status_terima_pelanggan' => StatusItemPengantaran::DALAM_PERJALANAN,
            'waktu_update' => now(),
        ]);

        $auditLog = AuditLog::create([
            'user_id' => $petugasUser->id,
            'actor_role' => UserRole::PETUGAS->value,
            'action' => 'TRANSAKSI_CREATED',
            'subject_type' => Transaksi::class,
            'subject_id' => $transaksi->nomor_nota,
            'payload_before' => null,
            'payload_after' => ['total_harga' => '18000.00'],
        ]);

        $transaksi->refresh();

        $this->assertTrue($transaksi->pelanggan->is($pelanggan));
        $this->assertTrue($transaksi->petugas->is($petugas));
        $this->assertTrue($transaksi->layanan->is($layanan));
        $this->assertTrue($transaksi->jenisLayanan->is($layanan));
        $this->assertTrue($transaksi->voucher->is($voucher));
        $this->assertTrue($voucher->transaksi->is($transaksi));
        $this->assertTrue($pelanggan->transaksi->contains($transaksi));
        $this->assertTrue($petugas->transaksi->contains($transaksi));
        $this->assertTrue($layanan->tahapLayanan->contains($tahap1));
        $this->assertTrue($layanan->tahapLayanan->contains($tahap2));
        $this->assertTrue($tahap1->jenisLayanan->is($layanan));
        $this->assertTrue($transaksi->detailPakaian->contains($detail));
        $this->assertTrue($detail->transaksi->is($transaksi));
        $this->assertTrue($transaksi->pembayaran->contains($pembayaran));
        $this->assertTrue($pembayaran->petugas->is($petugas));
        $this->assertCount(2, $transaksi->riwayatStatusProduksi);
        $this->assertNull($riwayatAwal->pegawai);
        $this->assertTrue($riwayatCuci->pegawai->is($pegawai));
        $this->assertTrue($detail->laporanKerusakanKehilangan->contains($laporan));
        $this->assertTrue($laporan->detailPakaian->is($detail));
        $this->assertTrue($laporan->pegawaiPelapor->is($pegawai));
        $this->assertTrue($kurir->pengantaran->contains($pengantaran));
        $this->assertTrue($pengantaran->petugasPengantaran->is($kurir));
        $this->assertTrue($pengantaran->itemPengantaran->contains($itemPengantaran));
        $this->assertTrue($itemPengantaran->transaksi->is($transaksi));
        $this->assertTrue($pengantaran->transaksi->contains($transaksi));
        $this->assertTrue($transaksi->pengantaran->contains($pengantaran));
        $this->assertTrue($auditLog->user->is($petugasUser));
        $this->assertNotNull($auditLog->created_at);
        $this->assertNull($auditLog->updated_at);
        $this->assertTrue($petugasUser->auditLogs->contains($auditLog));
        $this->assertSame(StatusPengantaran::BERJALAN, $pengantaran->status_pengantaran);
        $this->assertSame(StatusItemPengantaran::DALAM_PERJALANAN, $itemPengantaran->status_terima_pelanggan);
    }

    public function test_foreign_key_cascade_and_restrict_constraints_are_enforced_in_mysql(): void
    {
        $petugasUser = User::factory()->petugas()->create();
        $petugas = Petugas::create([
            'user_id' => $petugasUser->id,
            'nama_petugas' => 'Kasir Test',
        ]);
        $pelanggan = Pelanggan::create([
            'nama' => 'Pelanggan FK',
            'no_telepon' => '081999888777',
            'alamat' => 'Jl. Mawar',
            'boleh_bayar_akhir' => false,
        ]);
        $layanan = JenisLayanan::create([
            'nama_layanan' => 'Cuci Kering',
            'tingkat_kecepatan' => TingkatKecepatan::REGULER,
            'metode_hitung' => MetodeHitung::BERAT,
            'satuan' => SatuanLayanan::KG,
            'harga_satuan' => '6000.00',
            'perlu_setrika' => false,
            'is_active' => true,
        ]);
        TahapLayanan::create([
            'id_layanan' => $layanan->id_layanan,
            'nama_tahap' => TahapProduksi::DITERIMA,
            'urutan' => 1,
        ]);

        $layananTanpaTransaksi = JenisLayanan::create([
            'nama_layanan' => 'Cuci Karpet',
            'tingkat_kecepatan' => TingkatKecepatan::REGULER,
            'metode_hitung' => MetodeHitung::JUMLAH,
            'satuan' => SatuanLayanan::PCS,
            'harga_satuan' => '35000.00',
            'perlu_setrika' => false,
            'is_active' => true,
        ]);
        $tahapKarpet = TahapLayanan::create([
            'id_layanan' => $layananTanpaTransaksi->id_layanan,
            'nama_tahap' => TahapProduksi::DITERIMA,
            'urutan' => 1,
        ]);

        // Cascade delete removes TahapLayanan when JenisLayanan has no Transaksi.
        $layananTanpaTransaksi->delete();
        $this->assertDatabaseMissing('tahap_layanan', ['id_tahap' => $tahapKarpet->id_tahap]);

        Transaksi::create([
            'nomor_nota' => 'CW-20261110-0099',
            'id_pelanggan' => $pelanggan->id_pelanggan,
            'id_petugas' => $petugas->id_petugas,
            'id_layanan' => $layanan->id_layanan,
            'tanggal_penerimaan' => now(),
            'berat_atau_jumlah' => '2.00',
            'harga_satuan_snapshot' => '6000.00',
            'total_harga' => '12000.00',
            'status_pembayaran' => StatusPembayaran::BELUM_BAYAR,
            'status_transaksi' => StatusTransaksi::AKTIF,
        ]);

        $this->expectException(QueryException::class);
        $pelanggan->delete();
    }

    public function test_cleanwash_seeder_populates_staff_customers_services_without_ironing_for_shoes_and_vouchers_idempotently(): void
    {
        $this->seed(CleanWashSeeder::class);
        $this->seed(CleanWashSeeder::class);

        $petugasUser = User::where('email', 'petugas@cleanwash.local')->firstOrFail();
        $pegawaiUser = User::where('email', 'pegawai@cleanwash.local')->firstOrFail();
        $kurirUser = User::where('email', 'kurir@cleanwash.local')->firstOrFail();

        $this->assertSame(UserRole::PETUGAS, $petugasUser->role);
        $this->assertSame(UserRole::PEGAWAI, $pegawaiUser->role);
        $this->assertSame(UserRole::PENGANTAR, $kurirUser->role);
        $this->assertNotNull($petugasUser->actorId());
        $this->assertNotNull($pegawaiUser->actorId());
        $this->assertNotNull($kurirUser->actorId());

        $this->assertTrue(Pelanggan::where('boleh_bayar_akhir', false)->exists());
        $this->assertTrue(Pelanggan::where('boleh_bayar_akhir', true)->exists());

        $cuciSepatu = JenisLayanan::with('tahapLayanan')
            ->where('nama_layanan', 'Cuci Sepatu')
            ->where('tingkat_kecepatan', TingkatKecepatan::REGULER)
            ->firstOrFail();

        $this->assertFalse($cuciSepatu->perlu_setrika);
        $this->assertSame(MetodeHitung::JUMLAH, $cuciSepatu->metode_hitung);
        $this->assertSame(SatuanLayanan::PCS, $cuciSepatu->satuan);

        $tahapCodes = $cuciSepatu->tahapLayanan
            ->map(fn (TahapLayanan $tahap): string => $tahap->nama_tahap->value)
            ->all();

        $this->assertSame(['DITERIMA', 'DICUCI', 'DIKERINGKAN', 'SELESAI'], $tahapCodes);
        $this->assertNotContains('DISETRIKA', $tahapCodes);

        $this->assertTrue(Voucher::where('status_penggunaan', VoucherStatus::TERSEDIA)->exists());
    }
}
