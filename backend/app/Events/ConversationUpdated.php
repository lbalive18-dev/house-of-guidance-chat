<?php

namespace App\Events;

use App\Models\Conversation;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ConversationUpdated implements ShouldBroadcastNow
{
    use Dispatchable, SerializesModels;

    public function __construct(public Conversation $conversation)
    {
        $this->conversation->loadMissing('participants');
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel('conversation.'.$this->conversation->id)];
    }

    public function broadcastAs(): string
    {
        return 'conversation.updated';
    }

    /**
     * Only objective, viewer-independent fields belong here - unread counts
     * and "my role" are per-recipient and must never be broadcast as-is.
     */
    public function broadcastWith(): array
    {
        return [
            'conversation_id' => $this->conversation->id,
            'name' => $this->conversation->name,
            'description' => $this->conversation->description,
            'avatar_url' => $this->conversation->avatar_url,
            'participant_count' => $this->conversation->activeParticipants()->count(),
            'members' => $this->conversation->participants->map(fn ($member) => [
                'id' => $member->id,
                'name' => $member->name,
                'avatar_url' => $member->avatar_url,
                'is_online' => $member->is_online,
                'role' => $member->pivot->role,
            ])->values(),
        ];
    }
}
