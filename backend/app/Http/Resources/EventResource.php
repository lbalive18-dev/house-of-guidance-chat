<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Event */
class EventResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $viewer = $request->user();
        $registrationCount = $this->registrations_count ?? $this->registrations()->count();

        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'location' => $this->location,
            'event_type' => $this->event_type,
            'starts_at' => $this->starts_at?->toIso8601String(),
            'ends_at' => $this->ends_at?->toIso8601String(),
            'creator' => new UserResource($this->whenLoaded('creator')),
            'requires_registration' => $this->requires_registration,
            'capacity' => $this->capacity,
            'registration_count' => $registrationCount,
            'is_full' => $this->capacity !== null && $registrationCount >= $this->capacity,
            'is_registered' => $viewer
                ? $this->registrations->contains('user_id', $viewer->id)
                : false,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
