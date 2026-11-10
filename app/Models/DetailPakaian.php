<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DetailPakaian extends Model
{
    protected $table = 'detail_pakaian';

    protected $primaryKey = 'id_detail';

    protected $fillable = [
        'nomor_nota',
        'jenis_pakaian',
        'jumlah_potong',
        'kondisi_pakaian',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'jumlah_potong' => 'integer',
        ];
    }

    public function transaksi(): BelongsTo
    {
        return $this->belongsTo(Transaksi::class, 'nomor_nota', 'nomor_nota');
    }

    public function laporanKerusakanKehilangan(): HasMany
    {
        return $this->hasMany(LaporanKerusakanKehilangan::class, 'id_detail', 'id_detail');
    }
}
