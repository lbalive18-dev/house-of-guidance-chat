<?php

use App\Models\Conversation;
use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
*/

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// A user may listen on a conversation channel only if they are an active
// participant. Returning the small payload below also lets Echo's presence
// features (used for typing indicators) know who is listening.
Broadcast::channel('conversation.{conversationId}', function ($user, $conversationId) {
    $conversation = Conversation::find($conversationId);

    if (! $conversation) {
        return false;
    }

    $isParticipant = $conversation->participants()
        ->where('user_id', $user->id)
        ->wherePivotNull('left_at')
        ->exists();

    return $isParticipant
        ? ['id' => $user->id, 'name' => $user->name, 'avatar_url' => $user->avatar_url]
        : false;
});
