<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Petugas extends Model
{
    protected $table = 'petugas';

    protected $primaryKey = 'id_petugas';

    protected $fillable = [
        'user_id',
        'nama_petugas',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function transaksi(): HasMany
    {
        return $this->hasMany(Transaksi::class, 'id_petugas', 'id_petugas');
    }

    public function pembayaran(): HasMany
    {
        return $this->hasMany(Pembayaran::class, 'id_petugas', 'id_petugas');
    }

    public function laporanKerusakanKehilangan(): HasMany
    {
        return $this->hasMany(LaporanKerusakanKehilangan::class, 'id_petugas', 'id_petugas');
    }
}
