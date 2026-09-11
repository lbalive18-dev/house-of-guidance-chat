<?php

namespace App\Http\Controllers\Api\Islamic;

use App\Http\Controllers\Controller;
use App\Models\Ayah;
use App\Models\QuranProgress;
use App\Models\Surah;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class QuranProgressController extends Controller
{
    public function show(Request $request, Surah $surah): JsonResponse
    {
        $progress = QuranProgress::with([
            'surah',
            'lastAyah',
        ])
            ->where('user_id', $request->user()->id)
            ->where('surah_id', $surah->id)
            ->first();

        return response()->json([
            'progress' => $progress,
        ]);
    }

    public function store(
        Request $request,
        Surah $surah,
        Ayah $ayah
    ): JsonResponse {
        if ($ayah->surah_id !== $surah->id) {
            return response()->json([
                'message' => 'The selected ayah does not belong to this surah.',
            ], 422);
        }

        $progress = QuranProgress::updateOrCreate(
            [
                'user_id' => $request->user()->id,
                'surah_id' => $surah->id,
            ],
            [
                'last_ayah_id' => $ayah->id,
                'last_ayah_number' => $ayah->number,
                'completed' => $request->boolean('completed'),
            ]
        );

        $progress->load([
            'surah',
            'lastAyah',
        ]);

        return response()->json([
            'message' => 'Quran reading progress saved successfully.',
            'progress' => $progress,
        ]);
    }
}