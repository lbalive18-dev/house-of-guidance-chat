<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CallCancelled implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $sessionId,
        public int $conversationId,
        public array $recipientUserIds = []
    ) {
    }

    public function broadcastOn(): array
    {
        $channels = [new PrivateChannel('conversation.'.$this->conversationId)];

        foreach ($this->recipientUserIds as $userId) {
            $channels[] = new PrivateChannel('App.Models.User.'.$userId);
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'call.cancelled';
    }

    public function broadcastWith(): array
    {
        return ['session_id' => $this->sessionId];
    }
}
