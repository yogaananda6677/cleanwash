<?php

namespace App\Http\Controllers;

use App\Enums\VoucherStatus;
use App\Http\Requests\Master\StoreVoucherRequest;
use App\Http\Requests\Master\UpdateVoucherRequest;
use App\Http\Requests\Master\ValidateVoucherRequest;
use App\Models\Voucher;
use App\Services\VoucherService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class VoucherController extends Controller
{
    public function __construct(
        private readonly VoucherService $voucherService
    ) {}

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Voucher::class);

        $search = trim((string) $request->query('search', ''));
        $rawStatus = strtoupper(trim((string) $request->query('status', '')));
        $status = in_array($rawStatus, VoucherStatus::values(), true) ? $rawStatus : '';

        return Inertia::render('Voucher/Index', [
            'voucher' => $this->voucherService->paginate($search, $status),
            'filters' => [
                'search' => $search,
                'status' => $status,
            ],
        ]);
    }

    public function store(StoreVoucherRequest $request): RedirectResponse
    {
        $this->authorize('create', Voucher::class);

        $this->voucherService->create($request->validated());

        return redirect()
            ->route('voucher.index')
            ->with('success', 'Voucher berhasil ditambahkan.');
    }

    public function update(UpdateVoucherRequest $request, Voucher $voucher): RedirectResponse
    {
        $this->authorize('update', $voucher);

        return $this->executeWithFlashRedirect(
            $request,
            fn () => $this->voucherService->update($voucher, $request->validated()),
            'voucher.index',
            'Voucher berhasil diperbarui.'
        );
    }

    public function destroy(Request $request, Voucher $voucher): RedirectResponse
    {
        $this->authorize('delete', $voucher);

        return $this->executeWithFlashRedirect(
            $request,
            fn () => $this->voucherService->delete($voucher),
            'voucher.index',
            'Voucher berhasil dihapus.'
        );
    }

    public function validateCode(ValidateVoucherRequest $request): JsonResponse
    {
        $this->authorize('validate', Voucher::class);

        $validated = $request->validated();
        $result = $this->voucherService->cekValiditasPreview(
            $validated['nomor_voucher'],
            $validated['tanggal_transaksi'] ?? null
        );

        return response()->json($result, $result['valid'] ? 200 : 422);
    }
}
