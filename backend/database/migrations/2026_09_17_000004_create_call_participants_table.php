<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('call_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('call_session_id')->constrained('call_sessions')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('status', ['invited', 'joined', 'declined', 'missed', 'left', 'removed'])->default('invited');
            $table->boolean('is_muted')->default(false);
            $table->boolean('is_camera_off')->default(false);
            $table->timestamp('joined_at')->nullable();
            $table->timestamp('left_at')->nullable();
            $table->timestamp('last_heartbeat_at')->nullable();
            $table->timestamps();

            $table->unique(['call_session_id', 'user_id']);
            $table->index(['call_session_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('call_participants');
    }
};
