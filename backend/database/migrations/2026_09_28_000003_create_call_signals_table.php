<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Short-lived WebRTC signaling envelopes (offer/answer/ICE).
     *
     * Reverb broadcast remains the instant path; these rows are the
     * fallback readers poll while connecting, so calls still negotiate
     * when a device's websocket is down. Rows older than a few minutes
     * are pruned on write — media itself never passes through here.
     */
    public function up(): void
    {
        Schema::create('call_signals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('call_session_id')->constrained('call_sessions')->cascadeOnDelete();
            $table->foreignId('from_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('to_user_id')->nullable()->constrained('users')->cascadeOnDelete();
            $table->string('signal_type', 10);
            $table->json('payload');
            $table->timestamps();

            $table->index(['call_session_id', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('call_signals');
    }
};
