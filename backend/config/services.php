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
];
