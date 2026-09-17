<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class Conversation extends Model
{
    use HasFactory;

    protected $fillable = [
        'type',
        'room_type',
        'is_public',
        'seat_capacity',
        'name',
        'description',
        'avatar_path',
        'created_by',
        'last_message_at',
    ];

    protected function casts(): array
    {
        return [
            'last_message_at' => 'datetime',
            'is_public' => 'boolean',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function participants(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'conversation_participants')
            ->withPivot([
                'role',
                'last_read_at',
                'muted_until',
                'joined_at',
                'left_at',
            ])
            ->withTimestamps();
    }

    public function activeParticipants(): BelongsToMany
    {
        return $this->participants()->wherePivotNull('left_at');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    public function callSessions(): HasMany
    {
        return $this->hasMany(CallSession::class);
    }

    public function activeCallSession(): ?CallSession
    {
        return $this->callSessions()
            ->whereIn('status', [CallSession::STATUS_RINGING, CallSession::STATUS_ACTIVE])
            ->latest()
            ->first();
    }

    public function seats(): HasMany
    {
        return $this->hasMany(RoomSeat::class)->orderBy('seat_number');
    }

    public function isRoom(): bool
    {
        return $this->room_type !== null;
    }

    public function isRoomAdmin(User $user): bool
    {
        if ($this->created_by === $user->id) {
            return true;
        }

        return $this->participants()
            ->where('user_id', $user->id)
            ->wherePivot('role', 'admin')
            ->wherePivotNull('left_at')
            ->exists();
    }

    public function latestMessage(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(Message::class)->latestOfMany();
    }

    protected function avatarUrl(): Attribute
    {
        return Attribute::get(
            fn () => $this->avatar_path
                ? Storage::disk('public')->url($this->avatar_path)
                : null
        );
    }

    public function otherParticipant(User $user): ?User
    {
        if ($this->type !== 'private') {
            return null;
        }

        return $this->participants->firstWhere('id', '!=', $user->id);
    }

    public function scopePublicRooms($query)
    {
        return $query
            ->where('is_public', true)
            ->whereNotNull('room_type');
    }

    public function isMember(User $user): bool
    {
        return $this->participants()
            ->where('user_id', $user->id)
            ->wherePivotNull('left_at')
            ->exists();
    }

    public function logSystemMessage(User $actor, string $body): Message
    {
        $message = $this->messages()->create([
            'sender_id' => $actor->id,
            'type' => 'system',
            'body' => $body,
        ]);

        $this->update([
            'last_message_at' => $message->created_at,
        ]);

        return $message;
    }
}