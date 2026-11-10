<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('item_pengantaran', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->id('id_item_antar');
            $table->unsignedBigInteger('id_pengantaran');
            $table->string('nomor_nota', 30);
            $table->string('status_terima_pelanggan', 25)->default('MENUNGGU');
            $table->text('alasan_gagal')->nullable();
            $table->dateTime('waktu_update')->nullable();
            $table->timestamps();

            $table->foreign('id_pengantaran')
                ->references('id_pengantaran')
                ->on('pengantaran')
                ->cascadeOnDelete();
            $table->foreign('nomor_nota')
                ->references('nomor_nota')
                ->on('transaksi')
                ->restrictOnDelete();

            $table->index(['id_pengantaran', 'status_terima_pelanggan']);
            $table->index('nomor_nota');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('item_pengantaran');
    }
};
