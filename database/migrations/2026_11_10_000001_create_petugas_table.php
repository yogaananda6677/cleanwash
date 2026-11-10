<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('petugas', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->id('id_petugas');
            $table->foreignId('user_id')->unique()->constrained('users')->restrictOnDelete();
            $table->string('nama_petugas', 120);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('petugas');
    }
};
