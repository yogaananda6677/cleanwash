<?php

namespace App\Http\Requests\Transaksi;

use App\Enums\MetodeHitung;
use App\Http\Requests\Concerns\AuthorizesPetugasRequest;
use App\Models\JenisLayanan;
use App\Support\DecimalMoney;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Validator;
use InvalidArgumentException;

class StoreTransaksiRequest extends FormRequest
{
    use AuthorizesPetugasRequest;

    protected function prepareForValidation(): void
    {
        $updates = [];

        if ($this->has('nomor_voucher') && is_string($this->input('nomor_voucher'))) {
            $trimmedVoucher = trim($this->input('nomor_voucher'));
            $updates['nomor_voucher'] = $trimmedVoucher === '' ? null : Str::upper($trimmedVoucher);
        }

        if ($this->has('catatan_khusus') && is_string($this->input('catatan_khusus'))) {
            $trimmedCatatan = trim($this->input('catatan_khusus'));
            $updates['catatan_khusus'] = $trimmedCatatan === '' ? null : $trimmedCatatan;
        }

        if ($this->has('nominal_dp') && is_string($this->input('nominal_dp')) && trim($this->input('nominal_dp')) === '') {
            $updates['nominal_dp'] = null;
        }

        if (is_array($this->input('detail_pakaian'))) {
            $updates['detail_pakaian'] = array_map(function (mixed $item): mixed {
                if (! is_array($item)) {
                    return $item;
                }

                if (isset($item['jenis_pakaian']) && is_string($item['jenis_pakaian'])) {
                    $item['jenis_pakaian'] = trim($item['jenis_pakaian']);
                }

                if (isset($item['kondisi_pakaian']) && is_string($item['kondisi_pakaian'])) {
                    $item['kondisi_pakaian'] = trim($item['kondisi_pakaian']);
                }

                return $item;
            }, $this->input('detail_pakaian'));
        }

        if ($updates !== []) {
            $this->merge($updates);
        }
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'id_pelanggan' => ['required', 'integer', 'exists:pelanggan,id_pelanggan'],
            'id_layanan' => ['required', 'integer', 'exists:jenis_layanan,id_layanan'],
            'berat_atau_jumlah' => ['required', 'numeric', 'gt:0', 'max:99999.99', 'decimal:0,2'],
            'nomor_voucher' => ['nullable', 'string', 'max:50'],
            'nominal_dp' => ['nullable', 'numeric', 'gte:0', 'max:999999999.99', 'decimal:0,2'],
            'catatan_khusus' => ['nullable', 'string', 'max:1000'],
            'detail_pakaian' => ['required', 'array', 'min:1'],
            'detail_pakaian.*.jenis_pakaian' => ['required', 'string', 'max:100'],
            'detail_pakaian.*.jumlah_potong' => ['required', 'integer', 'min:1', 'max:10000'],
            'detail_pakaian.*.kondisi_pakaian' => ['required', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->has('id_layanan')) {
                    return;
                }

                $idLayanan = $this->input('id_layanan');
                if (! is_numeric($idLayanan)) {
                    return;
                }

                $layanan = JenisLayanan::find((int) $idLayanan);
                if ($layanan === null) {
                    return;
                }

                if (! $layanan->is_active) {
                    $validator->errors()->add('id_layanan', 'Jenis layanan yang dipilih sedang tidak aktif.');

                    return;
                }

                if ($validator->errors()->has('berat_atau_jumlah')) {
                    return;
                }

                $rawQuantity = $this->input('berat_atau_jumlah');
                if ($layanan->metode_hitung === MetodeHitung::JUMLAH && is_numeric($rawQuantity)) {
                    try {
                        $cents = DecimalMoney::toCents((string) $rawQuantity);
                        if ($cents < 100 || ($cents % 100) !== 0) {
                            $validator->errors()->add(
                                'berat_atau_jumlah',
                                'Kuantitas untuk layanan metode JUMLAH (pcs) wajib berupa bilangan bulat minimal 1.'
                            );
                        }
                    } catch (InvalidArgumentException) {
                        // Handled by base numeric/decimal rules.
                    }
                }
            },
        ];
    }
}
