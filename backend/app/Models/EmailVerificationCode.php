<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Hash;

class EmailVerificationCode extends Model
{
    protected $fillable = [
        'email',
        'code_hash',
        'expires_at',
        'attempts',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
        ];
    }

    /**
     * Issue a fresh 6-digit code for an email address, invalidating any
     * previous one. Returns the plain code for the notification; only the
     * hash is ever stored.
     */
    public static function issueFor(string $email): string
    {
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        static::query()->updateOrCreate(
            ['email' => strtolower(trim($email))],
            [
                'code_hash' => Hash::make($code),
                'expires_at' => now()->addMinutes(30),
                'attempts' => 0,
            ]
        );

        return $code;
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }
}
