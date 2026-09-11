<?php

namespace App\Http\Controllers\Api\Hog;

use App\Http\Controllers\Controller;
use App\Http\Resources\ConversationResource;
use App\Models\Conversation;
use Illuminate\Http\Request;

class RoomController extends Controller
{
    /**
     * Every public House of Guidance room (Tajweed, Hifdh, Arabic,
     * Ask the Sheikh, general Discussion), regardless of whether the
     * viewer has joined yet.
     */
    public function index(Request $request)
    {
        $rooms = Conversation::publicRooms()
            ->with('participants')
            ->orderBy('room_type')
            ->get();

        return ConversationResource::collection($rooms);
    }

    public function join(Request $request, Conversation $conversation)
    {
        abort_unless($conversation->is_public && $conversation->room_type, 404, 'That room does not exist.');

        $user = $request->user();

        if ($conversation->isMember($user)) {
            return new ConversationResource($conversation->load('participants'));
        }

        // Re-joining after having left before: update the existing pivot
        // row instead of inserting a duplicate.
        $existing = $conversation->participants()->where('user_id', $user->id)->exists();

        if ($existing) {
            $conversation->participants()->updateExistingPivot($user->id, [
                'left_at' => null,
                'joined_at' => now(),
            ]);
        } else {
            $conversation->participants()->attach($user->id, ['role' => 'member', 'joined_at' => now()]);
        }

        $conversation->logSystemMessage($user, "{$user->name} joined the room.");
        $conversation->load('participants');

        return new ConversationResource($conversation);
    }
}
