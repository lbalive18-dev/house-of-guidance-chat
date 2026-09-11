<?php

namespace App\Http\Controllers\Api\Chat;

use App\Events\MessageReactionUpdated;
use App\Http\Controllers\Controller;
use App\Http\Requests\Chat\ReactRequest;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\MessageReaction;
use Illuminate\Http\Request;

class MessageReactionController extends Controller
{
    /**
     * Toggle the given emoji: if the user already reacted with it, remove
     * it; otherwise set/replace their single reaction on this message.
     */
    public function store(ReactRequest $request, Conversation $conversation, Message $message)
    {
        $this->authorizeParticipant($request, $conversation);
        abort_if($message->conversation_id !== $conversation->id, 404);

        $user = $request->user();
        $emoji = $request->validated('emoji');

        $existing = MessageReaction::where('message_id', $message->id)
            ->where('user_id', $user->id)
            ->first();

        if ($existing && $existing->emoji === $emoji) {
            $existing->delete();
        } else {
            MessageReaction::updateOrCreate(
                ['message_id' => $message->id, 'user_id' => $user->id],
                ['emoji' => $emoji]
            );
        }

        $message->load('reactions.user');

        broadcast(new MessageReactionUpdated($message))->toOthers();

        return response()->json([
            'reactions' => $message->reactions
                ->groupBy('emoji')
                ->map(fn ($group, $emoji) => [
                    'emoji' => $emoji,
                    'count' => $group->count(),
                    'reacted_by_me' => $group->contains('user_id', $user->id),
                    'user_names' => $group->pluck('user.name'),
                ])
                ->values(),
        ]);
    }

    protected function authorizeParticipant(Request $request, Conversation $conversation): void
    {
        abort_unless(
            $conversation->participants()->where('user_id', $request->user()->id)->exists(),
            403,
            'You are not a participant in this conversation.'
        );
    }
}
