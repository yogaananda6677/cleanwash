<?php

namespace App\Models;

use App\Enums\JenisInsiden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LaporanKerusakanKehilangan extends Model
{
    protected $table = 'laporan_kerusakan_kehilangan';

    protected $primaryKey = 'id_laporan';

    protected $fillable = [
        'nomor_nota',
        'id_detail',
        'id_petugas',
        'id_pegawai_pelapor',
        'jenis_insiden',
        'keterangan',
        'nilai_kompensasi',
        'kelebihan_ganti_rugi',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'jenis_insiden' => JenisInsiden::class,
            'nilai_kompensasi' => 'decimal:2',
            'kelebihan_ganti_rugi' => 'decimal:2',
        ];
    }

    public function transaksi(): BelongsTo
    {
        return $this->belongsTo(Transaksi::class, 'nomor_nota', 'nomor_nota');
    }

    public function detailPakaian(): BelongsTo
    {
        return $this->belongsTo(DetailPakaian::class, 'id_detail', 'id_detail');
    }

    public function petugas(): BelongsTo
    {
        return $this->belongsTo(Petugas::class, 'id_petugas', 'id_petugas');
    }

    public function pegawaiPelapor(): BelongsTo
    {
        return $this->belongsTo(Pegawai::class, 'id_pegawai_pelapor', 'id_pegawai');
    }
}
