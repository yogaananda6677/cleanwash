<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PetugasPengantaran extends Model
{
    protected $table = 'petugas_pengantaran';

    protected $primaryKey = 'id_petugas_antar';

    protected $fillable = [
        'user_id',
        'nama_petugas_antar',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function pengantaran(): HasMany
    {
        return $this->hasMany(Pengantaran::class, 'id_petugas_antar', 'id_petugas_antar');
    }
}
