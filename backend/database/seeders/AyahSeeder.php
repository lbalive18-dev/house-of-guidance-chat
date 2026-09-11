<?php

namespace Database\Seeders;

use App\Models\Ayah;
use App\Models\Surah;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class AyahSeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('data/quran-uthmani.txt');

        if (! file_exists($path)) {
            throw new RuntimeException(
                "Quran text file not found: {$path}"
            );
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

        if ($lines === false) {
            throw new RuntimeException(
                "Unable to read Quran text file: {$path}"
            );
        }

        DB::transaction(function () use ($lines) {
            foreach ($lines as $line) {
                $line = trim($line);

                if ($line === '' || str_starts_with($line, '#')) {
                    continue;
                }

                /*
                 * Expected format:
                 *
                 * SURAH|AYAH|TEXT
                 *
                 * Example:
                 * 1|1|بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                 */

                $parts = explode('|', $line, 3);

                if (count($parts) !== 3) {
                    continue;
                }

                [$surahNumber, $ayahNumber, $textArabic] = $parts;

                $surahNumber = (int) trim($surahNumber);
                $ayahNumber = (int) trim($ayahNumber);
                $textArabic = trim($textArabic);

                if (
                    $surahNumber < 1 ||
                    $surahNumber > 114 ||
                    $ayahNumber < 1 ||
                    $textArabic === ''
                ) {
                    continue;
                }

                $surah = Surah::where('number', $surahNumber)->first();

                if (! $surah) {
                    throw new RuntimeException(
                        "Surah {$surahNumber} not found."
                    );
                }

                Ayah::updateOrCreate(
                    [
                        'surah_id' => $surah->id,
                        'number' => $ayahNumber,
                    ],
                    [
                        'text_arabic' => $textArabic,
                    ]
                );
            }
        });

        $count = Ayah::count();

        if ($count !== 6236) {
            throw new RuntimeException(
                "Quran import incomplete. Expected 6236 ayahs, found {$count}."
            );
        }

        $this->command->info(
            "Quran import completed successfully: {$count} ayahs."
        );
    }
}