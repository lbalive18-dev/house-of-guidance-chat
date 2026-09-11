<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hadiths', function (Blueprint $table) {
            $table->id();
            $table->string('collection');
            $table->string('narrator')->nullable();
            $table->text('arabic_text')->nullable();
            $table->text('text');
            $table->string('reference');
            $table->string('category')->default('general');
            $table->timestamps();

            $table->index('category');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hadiths');
    }
};
