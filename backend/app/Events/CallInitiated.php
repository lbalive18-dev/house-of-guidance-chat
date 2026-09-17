<?php

namespace App\Events;

use App\Http\Resources\CallSessionResource;
use App\Models\CallSession;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CallInitiated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public CallSession $session)
    {
        $this->session->loadMissing(['initiator', 'participants.user']);
    }

    public function broadcastOn(): array
    {
        // Conversation members see it on the shared channel; every invited
        // user is also rung directly so incoming calls arrive even without
        // the conversation open. Media NEVER travels over these channels.
        $channels = [new PrivateChannel('conversation.'.$this->session->conversation_id)];

        foreach ($this->session->participants as $participant) {
            if ($participant->user_id !== $this->session->initiator_id) {
                $channels[] = new PrivateChannel('App.Models.User.'.$participant->user_id);
            }
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'call.initiated';
    }

    public function broadcastWith(): array
    {
        return ['session' => (new CallSessionResource($this->session))->resolve()];
    }
}
