<?php

namespace App\Notifications;

use App\Models\CallSession;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class IncomingCallNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public CallSession $session)
    {
    }

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toArray($notifiable): array
    {
        $initiator = $this->session->initiator;

        return [
            'type' => 'incoming_call',
            'title' => ($initiator?->name ?? 'Someone').' is calling',
            'body' => ($this->session->media === 'video' ? 'Video' : 'Audio').' call — tap to answer.',
            'url' => '/chat/'.$this->session->conversation_id,
            'conversation_id' => $this->session->conversation_id,
            'session_id' => $this->session->id,
            'media' => $this->session->media,
        ];
    }
}
