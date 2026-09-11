<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Conversation */
class ConversationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $viewer = $request->user();
        $otherUser = $this->type === 'private' ? $this->otherParticipant($viewer) : null;
        $latest = $this->relationLoaded('latestMessage') ? $this->latestMessage : null;

        $pivot = $this->participants->firstWhere('id', $viewer?->id)?->pivot;
        $unreadCount = $pivot
            ? $this->messages()
                ->where('sender_id', '!=', $viewer->id)
                ->when($pivot->last_read_at, fn ($q) => $q->where('created_at', '>', $pivot->last_read_at))
                ->count()
            : 0;

        return [
            'id' => $this->id,
            'type' => $this->type,
            'room_type' => $this->room_type,
            'is_public' => $this->is_public,
            'is_member' => $viewer ? $this->isMember($viewer) : false,
            'name' => $this->type === 'group' ? $this->name : $otherUser?->name,
            'description' => $this->description,
            'avatar_url' => $this->type === 'group' ? $this->avatar_url : $otherUser?->avatar_url,
            'is_online' => $this->type === 'private' ? (bool) $otherUser?->is_online : null,
            'other_user_id' => $otherUser?->id,
            'participant_count' => $this->type === 'group' ? $this->activeParticipants()->count() : null,
            'my_role' => $this->type === 'group' ? $pivot?->role : null,
            'members' => $this->type === 'group' && $this->relationLoaded('participants')
                ? $this->participants->map(fn ($member) => [
                    'id' => $member->id,
                    'name' => $member->name,
                    'avatar_url' => $member->avatar_url,
                    'is_online' => $member->is_online,
                    'role' => $member->pivot->role,
                ])->values()
                : null,
            'last_message' => $latest ? [
                'id' => $latest->id,
                'body' => $latest->isDeleted() ? null : $latest->body,
                'type' => $latest->type,
                'sender_id' => $latest->sender_id,
                'is_deleted' => $latest->isDeleted(),
                'created_at' => $latest->created_at?->toIso8601String(),
            ] : null,
            'unread_count' => $unreadCount,
            'last_message_at' => $this->last_message_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
