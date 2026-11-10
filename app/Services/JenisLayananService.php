<?php

namespace App\Services;

use App\Enums\MetodeHitung;
use App\Enums\SatuanLayanan;
use App\Enums\TahapProduksi;
use App\Models\JenisLayanan;
use App\Models\TahapLayanan;
use App\Support\DecimalMoney;
use App\Support\SqlLike;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class JenisLayananService
{
    /**
     * Paginate services with ordered TahapLayanan stages and transaction counts.
     */
    public function paginate(string $search = '', int $perPage = 10): LengthAwarePaginator
    {
        $trimmed = trim($search);

        return JenisLayanan::query()
            ->with(['tahapLayanan' => fn ($query) => $query->orderBy('urutan')])
            ->withCount('transaksi')
            ->when($trimmed !== '', function ($query) use ($trimmed): void {
                $pattern = SqlLike::contains($trimmed);

                $query->where(function ($subQuery) use ($pattern): void {
                    $subQuery->where('nama_layanan', 'like', $pattern)
                        ->orWhere('tingkat_kecepatan', 'like', $pattern);
                });
            })
            ->orderByDesc('id_layanan')
            ->paginate($perPage)
            ->withQueryString();
    }

    /**
     * @param  array{
     *     nama_layanan: string,
     *     tingkat_kecepatan: string,
     *     metode_hitung: string,
     *     satuan: string,
     *     harga_satuan: string|int|float,
     *     perlu_setrika: bool,
     *     is_active?: bool,
     *     tahap_layanan?: list<string>|null
     * }  $data
     *
     * @throws ValidationException
     */
    public function create(array $data): JenisLayanan
    {
        $this->assertMetodeAndSatuanConsistent($data['metode_hitung'], $data['satuan']);

        return DB::transaction(function () use ($data): JenisLayanan {
            $perluSetrika = (bool) $data['perlu_setrika'];

            $layanan = JenisLayanan::create([
                'nama_layanan' => trim($data['nama_layanan']),
                'tingkat_kecepatan' => $data['tingkat_kecepatan'],
                'metode_hitung' => $data['metode_hitung'],
                'satuan' => $data['satuan'],
                'harga_satuan' => DecimalMoney::toDecimalString(
                    DecimalMoney::toCents((string) $data['harga_satuan'])
                ),
                'perlu_setrika' => $perluSetrika,
                'is_active' => array_key_exists('is_active', $data) ? (bool) $data['is_active'] : true,
            ]);

            $this->syncTahapLayanan(
                $layanan,
                $perluSetrika,
                $data['tahap_layanan'] ?? null
            );

            return $layanan->load('tahapLayanan');
        });
    }

    /**
     * @param  array{
     *     nama_layanan: string,
     *     tingkat_kecepatan: string,
     *     metode_hitung: string,
     *     satuan: string,
     *     harga_satuan: string|int|float,
     *     perlu_setrika: bool,
     *     is_active?: bool,
     *     tahap_layanan?: list<string>|null
     * }  $data
     *
     * @throws ValidationException
     */
    public function update(JenisLayanan $layanan, array $data): JenisLayanan
    {
        $this->assertMetodeAndSatuanConsistent($data['metode_hitung'], $data['satuan']);

        return DB::transaction(function () use ($layanan, $data): JenisLayanan {
            $perluSetrika = (bool) $data['perlu_setrika'];

            $layanan->update([
                'nama_layanan' => trim($data['nama_layanan']),
                'tingkat_kecepatan' => $data['tingkat_kecepatan'],
                'metode_hitung' => $data['metode_hitung'],
                'satuan' => $data['satuan'],
                'harga_satuan' => DecimalMoney::toDecimalString(
                    DecimalMoney::toCents((string) $data['harga_satuan'])
                ),
                'perlu_setrika' => $perluSetrika,
                'is_active' => array_key_exists('is_active', $data)
                    ? (bool) $data['is_active']
                    : $layanan->is_active,
            ]);

            $this->syncTahapLayanan(
                $layanan,
                $perluSetrika,
                $data['tahap_layanan'] ?? null
            );

            return $layanan->refresh()->load('tahapLayanan');
        });
    }

    /**
     * Delete a service only if no transactions reference it.
     *
     * @throws ValidationException
     */
    public function delete(JenisLayanan $layanan): void
    {
        DB::transaction(function () use ($layanan): void {
            if ($layanan->transaksi()->exists()) {
                throw ValidationException::withMessages([
                    'layanan' => 'Jenis layanan tidak dapat dihapus karena sudah digunakan pada transaksi.',
                ]);
            }

            $layanan->delete();
        });
    }

    /**
     * Synchronize ordered TahapLayanan rows inside a DB transaction.
     *
     * @param  list<string>|null  $customStages
     *
     * @throws ValidationException
     */
    public function syncTahapLayanan(JenisLayanan $layanan, bool $perluSetrika, ?array $customStages = null): void
    {
        $stages = $this->resolveValidatedStages($perluSetrika, $customStages);

        $layanan->tahapLayanan()->delete();

        foreach ($stages as $index => $tahap) {
            TahapLayanan::create([
                'id_layanan' => $layanan->id_layanan,
                'nama_tahap' => $tahap,
                'urutan' => $index + 1,
            ]);
        }
    }

    /**
     * @throws ValidationException
     */
    private function assertMetodeAndSatuanConsistent(string $metodeHitung, string $satuan): void
    {
        if ($metodeHitung === MetodeHitung::BERAT->value && $satuan !== SatuanLayanan::KG->value) {
            throw ValidationException::withMessages([
                'satuan' => 'Metode hitung BERAT wajib menggunakan satuan kg.',
            ]);
        }

        if ($metodeHitung === MetodeHitung::JUMLAH->value && $satuan !== SatuanLayanan::PCS->value) {
            throw ValidationException::withMessages([
                'satuan' => 'Metode hitung JUMLAH wajib menggunakan satuan pcs.',
            ]);
        }
    }

    /**
     * @param  list<string>|null  $customStages
     * @return list<TahapProduksi>
     *
     * @throws ValidationException
     */
    private function resolveValidatedStages(bool $perluSetrika, ?array $customStages): array
    {
        if ($customStages === null) {
            return TahapProduksi::canonicalSequence($perluSetrika);
        }

        $ordered = array_values($customStages);
        if (count($ordered) < 2) {
            throw ValidationException::withMessages([
                'tahap_layanan' => 'Tahap layanan minimal terdiri dari 2 tahap (DITERIMA dan SELESAI).',
            ]);
        }

        $resolved = [];
        foreach ($ordered as $code) {
            $enum = TahapProduksi::tryFrom((string) $code);
            if ($enum === null) {
                throw ValidationException::withMessages([
                    'tahap_layanan' => "Tahap layanan [{$code}] tidak valid.",
                ]);
            }

            if (in_array($enum, $resolved, true)) {
                throw ValidationException::withMessages([
                    'tahap_layanan' => 'Tahap layanan tidak boleh mengandung duplikat.',
                ]);
            }

            $resolved[] = $enum;
        }

        if ($resolved[0] !== TahapProduksi::DITERIMA || $resolved[count($resolved) - 1] !== TahapProduksi::SELESAI) {
            throw ValidationException::withMessages([
                'tahap_layanan' => 'Tahap layanan wajib diawali DITERIMA dan diakhiri SELESAI.',
            ]);
        }

        if (! $perluSetrika && in_array(TahapProduksi::DISETRIKA, $resolved, true)) {
            throw ValidationException::withMessages([
                'tahap_layanan' => 'Layanan tanpa setrika (perlu_setrika = false) dilarang memiliki tahap DISETRIKA.',
            ]);
        }

        return $resolved;
    }
}
