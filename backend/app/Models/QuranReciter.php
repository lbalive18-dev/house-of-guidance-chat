<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class QuranReciter extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'language',
        'bio',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function audio(): HasMany
    {
        return $this->hasMany(QuranAudio::class);
    }

    public function surahAudio(): HasMany
    {
        return $this->hasMany(QuranSurahAudio::class);
    }
}