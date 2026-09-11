<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuranBookmark extends Model
{
    use HasFactory;

    protected $table = 'quran_bookmarks';

    protected $fillable = [
        'user_id',
        'ayah_id',
        'note',
    ];

    protected $casts = [
        'user_id' => 'integer',
        'ayah_id' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function ayah(): BelongsTo
    {
        return $this->belongsTo(Ayah::class);
    }
}