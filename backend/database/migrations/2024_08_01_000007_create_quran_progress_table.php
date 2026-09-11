<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quran_progress', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                ->constrained('users')
                ->cascadeOnDelete();

            $table->foreignId('surah_id')
                ->constrained('surahs')
                ->cascadeOnDelete();

            $table->foreignId('ayah_id')
                ->nullable()
                ->constrained('ayahs')
                ->nullOnDelete();

            $table->unsignedTinyInteger('progress_percent')->default(0);

            $table->timestamp('last_read_at')->nullable();

            $table->timestamps();

            $table->unique(
                ['user_id', 'surah_id'],
                'quran_progress_user_surah_unique'
            );

            $table->index('ayah_id');
            $table->index('last_read_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quran_progress');
    }
};