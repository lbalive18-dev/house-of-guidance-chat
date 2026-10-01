<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NoorCachedAnswer extends Model
{
    protected $fillable = [
        'question_hash',
        'question',
        'lang',
        'answer',
        'sources',
        'hits',
    ];

    protected function casts(): array
    {
        return [
            'sources' => 'array',
        ];
    }

    public static function hashFor(string $message, string $lang): string
    {
        $normalized = mb_strtolower(trim(preg_replace('/\s+/u', ' ', $message) ?? ''));

        return hash('sha256', $lang.'|'.$normalized);
    }
}
