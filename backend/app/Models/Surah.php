<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Surah extends Model
{
    use HasFactory;

    protected $fillable = [
        'number',
        'name_arabic',
        'name_transliterated',
        'name_english',
        'revelation_type',
        'verses_count',
    ];

    protected $casts = [
        'number' => 'integer',
        'verses_count' => 'integer',
    ];

    /**
     * The API addresses surahs by their canonical number (1-114), which is
     * what the frontend sends — not the auto-increment id.
     */
    public function getRouteKeyName(): string
    {
        return 'number';
    }

    public function ayahs(): HasMany
    {
        return $this->hasMany(Ayah::class)->orderBy('number');
    }

    public function audio(): HasMany
    {
        return $this->hasMany(QuranSurahAudio::class);
    }
}