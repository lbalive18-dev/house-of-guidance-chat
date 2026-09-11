<?php

namespace App\Http\Controllers\Api\Islamic;

use App\Http\Controllers\Controller;
use App\Services\IslamicCalendarService;
use Illuminate\Http\Request;

class IslamicCalendarController extends Controller
{
    public function __construct(private IslamicCalendarService $calendarService)
    {
    }

    public function today(Request $request)
    {
        $result = $this->calendarService->hijriDate($request->string('date')->toString() ?: null);

        if (! $result) {
            return response()->json(['message' => 'The Hijri calendar is temporarily unavailable.'], 503);
        }

        return response()->json($result);
    }

    public function month(Request $request)
    {
        $request->validate([
            'month' => ['required', 'integer', 'between:1,12'],
            'year' => ['required', 'integer', 'between:1900,2200'],
        ]);

        $result = $this->calendarService->monthlyCalendar($request->integer('month'), $request->integer('year'));

        if (! $result) {
            return response()->json(['message' => 'The Hijri calendar is temporarily unavailable.'], 503);
        }

        return response()->json(['days' => $result]);
    }
}
