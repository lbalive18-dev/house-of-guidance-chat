<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuranProgress extends Model
{
    use HasFactory;

    protected $table = 'quran_progress';

    protected $fillable = [
        'user_id',
        'surah_id',
        'last_ayah_id',
        'last_ayah_number',
        'completed',
    ];

    protected $casts = [
        'user_id' => 'integer',
        'surah_id' => 'integer',
        'last_ayah_id' => 'integer',
        'last_ayah_number' => 'integer',
        'completed' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function surah(): BelongsTo
    {
        return $this->belongsTo(Surah::class);
    }

    public function lastAyah(): BelongsTo
    {
        return $this->belongsTo(Ayah::class, 'last_ayah_id');
    }
}