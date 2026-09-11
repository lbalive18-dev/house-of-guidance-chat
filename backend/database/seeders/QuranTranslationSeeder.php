<?php

namespace Database\Seeders;

use App\Models\Ayah;
use App\Models\QuranTranslation;
use App\Models\Surah;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class QuranTranslationSeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('data/quran-pickthall.txt');

        if (! file_exists($path)) {
            throw new RuntimeException(
                "Translation file not found: {$path}"
            );
        }

        $lines = file(
            $path,
            FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES
        );

        if ($lines === false) {
            throw new RuntimeException(
                "Unable to read translation file: {$path}"
            );
        }

        $imported = 0;

        DB::transaction(function () use ($lines, &$imported) {
            foreach ($lines as $line) {
                $line = trim($line);

                if ($line === '' || str_starts_with($line, '#')) {
                    continue;
                }

                $parts = explode('|', $line, 3);

                if (count($parts) !== 3) {
                    continue;
                }

                [$surahNumber, $ayahNumber, $text] = $parts;

                $surahNumber = (int) trim($surahNumber);
                $ayahNumber = (int) trim($ayahNumber);
                $text = trim($text);

                if (
                    $surahNumber < 1 ||
                    $surahNumber > 114 ||
                    $ayahNumber < 1 ||
                    $text === ''
                ) {
                    continue;
                }

                $surah = Surah::where('number', $surahNumber)->first();

                if (! $surah) {
                    throw new RuntimeException(
                        "Surah {$surahNumber} not found."
                    );
                }

                $ayah = Ayah::where('surah_id', $surah->id)
                    ->where('number', $ayahNumber)
                    ->first();

                if (! $ayah) {
                    throw new RuntimeException(
                        "Ayah {$surahNumber}:{$ayahNumber} not found."
                    );
                }

                QuranTranslation::updateOrCreate(
                    [
                        'ayah_id' => $ayah->id,
                        'language' => 'en',
                        'translator' => 'Mohammed Marmaduke Pickthall',
                    ],
                    [
                        'text' => $text,
                    ]
                );

                $imported++;
            }
        });

        $count = QuranTranslation::where('language', 'en')
            ->where('translator', 'Mohammed Marmaduke Pickthall')
            ->count();

        if ($count !== 6236) {
            throw new RuntimeException(
                "Translation import incomplete. Expected 6236 translations, found {$count}."
            );
        }

        $this->command->info(
            "Pickthall translation imported successfully: {$count} ayahs."
        );
    }
}