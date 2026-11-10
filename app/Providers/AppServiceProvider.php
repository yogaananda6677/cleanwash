<?php

namespace App\Providers;

use App\Models\JenisLayanan;
use App\Models\Pelanggan;
use App\Models\Transaksi;
use App\Models\Voucher;
use App\Policies\JenisLayananPolicy;
use App\Policies\PelangganPolicy;
use App\Policies\TransaksiPolicy;
use App\Policies\VoucherPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::policy(Pelanggan::class, PelangganPolicy::class);
        Gate::policy(JenisLayanan::class, JenisLayananPolicy::class);
        Gate::policy(Voucher::class, VoucherPolicy::class);
        Gate::policy(Transaksi::class, TransaksiPolicy::class);
    }
}
