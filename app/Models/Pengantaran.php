<?php

namespace App\Models;

use App\Enums\StatusPengantaran;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Pengantaran extends Model
{
    protected $table = 'pengantaran';

    protected $primaryKey = 'id_pengantaran';

    protected $fillable = [
        'id_petugas_antar',
        'tanggal_pengantaran',
        'status_pengantaran',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'tanggal_pengantaran' => 'date:Y-m-d',
            'status_pengantaran' => StatusPengantaran::class,
        ];
    }

    public function petugasPengantaran(): BelongsTo
    {
        return $this->belongsTo(PetugasPengantaran::class, 'id_petugas_antar', 'id_petugas_antar');
    }

    public function itemPengantaran(): HasMany
    {
        return $this->hasMany(ItemPengantaran::class, 'id_pengantaran', 'id_pengantaran');
    }

    public function transaksi(): BelongsToMany
    {
        return $this->belongsToMany(
            Transaksi::class,
            'item_pengantaran',
            'id_pengantaran',
            'nomor_nota',
            'id_pengantaran',
            'nomor_nota'
        )
            ->withPivot(['id_item_antar', 'status_terima_pelanggan', 'alasan_gagal', 'waktu_update'])
            ->withTimestamps();
    }
}
