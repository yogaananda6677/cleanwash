<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tahap_layanan', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->id('id_tahap');
            $table->unsignedBigInteger('id_layanan');
            $table->string('nama_tahap', 50);
            $table->unsignedTinyInteger('urutan');
            $table->timestamps();

            $table->foreign('id_layanan')
                ->references('id_layanan')
                ->on('jenis_layanan')
                ->cascadeOnDelete();

            $table->unique(['id_layanan', 'urutan']);
            $table->unique(['id_layanan', 'nama_tahap']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tahap_layanan');
    }
};
