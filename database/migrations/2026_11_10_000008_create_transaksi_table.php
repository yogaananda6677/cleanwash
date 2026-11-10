<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transaksi', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->string('nomor_nota', 30)->primary();
            $table->unsignedBigInteger('id_pelanggan');
            $table->unsignedBigInteger('id_petugas');
            $table->unsignedBigInteger('id_layanan');
            $table->string('nomor_voucher', 50)->nullable()->unique();
            $table->dateTime('tanggal_penerimaan');
            $table->decimal('berat_atau_jumlah', 8, 2);
            $table->text('catatan_khusus')->nullable();
            $table->decimal('harga_satuan_snapshot', 12, 2);
            $table->decimal('nilai_voucher_snapshot', 12, 2)->default('0.00');
            $table->decimal('total_kompensasi', 12, 2)->default('0.00');
            $table->decimal('biaya_pembatalan', 12, 2)->default('0.00');
            $table->decimal('total_harga', 12, 2);
            $table->string('status_pembayaran', 20)->default('BELUM_BAYAR');
            $table->string('status_transaksi', 20)->default('AKTIF');
            $table->timestamp('diambil_pada')->nullable();
            $table->timestamps();

            $table->foreign('id_pelanggan')
                ->references('id_pelanggan')
                ->on('pelanggan')
                ->restrictOnDelete();
            $table->foreign('id_petugas')
                ->references('id_petugas')
                ->on('petugas')
                ->restrictOnDelete();
            $table->foreign('id_layanan')
                ->references('id_layanan')
                ->on('jenis_layanan')
                ->restrictOnDelete();
            $table->foreign('nomor_voucher')
                ->references('nomor_voucher')
                ->on('voucher')
                ->restrictOnDelete();

            $table->index('tanggal_penerimaan');
            $table->index('status_pembayaran');
            $table->index('status_transaksi');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transaksi');
    }
};
