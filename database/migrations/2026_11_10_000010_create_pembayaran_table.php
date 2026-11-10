<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pembayaran', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->id('id_pembayaran');
            $table->string('nomor_nota', 30);
            $table->unsignedBigInteger('id_petugas');
            $table->dateTime('tanggal_bayar');
            $table->string('jenis_bayar', 20);
            $table->decimal('nominal_bayar', 12, 2);
            $table->timestamps();

            $table->foreign('nomor_nota')
                ->references('nomor_nota')
                ->on('transaksi')
                ->restrictOnDelete();
            $table->foreign('id_petugas')
                ->references('id_petugas')
                ->on('petugas')
                ->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pembayaran');
    }
};
