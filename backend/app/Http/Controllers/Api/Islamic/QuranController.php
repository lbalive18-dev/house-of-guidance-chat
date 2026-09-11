<?php

namespace App\Http\Controllers\Api\Islamic;

use App\Http\Controllers\Controller;
use App\Services\QuranService;

class QuranController extends Controller
{
    public function __construct(private QuranService $quranService)
    {
    }

    public function daily()
    {
        return response()->json($this->quranService->dailyVerse());
    }
}
