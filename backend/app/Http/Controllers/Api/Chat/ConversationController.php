<?php

namespace App\Http\Controllers\Api\Chat;

use App\Http\Controllers\Controller;
use App\Http\Requests\Chat\StartConversationRequest;
use App\Http\Resources\ConversationResource;
use App\Models\Conversation;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ConversationController extends Controller
{
    /**
     * List the authenticated user's conversations, most recent activity first.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $conversations = $user->conversations()
            ->wherePivotNull('left_at')
            ->with(['latestMessage.sender', 'participants'])
            ->orderByDesc('last_message_at')
            ->paginate($this->perPage($request, 20));

        return ConversationResource::collection($conversations);
    }

    public function show(Request $request, Conversation $conversation)
    {
        $this->authorizeParticipant($request, $conversation);

        $conversation->load(['latestMessage.sender', 'participants']);

        return new ConversationResource($conversation);
    }

    /**
     * Find the existing private conversation with the given user, or create one.
     */
    public function start(StartConversationRequest $request)
    {
        $user = $request->user();
        $otherUser = User::findOrFail($request->validated('user_id'));

        $conversation = Conversation::query()
            ->where('type', 'private')
            ->whereHas('participants', fn ($q) => $q->where('user_id', $user->id))
            ->whereHas('participants', fn ($q) => $q->where('user_id', $otherUser->id))
            ->first();

        if (! $conversation) {
            $conversation = DB::transaction(function () use ($user, $otherUser) {
                $conversation = Conversation::create([
                    'type' => 'private',
                    'created_by' => $user->id,
                ]);

                $conversation->participants()->attach([
                    $user->id => ['role' => 'member', 'joined_at' => now()],
                    $otherUser->id => ['role' => 'member', 'joined_at' => now()],
                ]);

                return $conversation;
            });
        }

        $conversation->load(['latestMessage.sender', 'participants']);

        return new ConversationResource($conversation);
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
