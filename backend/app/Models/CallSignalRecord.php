<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CallSignalRecord extends Model
{
    protected $table = 'call_signals';

    protected $fillable = [
        'call_session_id',
        'from_user_id',
        'to_user_id',
        'signal_type',
        'payload',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
        ];
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(CallSession::class, 'call_session_id');
    }
}
