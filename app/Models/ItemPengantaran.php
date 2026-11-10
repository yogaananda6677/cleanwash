<?php

namespace App\Models;

use App\Enums\StatusItemPengantaran;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ItemPengantaran extends Model
{
    protected $table = 'item_pengantaran';

    protected $primaryKey = 'id_item_antar';

    protected $fillable = [
        'id_pengantaran',
        'nomor_nota',
        'status_terima_pelanggan',
        'alasan_gagal',
        'waktu_update',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status_terima_pelanggan' => StatusItemPengantaran::class,
            'waktu_update' => 'datetime',
        ];
    }

    public function pengantaran(): BelongsTo
    {
        return $this->belongsTo(Pengantaran::class, 'id_pengantaran', 'id_pengantaran');
    }

    public function transaksi(): BelongsTo
    {
        return $this->belongsTo(Transaksi::class, 'nomor_nota', 'nomor_nota');
    }
}
