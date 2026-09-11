<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ayahs', function (Blueprint $table) {
            $table->id();

            $table->foreignId('surah_id')
                ->constrained('surahs')
                ->cascadeOnDelete();

            $table->unsignedSmallInteger('number');
            $table->text('text_arabic');

            $table->timestamps();

            $table->unique(['surah_id', 'number']);
            $table->index('surah_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ayahs');
    }
};