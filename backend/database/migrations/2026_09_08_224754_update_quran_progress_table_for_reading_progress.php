<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quran_progress', function (Blueprint $table) {
            $table->unsignedBigInteger('last_ayah_id')->nullable()->after('surah_id');
            $table->unsignedInteger('last_ayah_number')->nullable()->after('last_ayah_id');
            $table->boolean('completed')->default(false)->after('last_ayah_number');

            $table->foreign('last_ayah_id')
                ->references('id')
                ->on('ayahs')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('quran_progress', function (Blueprint $table) {
            $table->dropForeign(['last_ayah_id']);
            $table->dropColumn([
                'last_ayah_id',
                'last_ayah_number',
                'completed',
            ]);
        });
    }
};