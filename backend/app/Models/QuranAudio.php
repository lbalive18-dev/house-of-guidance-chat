<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuranAudio extends Model
{
    use HasFactory;

    protected $table = 'quran_audio';

    protected $fillable = [
        'ayah_id',
        'quran_reciter_id',
        'audio_url',
    ];

    protected $casts = [
        'ayah_id' => 'integer',
        'quran_reciter_id' => 'integer',
    ];

    public function ayah(): BelongsTo
    {
        return $this->belongsTo(Ayah::class);
    }

    public function reciter(): BelongsTo
    {
        return $this->belongsTo(QuranReciter::class, 'quran_reciter_id');
    }
}