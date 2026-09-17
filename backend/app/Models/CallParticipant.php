<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CallParticipant extends Model
{
    use HasFactory;

    public const STATUS_INVITED = 'invited';
    public const STATUS_JOINED = 'joined';
    public const STATUS_DECLINED = 'declined';
    public const STATUS_MISSED = 'missed';
    public const STATUS_LEFT = 'left';
    public const STATUS_REMOVED = 'removed';

    protected $fillable = [
        'call_session_id',
        'user_id',
        'status',
        'is_muted',
        'is_camera_off',
        'joined_at',
        'left_at',
        'last_heartbeat_at',
    ];

    protected $casts = [
        'is_muted' => 'boolean',
        'is_camera_off' => 'boolean',
        'joined_at' => 'datetime',
        'left_at' => 'datetime',
        'last_heartbeat_at' => 'datetime',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(CallSession::class, 'call_session_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isInCall(): bool
    {
        return $this->status === self::STATUS_JOINED;
    }
}
