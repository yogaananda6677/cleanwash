<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\InsidenController;
use App\Http\Controllers\JenisLayananController;
use App\Http\Controllers\PelangganController;
use App\Http\Controllers\ProduksiController;
use App\Http\Controllers\TransaksiAdjustmentController;
use App\Http\Controllers\TransaksiController;
use App\Http\Controllers\VoucherController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/', function (Request $request) {
    return $request->user()
        ? redirect()->route('dashboard')
        : redirect()->route('login');
})->name('home');

Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login'])->name('login.store');
});

Route::middleware('auth')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
    Route::get('/dashboard', [DashboardController::class, 'index'])
        ->middleware('role:PETUGAS,PEGAWAI,PENGANTAR')
        ->name('dashboard');

    Route::middleware('role:PETUGAS')->group(function () {
        Route::resource('pelanggan', PelangganController::class)
            ->only(['index', 'store', 'update', 'destroy']);

        Route::resource('layanan', JenisLayananController::class)
            ->only(['index', 'store', 'update', 'destroy']);

        Route::post('/voucher/validate', [VoucherController::class, 'validateCode'])
            ->name('voucher.validate');
        Route::resource('voucher', VoucherController::class)
            ->only(['index', 'store', 'update', 'destroy']);

        Route::get('/transaksi', [TransaksiController::class, 'index'])->name('transaksi.index');
        Route::get('/transaksi/create', [TransaksiController::class, 'create'])->name('transaksi.create');
        Route::post('/transaksi', [TransaksiController::class, 'store'])->name('transaksi.store');
        Route::get('/transaksi/{nota}/nota', [TransaksiController::class, 'nota'])->name('transaksi.nota');
        Route::post('/transaksi/{nota}/ubah-layanan', [TransaksiAdjustmentController::class, 'ubahLayanan'])->name('transaksi.ubah-layanan');
        Route::post('/transaksi/{nota}/batalkan', [TransaksiAdjustmentController::class, 'batalkan'])->name('transaksi.batalkan');
        Route::get('/transaksi/{nota}', [TransaksiController::class, 'show'])->name('transaksi.show');

        Route::post('/insiden/{laporan}/konfirmasi', [InsidenController::class, 'konfirmasi'])->name('insiden.konfirmasi');
    });

    Route::middleware('role:PEGAWAI')->group(function () {
        Route::get('/produksi', [ProduksiController::class, 'index'])->name('produksi.index');
        Route::post('/produksi/{nota}/timbang-ulang', [ProduksiController::class, 'timbangUlang'])->name('produksi.timbang-ulang');
        Route::post('/produksi/{nota}/status', [ProduksiController::class, 'ubahStatus'])->name('produksi.status');
    });

    Route::middleware('role:PETUGAS,PEGAWAI')->group(function () {
        Route::get('/insiden', [InsidenController::class, 'index'])->name('insiden.index');
        Route::post('/insiden', [InsidenController::class, 'store'])->name('insiden.store');
        Route::post('/transaksi/{nota}/insiden', [InsidenController::class, 'storeForTransaksi'])->name('transaksi.insiden.store');
    });
});
