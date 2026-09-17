<?php

namespace App\Http\Controllers\Api\Call;

use App\Events\ConversationUpdated;
use App\Events\SeatClaimed;
use App\Events\SeatReleased;
use App\Http\Controllers\Controller;
use App\Models\CallParticipant;
use App\Models\Conversation;
use App\Models\RoomSeat;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RoomSeatController extends Controller
{
    /**
     * Seat map + capacity + live call for a room. Any member may read.
     */
    public function index(Request $request, Conversation $conversation)
    {
        $this->authorizeRoom($request, $conversation);

        $seats = $conversation->seats()->with('user:id,name,avatar_url')->get();

        return response()->json([
            'seat_capacity' => $conversation->seat_capacity,
            'seats' => $seats->map(fn (RoomSeat $seat) => [
                'seat_number' => $seat->seat_number,
                'user_id' => $seat->user_id,
                'user' => $seat->user ? [
                    'id' => $seat->user->id,
                    'name' => $seat->user->name,
                    'avatar_url' => $seat->user->avatar_url,
                ] : null,
            ]),
            'active_call_id' => $conversation->activeCallSession()?->id,
        ]);
    }

    /**
     * Claim a seat in a live room call. The UNIQUE constraints make
     * double booking impossible even under race conditions.
     */
    public function claim(Request $request, Conversation $conversation)
    {
        $user = $request->user();
        $this->authorizeRoom($request, $conversation);

        $validated = $request->validate([
            'seat_number' => ['required', 'integer', 'min:1'],
        ]);

        $session = $conversation->activeCallSession();
        abort_unless($session && $session->type === 'room', 422, 'There is no live room call to take a seat in.');

        abort_unless(
            $session->participants()->where('user_id', $user->id)
                ->where('status', CallParticipant::STATUS_JOINED)->exists(),
            422,
            'Join the call before taking a seat.'
        );

        $seatNumber = $validated['seat_number'];
        abort_if($seatNumber > $conversation->seat_capacity, 422, 'That seat does not exist.');

        abort_if(
            RoomSeat::where('conversation_id', $conversation->id)->where('user_id', $user->id)->exists(),
            422,
            'You already occupy a seat.'
        );

        abort_if(
            RoomSeat::where('conversation_id', $conversation->id)->whereNotNull('user_id')->count()
                >= $conversation->seat_capacity,
            409,
            'Room is full.'
        );

        try {
            DB::transaction(function () use ($conversation, $user, $seatNumber) {
                RoomSeat::create([
                    'conversation_id' => $conversation->id,
                    'seat_number' => $seatNumber,
                    'user_id' => $user->id,
                ]);
            });
        } catch (QueryException) {
            return response()->json(['message' => 'That seat was just taken.'], 409);
        }

        broadcast(new SeatClaimed($conversation->id, $seatNumber, $user->id, $user->name))->toOthers();

        return response()->json(['message' => 'Seat claimed.', 'seat_number' => $seatNumber], 201);
    }

    /**
     * Release a seat: your own, or (room admins) anyone's.
     */
    public function release(Request $request, Conversation $conversation, int $seatNumber)
    {
        $user = $request->user();
        $this->authorizeRoom($request, $conversation);

        $seat = RoomSeat::where('conversation_id', $conversation->id)
            ->where('seat_number', $seatNumber)
            ->first();

        abort_if(! $seat, 404, 'That seat does not exist.');

        $isAdmin = $conversation->isRoomAdmin($user);
        abort_unless($seat->user_id === $user->id || $isAdmin, 403, 'You cannot release this seat.');

        $releasedUserId = $seat->user_id;
        $seat->delete();

        broadcast(new SeatReleased($conversation->id, $seatNumber, $releasedUserId))->toOthers();

        return response()->json(['message' => 'Seat released.']);
    }

    /**
     * Configure seat capacity (room admins only, 1–50). Shrinking below
     * the occupied count is rejected so nobody is silently ejected.
     */
    public function capacity(Request $request, Conversation $conversation)
    {
        $user = $request->user();
        $this->authorizeRoom($request, $conversation);
        abort_unless($conversation->isRoomAdmin($user), 403, 'Only room admins can configure seats.');

        $validated = $request->validate([
            'seat_capacity' => ['required', 'integer', 'min:1', 'max:50'],
        ]);

        $occupied = RoomSeat::where('conversation_id', $conversation->id)
            ->whereNotNull('user_id')
            ->count();

        abort_if(
            $validated['seat_capacity'] < $occupied,
            422,
            "There are currently {$occupied} occupied seats."
        );

        $conversation->update(['seat_capacity' => $validated['seat_capacity']]);
        broadcast(new ConversationUpdated($conversation->load('participants')))->toOthers();

        return response()->json([
            'message' => 'Seat capacity updated.',
            'seat_capacity' => $conversation->seat_capacity,
        ]);
    }

    protected function authorizeRoom(Request $request, Conversation $conversation): void
    {
        abort_unless($conversation->isRoom(), 404, 'That room does not exist.');
        abort_unless($conversation->isMember($request->user()), 403);
    }
}
