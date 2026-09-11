<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('announcements', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('body');
            $table->foreignId('author_id')->constrained('users')->cascadeOnDelete();
            $table->enum('audience', ['all', 'students', 'teachers'])->default('all');
            $table->boolean('pinned')->default(false);
            $table->timestamps();

            $table->index(['audience', 'pinned']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('announcements');
    }
};
