<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('surahs', function (Blueprint $table) {
            $table->id();
            $table->unsignedTinyInteger('number')->unique();
            $table->string('name_arabic');
            $table->string('name_transliterated');
            $table->string('name_english');
            $table->enum('revelation_type', ['meccan', 'medinan']);
            $table->unsignedSmallInteger('verses_count');
            $table->timestamps();

            $table->index('revelation_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('surahs');
    }
};