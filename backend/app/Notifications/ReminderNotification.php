<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class ReminderNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * @param  array{type:string,title:string,body:string,url:string}  $content
     */
    public function __construct(public array $content)
    {
    }

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toArray($notifiable): array
    {
        return [
            'type' => 'reminder',
            'kind' => $this->content['type'],
            'title' => $this->content['title'],
            'body' => $this->content['body'],
            'url' => $this->content['url'],
        ];
    }
}
