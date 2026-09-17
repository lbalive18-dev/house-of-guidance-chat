<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('call_sessions', function (Blueprint $table) {
            $table->id();
            $table->enum('type', ['private', 'group', 'room']);
            $table->enum('media', ['audio', 'video']);
            $table->foreignId('conversation_id')->constrained('conversations')->cascadeOnDelete();
            $table->foreignId('initiator_id')->constrained('users')->cascadeOnDelete();
            $table->enum('status', ['ringing', 'active', 'ended'])->default('ringing');
            $table->timestamp('started_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->timestamps();

            $table->index(['conversation_id', 'status']);
            $table->index('initiator_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('call_sessions');
    }
};
