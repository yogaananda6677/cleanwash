<?php

namespace App\Services;

use App\Models\Pelanggan;
use App\Support\SqlLike;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PelangganService
{
    /**
     * Paginate customers with transaction count and optional name/phone search.
     */
    public function paginate(string $search = '', int $perPage = 10): LengthAwarePaginator
    {
        $trimmed = trim($search);

        return Pelanggan::query()
            ->withCount('transaksi')
            ->when($trimmed !== '', function ($query) use ($trimmed): void {
                $pattern = SqlLike::contains($trimmed);

                $query->where(function ($subQuery) use ($pattern): void {
                    $subQuery->where('nama', 'like', $pattern)
                        ->orWhere('no_telepon', 'like', $pattern);
                });
            })
            ->orderByDesc('id_pelanggan')
            ->paginate($perPage)
            ->withQueryString();
    }

    /**
     * @param  array{nama: string, no_telepon: string, alamat: string, boleh_bayar_akhir: bool}  $data
     */
    public function create(array $data): Pelanggan
    {
        return DB::transaction(function () use ($data): Pelanggan {
            return Pelanggan::create([
                'nama' => trim($data['nama']),
                'no_telepon' => trim($data['no_telepon']),
                'alamat' => trim($data['alamat']),
                'boleh_bayar_akhir' => (bool) $data['boleh_bayar_akhir'],
            ]);
        });
    }

    /**
     * @param  array{nama: string, no_telepon: string, alamat: string, boleh_bayar_akhir: bool}  $data
     */
    public function update(Pelanggan $pelanggan, array $data): Pelanggan
    {
        return DB::transaction(function () use ($pelanggan, $data): Pelanggan {
            $pelanggan->update([
                'nama' => trim($data['nama']),
                'no_telepon' => trim($data['no_telepon']),
                'alamat' => trim($data['alamat']),
                'boleh_bayar_akhir' => (bool) $data['boleh_bayar_akhir'],
            ]);

            return $pelanggan->refresh();
        });
    }

    /**
     * Delete a customer only if no historical transactions reference them.
     *
     * @throws ValidationException
     */
    public function delete(Pelanggan $pelanggan): void
    {
        DB::transaction(function () use ($pelanggan): void {
            if ($pelanggan->transaksi()->exists()) {
                throw ValidationException::withMessages([
                    'pelanggan' => 'Pelanggan tidak dapat dihapus karena sudah memiliki riwayat transaksi.',
                ]);
            }

            $pelanggan->delete();
        });
    }
}
