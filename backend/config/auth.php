<?php

return [
    'defaults' => [
        'guard' => env('AUTH_GUARD', 'web'),
        'passwords' => env('AUTH_PASSWORD_BROKER', 'users'),
    ],

    'guards' => [
        'web' => [
            'driver' => 'session',
            'provider' => 'users',
        ],
        'sanctum' => [
            'driver' => 'sanctum',
            'provider' => 'users',
        ],
    ],

    'providers' => [
        'users' => [
            'driver' => 'eloquent',
            'model' => env('AUTH_MODEL', App\Models\User::class),
        ],
    ],

    'passwords' => [
        'users' => [
            'provider' => 'users',
            'table' => env('AUTH_PASSWORD_RESET_TOKEN_TABLE', 'password_reset_tokens'),
            'expire' => 60,
            'throttle' => 60,
        ],
    ],

    'password_timeout' => 10800,

    /*
    |--------------------------------------------------------------------------
    | First Admin Claim
    |--------------------------------------------------------------------------
    |
    | Email allowlist for the one-time /api/admin/claim endpoint (hosts
    | without server shell access). Set via the FIRST_ADMIN_EMAIL hosting
    | environment variable — never committed. Read via config() so it keeps
    | working when the production config cache is warm.
    |
    */
    'first_admin_email' => env('FIRST_ADMIN_EMAIL', ''),
];
