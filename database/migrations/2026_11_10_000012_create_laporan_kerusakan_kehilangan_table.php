<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('laporan_kerusakan_kehilangan', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->id('id_laporan');
            $table->string('nomor_nota', 30);
            $table->unsignedBigInteger('id_detail');
            $table->unsignedBigInteger('id_petugas')->nullable();
            $table->unsignedBigInteger('id_pegawai_pelapor')->nullable();
            $table->string('jenis_insiden', 20);
            $table->text('keterangan');
            $table->decimal('nilai_kompensasi', 12, 2)->default('0.00');
            $table->decimal('kelebihan_ganti_rugi', 12, 2)->default('0.00');
            $table->timestamps();

            $table->foreign('nomor_nota')
                ->references('nomor_nota')
                ->on('transaksi')
                ->restrictOnDelete();
            $table->foreign('id_detail')
                ->references('id_detail')
                ->on('detail_pakaian')
                ->restrictOnDelete();
            $table->foreign('id_petugas')
                ->references('id_petugas')
                ->on('petugas')
                ->restrictOnDelete();
            $table->foreign('id_pegawai_pelapor')
                ->references('id_pegawai')
                ->on('pegawai')
                ->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('laporan_kerusakan_kehilangan');
    }
};
