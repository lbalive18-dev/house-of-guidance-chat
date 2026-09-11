<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quran_bookmarks', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                ->constrained('users')
                ->cascadeOnDelete();

            $table->foreignId('ayah_id')
                ->constrained('ayahs')
                ->cascadeOnDelete();

            $table->text('note')->nullable();

            $table->timestamps();

            $table->unique(
                ['user_id', 'ayah_id'],
                'quran_bookmarks_user_ayah_unique'
            );

            $table->index('ayah_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quran_bookmarks');
    }
};