<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CallEnded implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * @param  int[]  $missedUserIds  invitees that never joined (missed call)
     */
    public function __construct(
        public int $sessionId,
        public int $conversationId,
        public string $reason,
        public array $missedUserIds = []
    ) {
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel('conversation.'.$this->conversationId)];
    }

    public function broadcastAs(): string
    {
        return 'call.ended';
    }

    public function broadcastWith(): array
    {
        return [
            'session_id' => $this->sessionId,
            'reason' => $this->reason,
            'missed_user_ids' => $this->missedUserIds,
        ];
    }
}
