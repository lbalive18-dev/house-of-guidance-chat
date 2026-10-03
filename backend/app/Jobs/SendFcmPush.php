<?php

namespace App\Jobs;

use App\Services\FcmService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendFcmPush implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * @param  array{title:string,body:string,url:string,tag?:string}  $content
     */
    public function __construct(
        public int $userId,
        public array $content,
        public string $urgency = 'normal',
    ) {
    }

    public function handle(FcmService $fcm): void
    {
        // Native devices render this content directly — no extra fetch.
        $fcm->sendToUser($this->userId, $this->content, $this->urgency);
    }
}
