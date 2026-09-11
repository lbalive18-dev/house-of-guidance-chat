<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Message */
class MessageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $viewerId = $request->user()?->id;

        return [
            'id' => $this->id,
            'conversation_id' => $this->conversation_id,
            'sender' => new UserResource($this->whenLoaded('sender')),
            'type' => $this->type,
            'body' => $this->isDeleted() ? null : $this->body,
            'is_mine' => $this->sender_id === $viewerId,
            'is_deleted' => $this->isDeleted(),
            'is_edited' => $this->edited_at !== null,
            'is_editable' => $this->sender_id === $viewerId && $this->isEditable(),
            'is_read_by_recipient' => $this->when(
                $this->sender_id === $viewerId,
                fn () => (bool) $this->getAttribute('is_read_by_recipient')
            ),
            'reply_to' => $this->whenLoaded('replyTo', function () {
                if (! $this->replyTo) {
                    return null;
                }

                return [
                    'id' => $this->replyTo->id,
                    'sender_name' => $this->replyTo->sender?->name,
                    'body' => $this->replyTo->isDeleted() ? null : $this->replyTo->body,
                    'type' => $this->replyTo->type,
                    'is_deleted' => $this->replyTo->isDeleted(),
                ];
            }),
            'attachments' => AttachmentResource::collection($this->whenLoaded('attachments')),
            'reactions' => $this->whenLoaded('reactions', function () use ($viewerId) {
                return $this->reactions
                    ->groupBy('emoji')
                    ->map(fn ($group, $emoji) => [
                        'emoji' => $emoji,
                        'count' => $group->count(),
                        'reacted_by_me' => $group->contains('user_id', $viewerId),
                        'user_names' => $group->pluck('user.name'),
                    ])
                    ->values();
            }),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
