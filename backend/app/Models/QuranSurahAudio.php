<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuranSurahAudio extends Model
{
    use HasFactory;

    protected $table = 'quran_surah_audio';

    protected $fillable = [
        'surah_id',
        'quran_reciter_id',
        'audio_url',
    ];

    protected $casts = [
        'surah_id' => 'integer',
        'quran_reciter_id' => 'integer',
    ];

    public function surah(): BelongsTo
    {
        return $this->belongsTo(Surah::class);
    }

    public function reciter(): BelongsTo
    {
        return $this->belongsTo(QuranReciter::class, 'quran_reciter_id');
    }
}