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
        $servers = [['urls' => explode(',', env('STUN_URLS', 'stun:stun.l.google.com:19302'))]];

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
     */
    public function active(Request $request, Conversation $conversation)
    {
        abort_unless($conversation->isMember($request->user()), 403);

        $session = $conversation->activeCallSession();

        if (! $session) {
            return response()->json(['session' => null]);
        }

        $session->load(['initiator', 'participants.user']);

        return new CallSessionResource($session);
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

        abort_if(
            (bool) $conversation->activeCallSession(),
            409,
            'There is already a live call in this conversation.'
        );

        $type = $conversation->isRoom()
            ? CallSession::TYPE_ROOM
            : ($conversation->type === 'private' ? CallSession::TYPE_PRIVATE : CallSession::TYPE_GROUP);

        // Room calls are started by room owners/admins; everyone else joins.
        if ($type === CallSession::TYPE_ROOM) {
            abort_unless($conversation->isRoomAdmin($user), 403, 'Only room admins can start a room call.');
        }

        $session = DB::transaction(function () use ($conversation, $user, $request, $type) {
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

            $otherIds = $conversation->activeParticipants()
                ->where('users.id', '!=', $user->id)
                ->pluck('users.id');

            foreach ($otherIds as $inviteeId) {
                $session->participants()->create([
                    'user_id' => $inviteeId,
                    'status' => CallParticipant::STATUS_INVITED,
                ]);
            }

            return $session;
        });

        $session->load(['initiator', 'participants.user']);
        broadcast(new CallInitiated($session))->toOthers();

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

        broadcast(new CallAccepted($session->id, $session->conversation_id, $participant))->toOthers();
        broadcast(new CallParticipantJoined(
            $session->id,
            $session->conversation_id,
            $request->user()
        ))->toOthers();

        $session->load(['initiator', 'participants.user']);

        return new CallSessionResource($session);
    }

    public function decline(Request $request, CallSession $session)
    {
        $participant = $this->authorizeInvited($request, $session);

        $participant->update(['status' => CallParticipant::STATUS_DECLINED]);

        broadcast(new CallDeclined($session->id, $session->conversation_id, $request->user()->id))->toOthers();

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
        abort_if(! $session->isLive(), 410, 'This call has already ended.');

        $othersJoined = $session->participants()
            ->where('status', CallParticipant::STATUS_JOINED)
            ->where('user_id', '!=', $user->id)
            ->exists();

        if ($othersJoined) {
            return $this->leave($request, $session);
        }

        $this->finishSession($session, 'cancelled');
        broadcast(new CallCancelled($session->id, $session->conversation_id))->toOthers();

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

        broadcast(new CallParticipantJoined(
            $session->id,
            $session->conversation_id,
            $user,
            (bool) $participant->is_muted,
            (bool) $participant->is_camera_off
        ))->toOthers();

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

        broadcast(new CallParticipantLeft($session->id, $session->conversation_id, $user->id, 'left'))->toOthers();

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
        broadcast(new CallEnded($session->id, $session->conversation_id, 'ended', $missed))->toOthers();

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

        broadcast(new CallParticipantJoined(
            $session->id,
            $session->conversation_id,
            $request->user(),
            (bool) $participant->fresh()->is_muted,
            (bool) $participant->fresh()->is_camera_off
        ))->toOthers();

        return response()->noContent();
    }

    /**
     * WebRTC signaling relay (offer / answer / ICE). The server
     * authorizes both ends and forwards the envelope — media itself
     * travels peer-to-peer (or a future SFU), never through here.
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

        broadcast(new CallSignal(
            $session->id,
            $session->conversation_id,
            $user->id,
            $validated['to_user_id'] ?? null,
            $validated['signal_type'],
            $validated['payload']
        ))->toOthers();

        return response()->noContent();
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

        broadcast(new CallParticipantLeft($session->id, $session->conversation_id, $user->id, 'removed'))->toOthers();

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
            broadcast(new CallEnded($session->id, $session->conversation_id, $reason, $missed))->toOthers();
        }
    }

    /**
     * @return int[] user ids that never joined (missed call)
     */
    protected function finishSession(CallSession $session, string $reason): array
    {
        return DB::transaction(function () use ($session, $reason) {
            $session->update(['status' => CallSession::STATUS_ENDED, 'ended_at' => now()]);

            $missed = $session->participants()
                ->where('status', CallParticipant::STATUS_INVITED)
                ->pluck('user_id')
                ->all();

            if ($missed !== []) {
                $session->participants()->whereIn('user_id', $missed)
                    ->update(['status' => CallParticipant::STATUS_MISSED]);
            }

            RoomSeat::where('conversation_id', $session->conversation_id)->delete();

            $session->loadMissing('initiator');

            foreach ($missed as $userId) {
                User::find($userId)?->notify(new MissedCallNotification($session));
            }

            $conversation = $session->conversation;
            $conversation->logSystemMessage(
                $session->initiator,
                $reason === 'cancelled'
                    ? "{$session->initiator->name} cancelled the {$session->media} call."
                    : "{$session->initiator->name} ended the {$session->media} call."
            );
            broadcast(new ConversationUpdated($conversation))->toOthers();

            return $missed;
        });
    }

    protected function releaseSeat(int $conversationId, int $userId): void
    {
        $seat = RoomSeat::where('conversation_id', $conversationId)
            ->where('user_id', $userId)
            ->first();

        if ($seat) {
            $number = $seat->seat_number;
            $seat->delete();
            broadcast(new SeatReleased($conversationId, $number, $userId))->toOthers();
        }
    }
}
