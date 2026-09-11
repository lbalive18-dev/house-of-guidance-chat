<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->enum('room_type', ['discussion', 'tajweed', 'hifdh', 'arabic', 'ask_sheikh'])
                ->nullable()
                ->after('type');
            $table->boolean('is_public')->default(false)->after('room_type');

            $table->index('room_type');
        });
    }

    public function down(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->dropColumn(['room_type', 'is_public']);
        });
    }
};
