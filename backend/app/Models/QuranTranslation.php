<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuranTranslation extends Model
{
    use HasFactory;

    protected $fillable = [
        'ayah_id',
        'language',
        'translator',
        'text',
    ];

    protected $casts = [
        'ayah_id' => 'integer',
    ];

    public function ayah(): BelongsTo
    {
        return $this->belongsTo(Ayah::class);
    }
}