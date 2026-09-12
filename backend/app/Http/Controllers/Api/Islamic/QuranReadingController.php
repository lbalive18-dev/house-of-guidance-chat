<?php

namespace App\Http\Controllers\Api\Islamic;

use App\Http\Controllers\Controller;
use App\Models\QuranReciter;
use App\Models\Surah;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class QuranReadingController extends Controller
{
    public function index(): JsonResponse
    {
        $surahs = Surah::query()
            ->orderBy('number')
            ->get([
                'id',
                'number',
                'name_arabic',
                'name_transliterated',
                'name_english',
                'revelation_type',
                'verses_count',
            ]);

        return response()->json([
            'surahs' => $surahs,
        ]);
    }

    public function show(Request $request, Surah $surah): JsonResponse
    {
        $language = $request->input('language');
        $translator = $request->input('translator');

        $reciterSlug = $request->input(
            'reciter',
            'mishary-rashid-alafasy'
        );

        $surah->load([
            'ayahs.audio' => function ($query) use ($reciterSlug) {
                $query->whereHas('reciter', function ($reciterQuery) use (
                    $reciterSlug
                ) {
                    $reciterQuery->where('slug', $reciterSlug);
                });
            },
        ]);

        if ($language && $translator) {
            $surah->load([
                'ayahs.translations' => function ($query) use (
                    $language,
                    $translator
                ) {
                    $query
                        ->where('language', $language)
                        ->where('translator', $translator);
                },
            ]);
        }

        return response()->json([
            'surah' => $surah,
        ]);
    }

    public function reciters(): JsonResponse
    {
        $reciters = QuranReciter::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get([
                'id',
                'name',
                'slug',
                'language',
                'bio',
                'is_active',
            ]);

        return response()->json([
            'reciters' => $reciters,
        ]);
    }
}