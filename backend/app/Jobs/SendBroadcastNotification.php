<?php

namespace App\Jobs;

use App\Models\User;
use App\Notifications\BroadcastNotification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Notification;

class SendBroadcastNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public string $title,
        public string $body,
        public string $audience,
        public string $senderName
    ) {
    }

    public function handle(): void
    {
        User::query()
            ->where('is_banned', false)
            ->when($this->audience === 'students', fn ($q) => $q->where('role', 'student'))
            ->when($this->audience === 'teachers', fn ($q) => $q->where('role', 'teacher'))
            ->when($this->audience === 'admins', fn ($q) => $q->where('role', 'admin'))
            ->chunk(200, function ($users) {
                Notification::send($users, new BroadcastNotification($this->title, $this->body, $this->senderName));
            });
    }
}
