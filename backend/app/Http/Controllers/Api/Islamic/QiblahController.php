<?php

namespace App\Http\Controllers\Api\Islamic;

use App\Http\Controllers\Controller;
use App\Services\QiblahService;
use Illuminate\Http\Request;

class QiblahController extends Controller
{
    public function __construct(private QiblahService $qiblahService)
    {
    }

    public function __invoke(Request $request)
    {
        $request->validate([
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
        ]);

        $lat = (float) $request->float('lat');
        $lng = (float) $request->float('lng');

        return response()->json([
            'bearing' => round($this->qiblahService->bearing($lat, $lng), 2),
            'distance_km' => round($this->qiblahService->distanceKm($lat, $lng), 1),
        ]);
    }
}
