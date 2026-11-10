<?php

namespace App\Models;

use App\Enums\TahapProduksi;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RiwayatStatusProduksi extends Model
{
    protected $table = 'riwayat_status_produksi';

    protected $primaryKey = 'id_status_produksi';

    protected $fillable = [
        'nomor_nota',
        'id_pegawai',
        'tahap_status',
        'waktu_update',
        'catatan',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'tahap_status' => TahapProduksi::class,
            'waktu_update' => 'datetime',
        ];
    }

    public function transaksi(): BelongsTo
    {
        return $this->belongsTo(Transaksi::class, 'nomor_nota', 'nomor_nota');
    }

    public function pegawai(): BelongsTo
    {
        return $this->belongsTo(Pegawai::class, 'id_pegawai', 'id_pegawai');
    }
}
