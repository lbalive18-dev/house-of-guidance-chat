<?php

namespace App\Http\Controllers\Api\Call;

use App\Events\CallAccepted;
use App\Events\CallCancelled;
use App\Events\CallDeclined;
use App\Events\CallEnded;
use App\Events\CallInitiated;
use App\Events\CallParticipantJoined;
use App\Events\CallParticipantLeft;
use App\Events\CallSignal;
use App\Events\ConversationUpdated;
use App\Events\SeatReleased;
use App\Http\Controllers\Controller;
use App\Http\Requests\Call\StartCallRequest;
use App\Http\Resources\CallSessionResource;
use App\Models\CallParticipant;
use App\Models\CallSession;
use App\Models\CallSignalRecord;
use App\Models\Conversation;
use App\Models\RoomSeat;
use App\Models\User;
use App\Notifications\MissedCallNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CallController extends Controller
{
    /**
     * ICE servers for WebRTC. STUN/TURN come from the environment — no
     * credentials are ever hard-coded. TURN entries are only advertised
     * when fully configured.
     */
    public function iceServers(Request $request)
    {
        $stunUrls = array_values(array_filter(array_map(
            'trim',
            explode(',', env('STUN_URLS', 'stun:stun.l.google.com:19302,stun:stun.cloudflare.com:3478'))
        )));
        $servers = $stunUrls !== [] ? [['urls' => $stunUrls]] : [];

        if (env('TURN_URLS') && env('TURN_USERNAME') && env('TURN_CREDENTIAL')) {
            $servers[] = [
                'urls' => explode(',', env('TURN_URLS')),
                'username' => env('TURN_USERNAME'),
                'credential' => env('TURN_CREDENTIAL'),
            ];
        }

        return response()->json(['ice_servers' => $servers]);
    }

    /**
     * Active (ringing) call for a conversation, if any — drives call badges.
     * Always wrapped as {session: ...} so web clients can share one parser
     * with the incoming-call fallback endpoint.
     */
    public function active(Request $request, Conversation $conversation)
    {
        abort_unless($conversation->isMember($request->user()), 403);

        $session = $conversation->activeCallSession();

        if (! $session) {
            return response()->json(['session' => null]);
        }

        $session->load(['initiator', 'participants.user']);

        return response()->json([
            'session' => (new CallSessionResource($session))->resolve(),
        ]);
    }

    /**
     * Recover an incoming ring if the browser missed the Reverb event while
     * its private-channel subscription was connecting or reconnecting.
     */
    public function incoming(Request $request)
    {
        $session = CallSession::query()
            ->where(function ($query) {
                $query->where('status', CallSession::STATUS_ACTIVE)
                    ->orWhere(function ($query) {
                        $query->where('status', CallSession::STATUS_RINGING)
                            ->where('created_at', '>=', now()->subSeconds(60));
                    });
            })
            ->whereHas('participants', fn ($query) => $query
                ->where('user_id', $request->user()->id)
                ->where('status', CallParticipant::STATUS_INVITED))
            ->with(['initiator', 'participants.user'])
            ->latest()
            ->first();

        return response()->json([
            'session' => $session ? (new CallSessionResource($session))->resolve() : null,
        ]);
    }

    public function show(Request $request, CallSession $session)
    {
        $this->authorizeCallMember($request, $session);
        $session->load(['initiator', 'participants.user']);

        return new CallSessionResource($session);
    }

    public function start(StartCallRequest $request)
    {
        $user = $request->user();
        $conversation = Conversation::findOrFail($request->validated('conversation_id'));

        abort_unless($conversation->isMember($user), 403, 'Only conversation members can start calls.');

        $otherParticipants = $conversation->activeParticipants()
            ->where('users.id', '!=', $user->id);

        if ($conversation->type === 'private') {
            $callee = (clone $otherParticipants)->first();
            abort_if(
                ! $callee || ! $callee->is_online,
                409,
                'This person is offline right now. Send them a message instead.'
            );
        }

        $type = $conversation->isRoom()
            ? CallSession::TYPE_ROOM
            : ($conversation->type === 'private' ? CallSession::TYPE_PRIVATE : CallSession::TYPE_GROUP);

        $session = DB::transaction(function () use ($conversation, $user, $request, $type) {
            $conversation = Conversation::query()
                ->whereKey($conversation->id)
                ->lockForUpdate()
                ->firstOrFail();

            abort_if(
                (bool) $conversation->activeCallSession(),
                409,
                'There is already a live call in this conversation.'
            );

            $otherIds = $conversation->activeParticipants()
                ->where('users.id', '!=', $user->id)
                ->where('users.last_seen_at', '>=', now()->subMinutes(2))
                ->pluck('users.id');

            abort_if(
                $type !== CallSession::TYPE_ROOM && $otherIds->isEmpty(),
                409,
                'No other members are online right now.'
            );

            $session = CallSession::create([
                'type' => $type,
                'media' => $request->validated('media'),
                'conversation_id' => $conversation->id,
                'initiator_id' => $user->id,
                'status' => CallSession::STATUS_RINGING,
            ]);

            $session->participants()->create([
                'user_id' => $user->id,
                'status' => CallParticipant::STATUS_JOINED,
                'is_camera_off' => $request->validated('media') === 'audio',
                'joined_at' => now(),
                'last_heartbeat_at' => now(),
            ]);

            foreach ($otherIds as $inviteeId) {
                $session->participants()->create([
                    'user_id' => $inviteeId,
                    'status' => CallParticipant::STATUS_INVITED,
                ]);
            }

            return $session;
        });

        $session->load(['initiator', 'participants.user']);
        $this->broadcastSafely(new CallInitiated($session));

        // Ring offline devices with an urgent push: the stored notification
        // is what their service worker renders, even with the app closed.
        foreach ($session->participants as $participant) {
            if ($participant->user_id === $user->id) {
                continue;
            }
            if ($participant->status !== CallParticipant::STATUS_INVITED) {
                continue;
            }
            try {
                $participant->user?->notify(new \App\Notifications\IncomingCallNotification($session));
                \App\Jobs\SendPushTickle::dispatch($participant->user_id, 'high', 300);
            } catch (\Throwable $exception) {
                report($exception);
            }
        }

        return new CallSessionResource($session);
    }

    public function accept(Request $request, CallSession $session)
    {
        $participant = $this->authorizeInvited($request, $session);

        $participant->update([
            'status' => CallParticipant::STATUS_JOINED,
            'joined_at' => now(),
            'last_heartbeat_at' => now(),
        ]);

        if ($session->status === CallSession::STATUS_RINGING) {
            $session->update(['status' => CallSession::STATUS_ACTIVE, 'started_at' => now()]);
        }

        $this->broadcastSafely(new CallAccepted($session->id, $session->conversation_id, $participant));
        $this->broadcastSafely(new CallParticipantJoined(
            $session->id,
            $session->conversation_id,
            $request->user()
        ));

        $session->load(['initiator', 'participants.user']);

        return new CallSessionResource($session);
    }

    public function decline(Request $request, CallSession $session)
    {
        $participant = $this->authorizeInvited($request, $session);

        $participant->update(['status' => CallParticipant::STATUS_DECLINED]);

        $this->broadcastSafely(new CallDeclined($session->id, $session->conversation_id, $request->user()->id));

        $this->maybeAutoEnd($session);

        return response()->json(['message' => 'Call declined.']);
    }

    /**
     * Caller hangs up while still ringing. Once others have joined it
     * degrades to a normal end for everyone.
     */
    public function cancel(Request $request, CallSession $session)
    {
        $user = $request->user();
        abort_unless($session->initiator_id === $user->id, 403, 'Only the caller can cancel.');

        if (! $session->isLive()) {
            return response()->json(['message' => 'This call has already ended.']);
        }

        $othersJoined = $session->participants()
            ->where('status', CallParticipant::STATUS_JOINED)
            ->where('user_id', '!=', $user->id)
            ->exists();

        if ($othersJoined) {
            return $this->leave($request, $session);
        }

        $missed = $this->finishSession($session, 'cancelled');
        $this->broadcastSafely(new CallCancelled($session->id, $session->conversation_id, $missed));

        return response()->json(['message' => 'Call cancelled.']);
    }

    /**
     * Join a ringing/active group or room call synergy-free: any
     * conversation member may join mid-call.
     */
    public function join(Request $request, CallSession $session)
    {
        $user = $request->user();
        $this->authorizeCallMember($request, $session);
        abort_if(! $session->isLive(), 410, 'This call has already ended.');

        $participant = $session->participants()->where('user_id', $user->id)->first();

        if ($participant) {
            abort_if($participant->status === CallParticipant::STATUS_REMOVED, 403, 'You were removed from this call.');
            $participant->update([
                'status' => CallParticipant::STATUS_JOINED,
                'joined_at' => now(),
                'left_at' => null,
                'last_heartbeat_at' => now(),
            ]);
        } else {
            $participant = $session->participants()->create([
                'user_id' => $user->id,
                'status' => CallParticipant::STATUS_JOINED,
                'joined_at' => now(),
                'last_heartbeat_at' => now(),
            ]);
        }

        if ($session->status === CallSession::STATUS_RINGING) {
            $session->update(['status' => CallSession::STATUS_ACTIVE, 'started_at' => now()]);
        }

        $this->broadcastSafely(new CallParticipantJoined(
            $session->id,
            $session->conversation_id,
            $user,
            (bool) $participant->is_muted,
            (bool) $participant->is_camera_off
        ));

        $session->load(['initiator', 'participants.user']);

        return new CallSessionResource($session);
    }

    public function leave(Request $request, CallSession $session)
    {
        $user = $request->user();
        $participant = $session->participants()->where('user_id', $user->id)->first();

        abort_unless($participant && $participant->isInCall(), 422, 'You are not in this call.');

        $participant->update(['status' => CallParticipant::STATUS_LEFT, 'left_at' => now()]);
        $this->releaseSeat($session->conversation_id, $user->id);

        $this->broadcastSafely(new CallParticipantLeft($session->id, $session->conversation_id, $user->id, 'left'));

        $this->maybeAutoEnd($session, 'ended');

        return response()->json(['message' => 'Left the call.']);
    }

    /**
     * End the call for everyone. Allowed for the initiator and for
     * group/room admins. Never-joined invitees are marked missed.
     */
    public function end(Request $request, CallSession $session)
    {
        $user = $request->user();
        abort_if(! $session->isLive(), 410, 'This call has already ended.');

        $conversation = $session->conversation;
        $isAdmin = $conversation->type === 'group'
            && ($session->initiator_id === $user->id || $conversation->isRoomAdmin($user));

        abort_unless(
            $session->initiator_id === $user->id || $isAdmin
                || $session->participants()->where('user_id', $user->id)
                    ->where('status', CallParticipant::STATUS_JOINED)->exists(),
            403,
            'You cannot end this call.'
        );

        // A plain participant hanging up just leaves; the session survives.
        $isPrivilegedEnd = $session->initiator_id === $user->id || $isAdmin;

        if (! $isPrivilegedEnd) {
            return $this->leave($request, $session);
        }

        $missed = $this->finishSession($session, 'ended');
        $this->broadcastSafely(new CallEnded($session->id, $session->conversation_id, 'ended', $missed));

        return response()->json(['message' => 'Call ended.', 'missed_user_ids' => $missed]);
    }

    public function heartbeat(Request $request, CallSession $session)
    {
        $participant = $session->participants()->where('user_id', $request->user()->id)->first();

        abort_unless($participant && $participant->isInCall() && $session->isLive(), 422);

        $participant->update(['last_heartbeat_at' => now()]);

        return response()->noContent();
    }

    public function mediaState(Request $request, CallSession $session)
    {
        $participant = $session->participants()->where('user_id', $request->user()->id)->first();

        abort_unless($participant && $participant->isInCall(), 422, 'You are not in this call.');

        $validated = $request->validate([
            'is_muted' => ['sometimes', 'boolean'],
            'is_camera_off' => ['sometimes', 'boolean'],
        ]);

        $participant->update($validated);

        $this->broadcastSafely(new CallParticipantJoined(
            $session->id,
            $session->conversation_id,
            $request->user(),
            (bool) $participant->fresh()->is_muted,
            (bool) $participant->fresh()->is_camera_off
        ));

        return response()->noContent();
    }

    /**
     * WebRTC signaling relay (offer / answer / ICE). The server
     * authorizes both ends and forwards the envelope — media itself
     * travels peer-to-peer (or a future SFU), never through here.
     *
     * Envelopes are ALSO stored briefly so devices whose websocket is
     * down can still poll them while connecting (see signals()).
     */
    public function signal(Request $request, CallSession $session)
    {
        $user = $request->user();
        $sender = $session->participants()->where('user_id', $user->id)->first();

        abort_unless($sender && $sender->isInCall() && $session->isLive(), 403, 'You are not in this call.');

        $validated = $request->validate([
            'to_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'signal_type' => ['required', 'in:offer,answer,ice'],
            'payload' => ['required', 'array', 'max:20'],
        ]);

        if ($validated['to_user_id'] ?? null) {
            $recipientJoined = $session->participants()
                ->where('user_id', $validated['to_user_id'])
                ->where('status', CallParticipant::STATUS_JOINED)
                ->exists();

            abort_unless($recipientJoined, 422, 'The recipient is not in this call.');
        }

        try {
            CallSignalRecord::create([
                'call_session_id' => $session->id,
                'from_user_id' => $user->id,
                'to_user_id' => $validated['to_user_id'] ?? null,
                'signal_type' => $validated['signal_type'],
                'payload' => $validated['payload'],
            ]);

            // Best-effort prune: signaling rows are worthless after minutes.
            CallSignalRecord::where('created_at', '<', now()->subMinutes(10))->delete();
        } catch (\Throwable $exception) {
            // Persistence is a fallback convenience — a storage hiccup must
            // never block the instant broadcast path below.
            report($exception);
        }

        $this->broadcastSafely(new CallSignal(
            $session->id,
            $session->conversation_id,
            $user->id,
            $validated['to_user_id'] ?? null,
            $validated['signal_type'],
            $validated['payload']
        ));

        return response()->noContent();
    }

    /**
     * Poll stored signaling envelopes addressed to the requester.
     *
     * Devices poll this while connecting so negotiation completes even
     * when their websocket subscription is down. Only envelopes sent by
     * someone else, addressed to everyone or to the requester, after the
     * given cursor are returned (oldest first, capped).
     */
    public function signals(Request $request, CallSession $session)
    {
        $user = $request->user();
        $this->authorizeCallMember($request, $session);
        abort_if(! $session->isLive(), 410, 'This call has already ended.');

        $afterId = (int) $request->query('after_id', 0);

        $signals = CallSignalRecord::query()
            ->where('call_session_id', $session->id)
            ->where('id', '>', $afterId)
            ->where('from_user_id', '!=', $user->id)
            ->where(function ($query) use ($user) {
                $query->whereNull('to_user_id')->orWhere('to_user_id', $user->id);
            })
            ->orderBy('id')
            ->limit(50)
            ->get()
            ->map(fn (CallSignalRecord $record) => [
                'id' => $record->id,
                'session_id' => $session->id,
                'from_user_id' => $record->from_user_id,
                'to_user_id' => $record->to_user_id,
                'signal_type' => $record->signal_type,
                'payload' => $record->payload,
            ]);

        return response()->json(['signals' => $signals]);
    }

    /**
     * Remove a participant (initiator or group/room admin only).
     */
    public function removeParticipant(Request $request, CallSession $session, User $user)
    {
        $actor = $request->user();
        $conversation = $session->conversation;

        $allowed = $session->initiator_id === $actor->id
            || ($conversation->type === 'group' && $conversation->isRoomAdmin($actor));

        abort_unless($allowed, 403, 'Only the caller or an admin can remove participants.');
        abort_if($user->id === $session->initiator_id, 422, 'The initiator cannot be removed.');

        $participant = $session->participants()->where('user_id', $user->id)->first();
        abort_unless($participant && $participant->isInCall(), 422, 'That user is not in this call.');

        $participant->update(['status' => CallParticipant::STATUS_REMOVED, 'left_at' => now()]);
        $this->releaseSeat($session->conversation_id, $user->id);

        $this->broadcastSafely(new CallParticipantLeft($session->id, $session->conversation_id, $user->id, 'removed'));

        $this->maybeAutoEnd($session, 'ended');

        return response()->json(['message' => 'Participant removed.']);
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    protected function authorizeCallMember(Request $request, CallSession $session): void
    {
        abort_unless($session->conversation->isMember($request->user()), 403);
    }

    protected function authorizeInvited(Request $request, CallSession $session): CallParticipant
    {
        $this->authorizeCallMember($request, $session);
        abort_if(! $session->isLive(), 410, 'This call has already ended.');

        $participant = $session->participants()->where('user_id', $request->user()->id)->first();

        abort_unless(
            $participant && in_array($participant->status, [
                CallParticipant::STATUS_INVITED,
                CallParticipant::STATUS_JOINED,
            ], true),
            422,
            'No pending invitation for you on this call.'
        );

        return $participant;
    }

    /**
     * End sessions nobody is in anymore. Returns the missed user ids.
     */
    protected function maybeAutoEnd(CallSession $session, string $reason = 'declined'): void
    {
        $session->refresh();

        if (! $session->isLive()) {
            return;
        }

        $anyJoined = $session->participants()
            ->where('status', CallParticipant::STATUS_JOINED)
            ->exists();

        if (! $anyJoined) {
            $missed = $this->finishSession($session, $reason);
            $this->broadcastSafely(new CallEnded($session->id, $session->conversation_id, $reason, $missed));
        }
    }

    /**
     * @return int[] user ids that never joined (missed call)
     */
    protected function finishSession(CallSession $session, string $reason): array
    {
        $result = DB::transaction(function () use ($session) {
            $lockedSession = CallSession::query()
                ->whereKey($session->id)
                ->lockForUpdate()
                ->first();

            if (! $lockedSession || ! $lockedSession->isLive()) {
                return ['finished' => false, 'missed' => []];
            }

            $lockedSession->update([
                'status' => CallSession::STATUS_ENDED,
                'ended_at' => now(),
            ]);

            $missed = $lockedSession->participants()
                ->where('status', CallParticipant::STATUS_INVITED)
                ->pluck('user_id')
                ->all();

            if ($missed !== []) {
                $lockedSession->participants()->whereIn('user_id', $missed)
                    ->update(['status' => CallParticipant::STATUS_MISSED]);
            }

            RoomSeat::where('conversation_id', $lockedSession->conversation_id)->delete();

            return ['finished' => true, 'missed' => $missed];
        });

        if (! $result['finished']) {
            return [];
        }

        $missed = $result['missed'];
        $session->refresh()->loadMissing(['initiator', 'conversation']);

        foreach ($missed as $userId) {
            try {
                User::find($userId)?->notify(new MissedCallNotification($session));
            } catch (\Throwable $exception) {
                report($exception);
            }
        }

        $conversation = $session->conversation;
        try {
            $conversation->logSystemMessage(
                $session->initiator,
                $reason === 'cancelled'
                    ? "{$session->initiator->name} cancelled the {$session->media} call."
                    : "{$session->initiator->name} ended the {$session->media} call."
            );
        } catch (\Throwable $exception) {
            report($exception);
        }

        $this->broadcastSafely(new ConversationUpdated($conversation));

        return $missed;
    }

    protected function releaseSeat(int $conversationId, int $userId): void
    {
        $seat = RoomSeat::where('conversation_id', $conversationId)
            ->where('user_id', $userId)
            ->first();

        if ($seat) {
            $number = $seat->seat_number;
            $seat->delete();
            $this->broadcastSafely(new SeatReleased($conversationId, $number, $userId));
        }
    }

    protected function broadcastSafely(object $event): void
    {
        try {
            broadcast($event)->toOthers();
        } catch (\Throwable $exception) {
            // A realtime outage must not roll back or misreport committed
            // call/session changes to the caller.
            report($exception);
        }
    }
}
