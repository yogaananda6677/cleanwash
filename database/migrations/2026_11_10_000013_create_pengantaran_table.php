<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pengantaran', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->id('id_pengantaran');
            $table->unsignedBigInteger('id_petugas_antar');
            $table->date('tanggal_pengantaran');
            $table->string('status_pengantaran', 20)->default('DIJADWALKAN');
            $table->timestamps();

            $table->foreign('id_petugas_antar')
                ->references('id_petugas_antar')
                ->on('petugas_pengantaran')
                ->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pengantaran');
    }
};
