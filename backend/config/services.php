<?php

return [
    'aladhan' => [
        'base_url' => env('ALADHAN_API_URL', 'https://api.aladhan.com/v1'),
    ],

    'alquran' => [
        'base_url' => env('ALQURAN_API_URL', 'https://api.alquran.cloud/v1'),
    ],

    'brevo' => [
        'key' => env('BREVO_API_KEY'),
        'base_url' => env('BREVO_API_URL', 'https://api.brevo.com/v3'),
    ],

    'webpush' => [
        'public_key' => env('WEBPUSH_VAPID_PUBLIC'),
        'private_key' => env('WEBPUSH_VAPID_PRIVATE'),
        'subject' => env('WEBPUSH_SUBJECT', env('MAIL_FROM_ADDRESS', 'mailto:noreply@houseofguidance.org')),
    ],

    'groq' => [
        'key' => env('GROQ_API_KEY'),
        'model' => env('GROQ_MODEL', 'openai/gpt-oss-120b'),
        'base_url' => env('GROQ_API_URL', 'https://api.groq.com/openai/v1'),
    ],
];
