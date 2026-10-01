<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Repeat-question cache for Noor: genuinely new questions hit the
     * model once, every repeat is served free from this table.
     */
    public function up(): void
    {
        Schema::create('noor_cached_answers', function (Blueprint $table) {
            $table->id();
            $table->string('question_hash', 64)->unique();
            $table->text('question');
            $table->string('lang', 12)->default('en');
            $table->longText('answer');
            $table->json('sources')->nullable();
            $table->unsignedInteger('hits')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('noor_cached_answers');
    }
};
