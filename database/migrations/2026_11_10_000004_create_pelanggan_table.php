<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pelanggan', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->id('id_pelanggan');
            $table->string('nama', 120);
            $table->string('no_telepon', 25)->unique();
            $table->text('alamat');
            $table->boolean('boleh_bayar_akhir')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pelanggan');
    }
};
