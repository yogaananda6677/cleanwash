<?php

namespace App\Models;

use App\Enums\MetodeHitung;
use App\Enums\SatuanLayanan;
use App\Enums\TingkatKecepatan;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JenisLayanan extends Model
{
    protected $table = 'jenis_layanan';

    protected $primaryKey = 'id_layanan';

    protected $fillable = [
        'nama_layanan',
        'tingkat_kecepatan',
        'metode_hitung',
        'satuan',
        'harga_satuan',
        'perlu_setrika',
        'is_active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'tingkat_kecepatan' => TingkatKecepatan::class,
            'metode_hitung' => MetodeHitung::class,
            'satuan' => SatuanLayanan::class,
            'harga_satuan' => 'decimal:2',
            'perlu_setrika' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function tahapLayanan(): HasMany
    {
        return $this->hasMany(TahapLayanan::class, 'id_layanan', 'id_layanan')
            ->orderBy('urutan');
    }

    public function transaksi(): HasMany
    {
        return $this->hasMany(Transaksi::class, 'id_layanan', 'id_layanan');
    }
}
