<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quran_translations', function (Blueprint $table) {
            $table->id();

            $table->foreignId('ayah_id')
                ->constrained('ayahs')
                ->cascadeOnDelete();

            $table->string('language', 10);
            $table->string('translator')->nullable();
            $table->text('text');

            $table->timestamps();

            $table->unique(
                ['ayah_id', 'language', 'translator'],
                'quran_translations_ayah_language_translator_unique'
            );

            $table->index('language');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quran_translations');
    }
};