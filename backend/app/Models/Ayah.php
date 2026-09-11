<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Ayah extends Model
{
    use HasFactory;

    protected $fillable = [
        'surah_id',
        'number',
        'text_arabic',
    ];

    protected $casts = [
        'surah_id' => 'integer',
        'number' => 'integer',
    ];

    public function surah(): BelongsTo
    {
        return $this->belongsTo(Surah::class);
    }

    public function translations(): HasMany
    {
        return $this->hasMany(QuranTranslation::class);
    }

    public function audio(): HasMany
    {
        return $this->hasMany(QuranAudio::class);
    }
}