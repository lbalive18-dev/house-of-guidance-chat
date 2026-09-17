<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RoomSeat extends Model
{
    use HasFactory;

    protected $fillable = [
        'conversation_id',
        'seat_number',
        'user_id',
    ];

    protected $casts = [
        'seat_number' => 'integer',
    ];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isOccupied(): bool
    {
        return $this->user_id !== null;
    }
}
