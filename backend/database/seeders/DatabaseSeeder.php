<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            HadithSeeder::class,
            DuaSeeder::class,
            HadithBookSeeder::class,
        ]);

        // Quran dataset (114 surahs / 6236 ayahs + Pickthall translation +
        // reciters + audio URL records). These seeders validate their own
        // row counts and throw on incomplete imports. They read only the
        // committed data files under database/data/ and build URLs for the
        // project's existing approved audio CDN — no network calls.
        $this->call([
            SurahSeeder::class,
            AyahSeeder::class,
            QuranTranslationSeeder::class,
            QuranReciterSeeder::class,
            QuranAudioSeeder::class,
            QuranSurahAudioSeeder::class,
        ]);

        if (! app()->isProduction()) {
            $demoUsers = [
                ['name' => 'House of Guidance Admin', 'email' => 'admin@houseofguidance.org', 'role' => 'admin'],
                ['name' => 'Ustadh Demo Teacher', 'email' => 'teacher@houseofguidance.org', 'role' => 'teacher'],
                ['name' => 'Demo Student', 'email' => 'student@houseofguidance.org', 'role' => 'student'],
            ];

            foreach ($demoUsers as $demoUser) {
                User::updateOrCreate(
                    ['email' => $demoUser['email']],
                    [
                        'name' => $demoUser['name'],
                        'role' => $demoUser['role'],
                        'password' => Hash::make('password'),
                        'email_verified_at' => now(),
                    ]
                );
            }
        }

        $this->call(RoomSeeder::class);
    }
}