<?php

namespace Database\Seeders;

use App\Enums\MetodeHitung;
use App\Enums\SatuanLayanan;
use App\Enums\TahapProduksi;
use App\Enums\TingkatKecepatan;
use App\Enums\UserRole;
use App\Enums\VoucherStatus;
use App\Models\JenisLayanan;
use App\Models\Pegawai;
use App\Models\Pelanggan;
use App\Models\Petugas;
use App\Models\PetugasPengantaran;
use App\Models\TahapLayanan;
use App\Models\User;
use App\Models\Voucher;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class CleanWashSeeder extends Seeder
{
    /**
     * Seed baseline CleanWash staff, customers, services, stages, and vouchers.
     */
    public function run(): void
    {
        $this->seedStaff();
        $this->seedPelanggan();
        $this->seedLayanan();
        $this->seedVoucher();
    }

    private function seedStaff(): void
    {
        $defaultPassword = Hash::make('password');

        $staffAccounts = [
            [
                'email' => 'petugas@cleanwash.local',
                'name' => 'Rina Kasir',
                'role' => UserRole::PETUGAS,
                'profile_class' => Petugas::class,
                'profile_column' => 'nama_petugas',
            ],
            [
                'email' => 'pegawai@cleanwash.local',
                'name' => 'Budi Produksi',
                'role' => UserRole::PEGAWAI,
                'profile_class' => Pegawai::class,
                'profile_column' => 'nama_pegawai',
            ],
            [
                'email' => 'kurir@cleanwash.local',
                'name' => 'Andi Kurir',
                'role' => UserRole::PENGANTAR,
                'profile_class' => PetugasPengantaran::class,
                'profile_column' => 'nama_petugas_antar',
            ],
        ];

        foreach ($staffAccounts as $account) {
            $user = User::updateOrCreate(
                ['email' => $account['email']],
                [
                    'name' => $account['name'],
                    'password' => $defaultPassword,
                    'role' => $account['role'],
                    'is_active' => true,
                    'email_verified_at' => now(),
                ]
            );

            $profileClass = $account['profile_class'];
            $profileClass::updateOrCreate(
                ['user_id' => $user->id],
                [$account['profile_column'] => $account['name']]
            );
        }
    }

    private function seedPelanggan(): void
    {
        $customers = [
            [
                'no_telepon' => '081234567801',
                'nama' => 'Siti Aminah',
                'alamat' => 'Jl. Melati No. 12, Yogyakarta',
                'boleh_bayar_akhir' => false,
            ],
            [
                'no_telepon' => '081234567802',
                'nama' => 'Bapak Hendra Wijaya',
                'alamat' => 'Jl. Kaliurang KM 6 No. 45, Yogyakarta',
                'boleh_bayar_akhir' => true,
            ],
            [
                'no_telepon' => '081234567803',
                'nama' => 'Dewi Lestari',
                'alamat' => 'Jl. Gejayan No. 88, Sleman',
                'boleh_bayar_akhir' => false,
            ],
        ];

        foreach ($customers as $customer) {
            Pelanggan::updateOrCreate(
                ['no_telepon' => $customer['no_telepon']],
                [
                    'nama' => $customer['nama'],
                    'alamat' => $customer['alamat'],
                    'boleh_bayar_akhir' => $customer['boleh_bayar_akhir'],
                ]
            );
        }
    }

    private function seedLayanan(): void
    {
        $services = [
            [
                'nama_layanan' => 'Cuci Setrika',
                'tingkat_kecepatan' => TingkatKecepatan::REGULER,
                'metode_hitung' => MetodeHitung::BERAT,
                'satuan' => SatuanLayanan::KG,
                'harga_satuan' => '8000.00',
                'perlu_setrika' => true,
            ],
            [
                'nama_layanan' => 'Cuci Setrika',
                'tingkat_kecepatan' => TingkatKecepatan::EXPRESS,
                'metode_hitung' => MetodeHitung::BERAT,
                'satuan' => SatuanLayanan::KG,
                'harga_satuan' => '14000.00',
                'perlu_setrika' => true,
            ],
            [
                'nama_layanan' => 'Cuci Sepatu',
                'tingkat_kecepatan' => TingkatKecepatan::REGULER,
                'metode_hitung' => MetodeHitung::JUMLAH,
                'satuan' => SatuanLayanan::PCS,
                'harga_satuan' => '25000.00',
                'perlu_setrika' => false,
            ],
            [
                'nama_layanan' => 'Cuci Sepatu',
                'tingkat_kecepatan' => TingkatKecepatan::EXPRESS,
                'metode_hitung' => MetodeHitung::JUMLAH,
                'satuan' => SatuanLayanan::PCS,
                'harga_satuan' => '40000.00',
                'perlu_setrika' => false,
            ],
        ];

        foreach ($services as $service) {
            $layanan = JenisLayanan::updateOrCreate(
                [
                    'nama_layanan' => $service['nama_layanan'],
                    'tingkat_kecepatan' => $service['tingkat_kecepatan'],
                ],
                [
                    'metode_hitung' => $service['metode_hitung'],
                    'satuan' => $service['satuan'],
                    'harga_satuan' => $service['harga_satuan'],
                    'perlu_setrika' => $service['perlu_setrika'],
                    'is_active' => true,
                ]
            );

            $stages = TahapProduksi::canonicalSequence($service['perlu_setrika']);

            foreach ($stages as $index => $tahap) {
                TahapLayanan::updateOrCreate(
                    [
                        'id_layanan' => $layanan->id_layanan,
                        'urutan' => $index + 1,
                    ],
                    [
                        'nama_tahap' => $tahap,
                    ]
                );
            }

            TahapLayanan::where('id_layanan', $layanan->id_layanan)
                ->where('urutan', '>', count($stages))
                ->delete();
        }
    }

    private function seedVoucher(): void
    {
        $vouchers = [
            [
                'nomor_voucher' => 'HEMAT10K',
                'nilai' => '10000.00',
                'masa_berlaku' => now()->addDays(90)->toDateString(),
                'status_penggunaan' => VoucherStatus::TERSEDIA,
            ],
            [
                'nomor_voucher' => 'BERKAH5K',
                'nilai' => '5000.00',
                'masa_berlaku' => now()->addDays(30)->toDateString(),
                'status_penggunaan' => VoucherStatus::TERSEDIA,
            ],
            [
                'nomor_voucher' => 'EXPIRED15K',
                'nilai' => '15000.00',
                'masa_berlaku' => now()->subDays(7)->toDateString(),
                'status_penggunaan' => VoucherStatus::KEDALUWARSA,
            ],
        ];

        foreach ($vouchers as $voucher) {
            Voucher::firstOrCreate(
                ['nomor_voucher' => $voucher['nomor_voucher']],
                [
                    'nilai' => $voucher['nilai'],
                    'masa_berlaku' => $voucher['masa_berlaku'],
                    'status_penggunaan' => $voucher['status_penggunaan'],
                ]
            );
        }
    }
}
