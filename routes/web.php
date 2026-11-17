<?php

use App\Http\Controllers\AuditController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\InsidenController;
use App\Http\Controllers\JenisLayananController;
use App\Http\Controllers\LandingController;
use App\Http\Controllers\PelangganController;
use App\Http\Controllers\PembayaranController;
use App\Http\Controllers\PengantaranController;
use App\Http\Controllers\ProduksiController;
use App\Http\Controllers\SerahTerimaController;
use App\Http\Controllers\TransaksiAdjustmentController;
use App\Http\Controllers\TransaksiController;
use App\Http\Controllers\VoucherController;
use Illuminate\Support\Facades\Route;

Route::get('/', [LandingController::class, 'index'])->name('home');
Route::get('/lacak/{nota}', [LandingController::class, 'track'])->name('lacak');

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
        Route::post('/transaksi/{nota}/pembayaran', [PembayaranController::class, 'store'])->name('transaksi.pembayaran.store');
        Route::post('/transaksi/{nota}/serah-terima', [SerahTerimaController::class, 'store'])->name('transaksi.serah-terima');
        Route::get('/transaksi/{nota}', [TransaksiController::class, 'show'])->name('transaksi.show');

        Route::get('/serah-terima', [SerahTerimaController::class, 'index'])->name('serah-terima.index');
        Route::get('/audit', [AuditController::class, 'index'])->name('audit.index');

        Route::post('/insiden/{laporan}/konfirmasi', [InsidenController::class, 'konfirmasi'])->name('insiden.konfirmasi');

        Route::post('/pengantaran', [PengantaranController::class, 'store'])->name('pengantaran.store');
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

    Route::middleware('role:PENGANTAR')->group(function () {
        Route::post('/pengantaran/item/{item}/status', [PengantaranController::class, 'updateItemStatus'])
            ->whereNumber('item')
            ->name('pengantaran.item.status');
        Route::post('/pengantaran/{pengantaran}/mulai', [PengantaranController::class, 'mulai'])
            ->whereNumber('pengantaran')
            ->name('pengantaran.mulai');
    });

    Route::middleware('role:PETUGAS,PENGANTAR')->group(function () {
        Route::get('/pengantaran', [PengantaranController::class, 'index'])->name('pengantaran.index');
        Route::post('/pengantaran/item/{item}/jadwalkan-ulang', [PengantaranController::class, 'jadwalkanUlang'])
            ->whereNumber('item')
            ->name('pengantaran.item.jadwalkan-ulang');
        Route::get('/pengantaran/{pengantaran}', [PengantaranController::class, 'show'])
            ->whereNumber('pengantaran')
            ->name('pengantaran.show');
    });
});
