<?php

namespace App\Notifications;

use App\Models\CallSession;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class MissedCallNotification extends Notification
{
    use Queueable;

    public function __construct(
        public CallSession $session,
    ) {
    }

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toArray($notifiable): array
    {
        $callerName = $this->session->initiator?->name ?? 'Someone';

        return [
            'title' => 'Missed call',
            'body' => "You missed a {$this->session->media} call from {$callerName}.",
            'icon' => 'phone-missed',
            'from' => $callerName,
            'action_url' => '/chat/'.$this->session->conversation_id,
            'call_session_id' => $this->session->id,
        ];
    }
}
