<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Pegawai extends Model
{
    protected $table = 'pegawai';

    protected $primaryKey = 'id_pegawai';

    protected $fillable = [
        'user_id',
        'nama_pegawai',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function riwayatStatusProduksi(): HasMany
    {
        return $this->hasMany(RiwayatStatusProduksi::class, 'id_pegawai', 'id_pegawai');
    }

    public function laporanDilaporkan(): HasMany
    {
        return $this->hasMany(LaporanKerusakanKehilangan::class, 'id_pegawai_pelapor', 'id_pegawai');
    }
}
