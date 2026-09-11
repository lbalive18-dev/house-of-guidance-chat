<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class IslamicCalendarService
{
    /**
     * Convert a single Gregorian date to Hijri, cached for a full day.
     */
    public function hijriDate(?string $date = null): ?array
    {
        $date = $date ? Carbon::parse($date) : now();
        $cacheKey = "hijri-date:{$date->format('Y-m-d')}";

        return Cache::remember($cacheKey, now()->addDay(), function () use ($date) {
            $baseUrl = config('services.aladhan.base_url');

            $response = Http::timeout(6)->get("{$baseUrl}/gToH/{$date->format('d-m-Y')}");

            if (! $response->successful()) {
                return null;
            }

            $hijri = $response->json('data.hijri');

            return [
                'day' => $hijri['day'],
                'month' => [
                    'number' => $hijri['month']['number'],
                    'en' => $hijri['month']['en'],
                    'ar' => $hijri['month']['ar'],
                ],
                'year' => $hijri['year'],
                'weekday' => $hijri['weekday']['en'],
                'formatted' => "{$hijri['day']} {$hijri['month']['en']} {$hijri['year']} AH",
                'holidays' => $hijri['holidays'] ?? [],
            ];
        });
    }

    /**
     * Hijri dates (and any named holidays) for every day of a Gregorian
     * month, used to render the monthly Islamic calendar view.
     */
    public function monthlyCalendar(int $month, int $year): ?array
    {
        $cacheKey = "hijri-calendar:{$year}:{$month}";

        return Cache::remember($cacheKey, now()->addDay(), function () use ($month, $year) {
            $baseUrl = config('services.aladhan.base_url');

            $response = Http::timeout(8)->get("{$baseUrl}/gToHCalendar/{$month}/{$year}");

            if (! $response->successful()) {
                return null;
            }

            return collect($response->json('data'))->map(function ($entry) {
                return [
                    'gregorian_date' => $entry['gregorian']['date'],
                    'hijri_day' => $entry['hijri']['day'],
                    'hijri_month' => $entry['hijri']['month']['en'],
                    'hijri_year' => $entry['hijri']['year'],
                    'holidays' => $entry['hijri']['holidays'] ?? [],
                ];
            })->values()->all();
        });
    }
}
