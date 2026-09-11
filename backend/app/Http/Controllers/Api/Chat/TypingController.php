<?php

namespace App\Http\Controllers\Api\Chat;

use App\Events\UserTyping;
use App\Http\Controllers\Controller;
use App\Models\Conversation;
use Illuminate\Http\Request;

class TypingController extends Controller
{
    public function __invoke(Request $request, Conversation $conversation)
    {
        abort_unless(
            $conversation->participants()->where('user_id', $request->user()->id)->exists(),
            403
        );

        $request->validate(['is_typing' => ['required', 'boolean']]);

        broadcast(new UserTyping(
            $conversation->id,
            $request->user(),
            $request->boolean('is_typing')
        ))->toOthers();

        return response()->noContent();
    }
}
