<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('jenis_layanan', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->id('id_layanan');
            $table->string('nama_layanan', 100);
            $table->string('tingkat_kecepatan', 20);
            $table->string('metode_hitung', 20);
            $table->string('satuan', 10);
            $table->decimal('harga_satuan', 12, 2);
            $table->boolean('perlu_setrika')->default(true);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['nama_layanan', 'tingkat_kecepatan']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('jenis_layanan');
    }
};
