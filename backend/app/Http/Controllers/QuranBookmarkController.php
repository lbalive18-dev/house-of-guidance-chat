<?php

namespace App\Http\Controllers\Api\Islamic;

use App\Http\Controllers\Controller;
use App\Models\Ayah;
use App\Models\QuranBookmark;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class QuranBookmarkController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $bookmarks = QuranBookmark::with([
            'ayah.surah',
        ])
            ->where('user_id', $request->user()->id)
            ->latest()
            ->get();

        return response()->json([
            'bookmarks' => $bookmarks,
        ]);
    }

    public function store(Request $request, Ayah $ayah): JsonResponse
    {
        $bookmark = QuranBookmark::updateOrCreate(
            [
                'user_id' => $request->user()->id,
                'ayah_id' => $ayah->id,
            ],
            [
                'note' => $request->input('note'),
            ]
        );

        $bookmark->load('ayah.surah');

        return response()->json([
            'message' => 'Ayah bookmarked successfully.',
            'bookmark' => $bookmark,
        ], 201);
    }

    public function destroy(
        Request $request,
        Ayah $ayah
    ): JsonResponse {
        $deleted = QuranBookmark::where('user_id', $request->user()->id)
            ->where('ayah_id', $ayah->id)
            ->delete();

        if ($deleted === 0) {
            return response()->json([
                'message' => 'Bookmark not found.',
            ], 404);
        }

        return response()->json([
            'message' => 'Ayah bookmark removed successfully.',
        ]);
    }
}