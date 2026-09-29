<?php

namespace App\Jobs;

use App\Services\WebPushService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendPushTickle implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public int $userId,
        public string $urgency = 'normal',
        public int $ttl = 3600,
    ) {
    }

    public function handle(WebPushService $push): void
    {
        // Tickle only: the device fetches the real content (already stored
        // as a database notification) and renders it locally.
        $push->tickleUser($this->userId, $this->urgency, $this->ttl);
    }
}
