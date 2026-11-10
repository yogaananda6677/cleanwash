<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('riwayat_status_produksi', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->id('id_status_produksi');
            $table->string('nomor_nota', 30);
            $table->unsignedBigInteger('id_pegawai')->nullable();
            $table->string('tahap_status', 50);
            $table->dateTime('waktu_update');
            $table->text('catatan')->nullable();
            $table->timestamps();

            $table->foreign('nomor_nota')
                ->references('nomor_nota')
                ->on('transaksi')
                ->cascadeOnDelete();
            $table->foreign('id_pegawai')
                ->references('id_pegawai')
                ->on('pegawai')
                ->restrictOnDelete();

            $table->index(['nomor_nota', 'waktu_update']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('riwayat_status_produksi');
    }
};
