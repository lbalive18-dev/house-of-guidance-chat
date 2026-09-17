<?php

namespace App\Console\Commands;

use App\Events\CallEnded;
use App\Events\CallParticipantLeft;
use App\Events\SeatReleased;
use App\Models\CallParticipant;
use App\Models\CallSession;
use App\Models\RoomSeat;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class PruneStaleCallParticipants extends Command
{
    protected $signature = 'calls:prune-stale {--timeout=120 : seconds without a heartbeat before a participant is dropped}';

    protected $description = 'Drop call participants with stale heartbeats (disconnect cleanup) and release their seats.';

    public function handle(): int
    {
        $cutoff = now()->subSeconds((int) $this->option('timeout'));

        $stale = CallParticipant::where('status', CallParticipant::STATUS_JOINED)
            ->where(function ($query) use ($cutoff) {
                $query->where('last_heartbeat_at', '<', $cutoff)
                    ->orWhere(function ($query) use ($cutoff) {
                        $query->whereNull('last_heartbeat_at')->where('joined_at', '<', $cutoff);
                    });
            })
            ->with('session')
            ->get();

        $prunedSessions = [];

        foreach ($stale as $participant) {
            DB::transaction(function () use ($participant, &$prunedSessions) {
                $participant->update(['status' => CallParticipant::STATUS_LEFT, 'left_at' => now()]);

                $seat = RoomSeat::where('conversation_id', $participant->session->conversation_id)
                    ->where('user_id', $participant->user_id)
                    ->first();

                if ($seat) {
                    $number = $seat->seat_number;
                    $seat->delete();
                    broadcast(new SeatReleased($participant->session->conversation_id, $number, $participant->user_id))->toOthers();
                }

                broadcast(new CallParticipantLeft(
                    $participant->call_session_id,
                    $participant->session->conversation_id,
                    $participant->user_id,
                    'timeout'
                ))->toOthers();

                $prunedSessions[$participant->call_session_id] = $participant->session->conversation_id;
            });
        }

        // End sessions left with nobody joined.
        foreach ($prunedSessions as $sessionId => $conversationId) {
            $session = CallSession::find($sessionId);

            if ($session && $session->isLive()
                && ! $session->participants()->where('status', CallParticipant::STATUS_JOINED)->exists()) {
                $session->update(['status' => CallSession::STATUS_ENDED, 'ended_at' => now()]);
                broadcast(new CallEnded($session->id, $conversationId, 'ended', []))->toOthers();
            }
        }

        $this->info("Pruned {$stale->count()} stale call participant(s).");

        return self::SUCCESS;
    }
}
