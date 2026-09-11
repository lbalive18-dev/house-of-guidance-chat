<?php

namespace Database\Seeders;

use App\Models\Ayah;
use App\Models\QuranAudio;
use App\Models\QuranReciter;
use Illuminate\Database\Seeder;
use RuntimeException;

class QuranAudioSeeder extends Seeder
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

        $ayahs = Ayah::with('surah')
            ->orderBy('surah_id')
            ->orderBy('number')
            ->get();

        if ($ayahs->count() !== 6236) {
            throw new RuntimeException(
                "Expected 6236 ayahs, found {$ayahs->count()}."
            );
        }

        $records = [];

        foreach ($ayahs as $ayah) {
            $surahNumber = $ayah->surah->number;
            $ayahNumber = $ayah->number;

            $audioNumber = sprintf(
                '%03d%03d',
                $surahNumber,
                $ayahNumber
            );

            $records[] = [
                'ayah_id' => $ayah->id,
                'quran_reciter_id' => $reciter->id,
                'audio_url' =>
                    "https://cdn.islamic.network/quran/audio/128/ar.alafasy/{$audioNumber}.mp3",
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        QuranAudio::upsert(
            $records,
            ['ayah_id', 'quran_reciter_id'],
            ['audio_url', 'updated_at']
        );

        $count = QuranAudio::where(
            'quran_reciter_id',
            $reciter->id
        )->count();

        if ($count !== 6236) {
            throw new RuntimeException(
                "Audio import incomplete. Expected 6236, found {$count}."
            );
        }

        $this->command->info(
            "Mishary Alafasy audio imported successfully: {$count} ayahs."
        );
    }
}