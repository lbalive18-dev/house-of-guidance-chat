<?php

namespace App\Notifications;

use App\Models\Message;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class NewMessageNotification extends Notification
{
    use Queueable;

    public function __construct(
        public Message $message,
    ) {
    }

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toArray($notifiable): array
    {
        $senderName = $this->message->sender?->name ?? 'New message';

        $body = $this->message->body;

        if (! $body) {
            $body = match ($this->message->type) {
                'image' => 'Sent an image',
                'file' => 'Sent a file',
                'pdf' => 'Sent a PDF',
                'voice' => 'Sent a voice note',
                default => 'Sent a new message',
            };
        }

        return [
            'title' => $senderName,
            'body' => $body,
            'icon' => 'message-circle',
            'from' => $senderName,
            'action_url' => '/chat/'.$this->message->conversation_id,
        ];
    }
}