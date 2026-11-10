<?php

namespace App\Models;

use App\Enums\TahapProduksi;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TahapLayanan extends Model
{
    protected $table = 'tahap_layanan';

    protected $primaryKey = 'id_tahap';

    protected $fillable = [
        'id_layanan',
        'nama_tahap',
        'urutan',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'nama_tahap' => TahapProduksi::class,
            'urutan' => 'integer',
        ];
    }

    public function jenisLayanan(): BelongsTo
    {
        return $this->belongsTo(JenisLayanan::class, 'id_layanan', 'id_layanan');
    }
}
