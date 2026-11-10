<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('voucher', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->string('nomor_voucher', 50)->primary();
            $table->decimal('nilai', 12, 2);
            $table->date('masa_berlaku');
            $table->string('status_penggunaan', 25)->default('TERSEDIA');
            $table->timestamp('digunakan_pada')->nullable();
            $table->timestamps();

            $table->index(['status_penggunaan', 'masa_berlaku']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('voucher');
    }
};
