<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CallSession extends Model
{
    use HasFactory;

    public const TYPE_PRIVATE = 'private';
    public const TYPE_GROUP = 'group';
    public const TYPE_ROOM = 'room';

    public const STATUS_RINGING = 'ringing';
    public const STATUS_ACTIVE = 'active';
    public const STATUS_ENDED = 'ended';

    protected $fillable = [
        'type',
        'media',
        'conversation_id',
        'initiator_id',
        'status',
        'started_at',
        'ended_at',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
    ];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function initiator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'initiator_id');
    }

    public function participants(): HasMany
    {
        return $this->hasMany(CallParticipant::class);
    }

    public function joinedParticipants(): HasMany
    {
        return $this->participants()->where('status', CallParticipant::STATUS_JOINED);
    }

    public function isLive(): bool
    {
        return in_array($this->status, [self::STATUS_RINGING, self::STATUS_ACTIVE], true);
    }

    public function participantFor(User $user): ?CallParticipant
    {
        return $this->participants->firstWhere('user_id', $user->id)
            ?? $this->participants()->where('user_id', $user->id)->first();
    }
}
