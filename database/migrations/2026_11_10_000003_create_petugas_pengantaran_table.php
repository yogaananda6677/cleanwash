<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('petugas_pengantaran', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->id('id_petugas_antar');
            $table->foreignId('user_id')->unique()->constrained('users')->restrictOnDelete();
            $table->string('nama_petugas_antar', 120);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('petugas_pengantaran');
    }
};
