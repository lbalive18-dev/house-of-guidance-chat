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

    public function ayahs(): HasMany
    {
        return $this->hasMany(Ayah::class)->orderBy('number');
    }

    public function audio(): HasMany
    {
        return $this->hasMany(QuranSurahAudio::class);
    }
}