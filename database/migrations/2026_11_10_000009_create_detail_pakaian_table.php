<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('detail_pakaian', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->id('id_detail');
            $table->string('nomor_nota', 30);
            $table->string('jenis_pakaian', 100);
            $table->unsignedInteger('jumlah_potong');
            $table->string('kondisi_pakaian', 255);
            $table->timestamps();

            $table->foreign('nomor_nota')
                ->references('nomor_nota')
                ->on('transaksi')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('detail_pakaian');
    }
};
