<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quran_surah_audio', function (Blueprint $table) {
            $table->id();

            $table->foreignId('surah_id')
                ->constrained('surahs')
                ->cascadeOnDelete();

            $table->foreignId('quran_reciter_id')
                ->constrained('quran_reciters')
                ->cascadeOnDelete();

            $table->text('audio_url');

            $table->timestamps();

            $table->unique(
                ['surah_id', 'quran_reciter_id'],
                'quran_surah_audio_surah_reciter_unique'
            );

            $table->index('quran_reciter_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quran_surah_audio');
    }
};