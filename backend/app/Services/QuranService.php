<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class QuranService
{
    /**
     * A short, offline fallback list used only if the external API is
     * unreachable, so the "Daily Verse" card never breaks.
     */
    private const FALLBACK_VERSES = [
        [
            'surah' => 'Al-Baqarah',
            'ayah' => 286,
            'arabic' => 'لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا',
            'translation' => 'Allah does not burden a soul beyond what it can bear.',
        ],
        [
            'surah' => 'Ash-Sharh',
            'ayah' => 6,
            'arabic' => 'إِنَّ مَعَ الْعُسْرِ يُسْرًا',
            'translation' => 'Indeed, with hardship comes ease.',
        ],
        [
            'surah' => 'At-Talaq',
            'ayah' => 3,
            'arabic' => 'وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ',
            'translation' => 'Whoever puts their trust in Allah, He alone is sufficient for them.',
        ],
        [
            'surah' => 'Al-Baqarah',
            'ayah' => 152,
            'arabic' => 'فَاذْكُرُونِي أَذْكُرْكُمْ',
            'translation' => 'So remember Me; I will remember you.',
        ],
        [
            'surah' => "Ar-Ra'd",
            'ayah' => 28,
            'arabic' => 'أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ',
            'translation' => 'Verily, in the remembrance of Allah do hearts find rest.',
        ],
    ];

    private const TOTAL_AYAHS = 6236;

    /**
     * Returns the same verse to everyone for a given calendar day.
     */
    public function dailyVerse(): array
    {
        $dayOfYear = (int) now()->format('z');

        return Cache::remember("quran:daily:{$dayOfYear}", now()->addDay(), function () use ($dayOfYear) {
            $ayahNumber = ($dayOfYear % self::TOTAL_AYAHS) + 1;

            try {
                $baseUrl = config('services.alquran.base_url');

                $arabic = Http::timeout(5)->get("{$baseUrl}/ayah/{$ayahNumber}/quran-uthmani");
                $translation = Http::timeout(5)->get("{$baseUrl}/ayah/{$ayahNumber}/en.sahih");

                if ($arabic->successful() && $translation->successful()) {
                    $arabicData = $arabic->json('data');
                    $translationData = $translation->json('data');

                    return [
                        'surah' => $arabicData['surah']['englishName'],
                        'surah_arabic' => $arabicData['surah']['name'],
                        'ayah' => $arabicData['numberInSurah'],
                        'arabic' => $arabicData['text'],
                        'translation' => $translationData['text'],
                        'source' => 'live',
                    ];
                }
            } catch (\Throwable $e) {
                Log::warning('QuranService: falling back to offline verse.', ['error' => $e->getMessage()]);
            }

            $fallback = self::FALLBACK_VERSES[$dayOfYear % count(self::FALLBACK_VERSES)];

            return [
                'surah' => $fallback['surah'],
                'surah_arabic' => null,
                'ayah' => $fallback['ayah'],
                'arabic' => $fallback['arabic'],
                'translation' => $fallback['translation'],
                'source' => 'offline',
            ];
        });
    }
}
