<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class WelcomeNotification extends Notification
{
    use Queueable;

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toArray($notifiable): array
    {
        return [
            'title' => 'Welcome to House of Guidance Chat',
            'body' => 'Assalamu alaikum! Explore the Islamic reminders, join a room, and say hello to the community.',
            'icon' => 'sparkles',
            'action_url' => null,
        ];
    }
}
