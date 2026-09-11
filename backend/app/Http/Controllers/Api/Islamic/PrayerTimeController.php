<?php

namespace App\Http\Controllers\Api\Islamic;

use App\Http\Controllers\Controller;
use App\Services\PrayerTimeService;
use Illuminate\Http\Request;

class PrayerTimeController extends Controller
{
    public function __construct(private PrayerTimeService $prayerTimeService)
    {
    }

    public function __invoke(Request $request)
    {
        $request->validate([
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
            'date' => ['sometimes', 'date'],
            'method' => ['sometimes', 'integer', 'between:0,23'],
        ]);

        $result = $this->prayerTimeService->forCoordinates(
            (float) $request->float('lat'),
            (float) $request->float('lng'),
            $request->string('date')->toString() ?: null,
            $request->integer('method', 2)
        );

        if (! $result) {
            return response()->json([
                'message' => 'Prayer times are temporarily unavailable. Please try again shortly.',
            ], 503);
        }

        return response()->json($result);
    }
}
