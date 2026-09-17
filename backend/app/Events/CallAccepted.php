<?php

namespace App\Events;

use App\Models\CallParticipant;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CallAccepted implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $sessionId,
        public int $conversationId,
        public CallParticipant $participant
    ) {
        $this->participant->loadMissing('user');
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel('conversation.'.$this->conversationId)];
    }

    public function broadcastAs(): string
    {
        return 'call.accepted';
    }

    public function broadcastWith(): array
    {
        return [
            'session_id' => $this->sessionId,
            'user_id' => $this->participant->user_id,
            'user' => [
                'id' => $this->participant->user->id,
                'name' => $this->participant->user->name,
                'avatar_url' => $this->participant->user->avatar_url,
            ],
        ];
    }
}
