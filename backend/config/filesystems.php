<?php

return [
    'default' => env('FILESYSTEM_DISK', 'public'),

    'disks' => [
        'local' => [
            'driver' => 'local',
            'root' => storage_path('app/private'),
            'serve' => true,
            'throw' => false,
        ],

        // Upload disks support two drivers selected per disk via env:
        // local (development default, previous behavior) and supabase
        // (production on hosts with ephemeral disks). Switching drivers
        // keeps every call site working: same disk names, same paths, and
        // public buckets mirror the old public/storage URLs one-to-one.
        'public' => [
            'driver' => env('PUBLIC_DISK_DRIVER', 'local'),
            'root' => storage_path('app/public'),
            'url' => env('PUBLIC_DISK_URL', env('APP_URL').'/storage'),
            'visibility' => 'public',
            'throw' => false,
            'supabase_url' => env('SUPABASE_URL'),
            'supabase_key' => env('SUPABASE_SERVICE_KEY'),
            'bucket' => env('SUPABASE_BUCKET', 'hog-uploads'),
            'prefix' => '',
        ],

        'avatars' => [
            'driver' => env('AVATARS_DISK_DRIVER', 'local'),
            'root' => storage_path('app/public/avatars'),
            'url' => env('AVATARS_DISK_URL', env('APP_URL').'/storage/avatars'),
            'visibility' => 'public',
            'throw' => false,
            'supabase_url' => env('SUPABASE_URL'),
            'supabase_key' => env('SUPABASE_SERVICE_KEY'),
            'bucket' => env('SUPABASE_BUCKET', 'hog-uploads'),
            'prefix' => 'avatars/',
        ],

        'chat-attachments' => [
            'driver' => env('CHAT_ATTACHMENTS_DISK_DRIVER', 'local'),
            'root' => storage_path('app/public/chat-attachments'),
            'url' => env('CHAT_ATTACHMENTS_DISK_URL', env('APP_URL').'/storage/chat-attachments'),
            'visibility' => 'public',
            'throw' => false,
            'supabase_url' => env('SUPABASE_URL'),
            'supabase_key' => env('SUPABASE_SERVICE_KEY'),
            'bucket' => env('SUPABASE_BUCKET', 'hog-uploads'),
            'prefix' => 'chat-attachments/',
        ],

        'voice-notes' => [
            'driver' => env('VOICE_NOTES_DISK_DRIVER', 'local'),
            'root' => storage_path('app/public/voice-notes'),
            'url' => env('VOICE_NOTES_DISK_URL', env('APP_URL').'/storage/voice-notes'),
            'visibility' => 'public',
            'throw' => false,
            'supabase_url' => env('SUPABASE_URL'),
            'supabase_key' => env('SUPABASE_SERVICE_KEY'),
            'bucket' => env('SUPABASE_BUCKET', 'hog-uploads'),
            'prefix' => 'voice-notes/',
        ],

        's3' => [
            'driver' => 's3',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION'),
            'bucket' => env('AWS_BUCKET'),
            'url' => env('AWS_URL'),
            'endpoint' => env('AWS_ENDPOINT'),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
            'throw' => false,
        ],
    ],

    'links' => [
        public_path('storage') => storage_path('app/public'),
    ],
];
