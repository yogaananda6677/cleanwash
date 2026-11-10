<?php

namespace App\Models;

use App\Enums\StatusPembayaran;
use App\Enums\StatusTransaksi;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Transaksi extends Model
{
    protected $table = 'transaksi';

    protected $primaryKey = 'nomor_nota';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'nomor_nota',
        'id_pelanggan',
        'id_petugas',
        'id_layanan',
        'nomor_voucher',
        'tanggal_penerimaan',
        'berat_atau_jumlah',
        'catatan_khusus',
        'harga_satuan_snapshot',
        'nilai_voucher_snapshot',
        'total_kompensasi',
        'biaya_pembatalan',
        'total_harga',
        'status_pembayaran',
        'status_transaksi',
        'diambil_pada',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'tanggal_penerimaan' => 'datetime',
            'berat_atau_jumlah' => 'decimal:2',
            'harga_satuan_snapshot' => 'decimal:2',
            'nilai_voucher_snapshot' => 'decimal:2',
            'total_kompensasi' => 'decimal:2',
            'biaya_pembatalan' => 'decimal:2',
            'total_harga' => 'decimal:2',
            'status_pembayaran' => StatusPembayaran::class,
            'status_transaksi' => StatusTransaksi::class,
            'diambil_pada' => 'datetime',
        ];
    }

    public function pelanggan(): BelongsTo
    {
        return $this->belongsTo(Pelanggan::class, 'id_pelanggan', 'id_pelanggan');
    }

    public function petugas(): BelongsTo
    {
        return $this->belongsTo(Petugas::class, 'id_petugas', 'id_petugas');
    }

    public function layanan(): BelongsTo
    {
        return $this->belongsTo(JenisLayanan::class, 'id_layanan', 'id_layanan');
    }

    public function jenisLayanan(): BelongsTo
    {
        return $this->layanan();
    }

    public function voucher(): BelongsTo
    {
        return $this->belongsTo(Voucher::class, 'nomor_voucher', 'nomor_voucher');
    }

    public function detailPakaian(): HasMany
    {
        return $this->hasMany(DetailPakaian::class, 'nomor_nota', 'nomor_nota');
    }

    public function pembayaran(): HasMany
    {
        return $this->hasMany(Pembayaran::class, 'nomor_nota', 'nomor_nota');
    }

    public function riwayatStatusProduksi(): HasMany
    {
        return $this->hasMany(RiwayatStatusProduksi::class, 'nomor_nota', 'nomor_nota')
            ->orderBy('waktu_update')
            ->orderBy('id_status_produksi');
    }

    public function laporanKerusakanKehilangan(): HasMany
    {
        return $this->hasMany(LaporanKerusakanKehilangan::class, 'nomor_nota', 'nomor_nota');
    }

    public function itemPengantaran(): HasMany
    {
        return $this->hasMany(ItemPengantaran::class, 'nomor_nota', 'nomor_nota');
    }

    public function pengantaran(): BelongsToMany
    {
        return $this->belongsToMany(
            Pengantaran::class,
            'item_pengantaran',
            'nomor_nota',
            'id_pengantaran',
            'nomor_nota',
            'id_pengantaran'
        )
            ->withPivot(['id_item_antar', 'status_terima_pelanggan', 'alasan_gagal', 'waktu_update'])
            ->withTimestamps();
    }
}
