<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CallSessionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'media' => $this->media,
            'conversation_id' => $this->conversation_id,
            'initiator_id' => $this->initiator_id,
            'status' => $this->status,
            'started_at' => $this->started_at,
            'ended_at' => $this->ended_at,
            'initiator' => $this->whenLoaded('initiator', fn () => [
                'id' => $this->initiator->id,
                'name' => $this->initiator->name,
                'avatar_url' => $this->initiator->avatar_url,
            ]),
            'participants' => CallParticipantResource::collection($this->whenLoaded('participants')),
        ];
    }
}
