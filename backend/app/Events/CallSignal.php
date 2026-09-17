<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CallSignal implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * WebRTC signaling relay only (offer / answer / ICE candidate).
     * Actual audio/video media NEVER passes through Reverb.
     */
    public function __construct(
        public int $sessionId,
        public int $conversationId,
        public int $fromUserId,
        public ?int $toUserId,
        public string $signalType,
        public array $payload
    ) {
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel('conversation.'.$this->conversationId)];
    }

    public function broadcastAs(): string
    {
        return 'call.signal';
    }

    public function broadcastWith(): array
    {
        return [
            'session_id' => $this->sessionId,
            'from_user_id' => $this->fromUserId,
            'to_user_id' => $this->toUserId,
            'signal_type' => $this->signalType,
            'payload' => $this->payload,
        ];
    }
}
