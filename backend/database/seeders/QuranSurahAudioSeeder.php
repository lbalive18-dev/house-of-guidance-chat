<?php

namespace Database\Seeders;

use App\Models\QuranReciter;
use App\Models\QuranSurahAudio;
use App\Models\Surah;
use Illuminate\Database\Seeder;
use RuntimeException;

class QuranSurahAudioSeeder extends Seeder
{
    public function run(): void
    {
        $reciter = QuranReciter::where(
            'slug',
            'mishary-rashid-alafasy'
        )->first();

        if (! $reciter) {
            throw new RuntimeException(
                'Mishary Rashid Alafasy reciter not found.'
            );
        }

        $surahs = Surah::orderBy('number')->get();

        if ($surahs->count() !== 114) {
            throw new RuntimeException(
                "Expected 114 surahs, found {$surahs->count()}."
            );
        }

        $records = [];

        foreach ($surahs as $surah) {
            $audioNumber = sprintf(
                '%03d',
                $surah->number
            );

            $records[] = [
                'surah_id' => $surah->id,
                'quran_reciter_id' => $reciter->id,
                'audio_url' =>
                    "https://cdn.islamic.network/quran/audio/128/ar.alafasy/{$audioNumber}.mp3",
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        QuranSurahAudio::upsert(
            $records,
            ['surah_id', 'quran_reciter_id'],
            ['audio_url', 'updated_at']
        );

        $count = QuranSurahAudio::where(
            'quran_reciter_id',
            $reciter->id
        )->count();

        if ($count !== 114) {
            throw new RuntimeException(
                "Surah audio import incomplete. Expected 114, found {$count}."
            );
        }

        $this->command->info(
            "Mishary Alafasy Surah audio imported successfully: {$count} surahs."
        );
    }
}