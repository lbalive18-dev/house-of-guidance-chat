<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class PrayerTimeService
{
    /**
     * Fetch prayer times for a coordinate + date, cached for 12 hours per
     * (rounded location, date, method) combination to stay well within
     * Aladhan's free rate limits.
     *
     * @return array{timings: array<string, string>, date: array, meta: array}|null
     */
    public function forCoordinates(float $lat, float $lng, ?string $date = null, int $method = 2): ?array
    {
        $date = $date ? Carbon::parse($date) : now();
        $roundedLat = round($lat, 2);
        $roundedLng = round($lng, 2);
        $cacheKey = "prayer-times:{$roundedLat}:{$roundedLng}:{$date->format('Y-m-d')}:{$method}";

        return Cache::remember($cacheKey, now()->addHours(12), function () use ($roundedLat, $roundedLng, $date, $method) {
            $baseUrl = config('services.aladhan.base_url');

            $response = Http::timeout(6)->get("{$baseUrl}/timings/{$date->format('d-m-Y')}", [
                'latitude' => $roundedLat,
                'longitude' => $roundedLng,
                'method' => $method,
            ]);

            if (! $response->successful()) {
                return null;
            }

            $data = $response->json('data');

            return [
                'timings' => $data['timings'],
                'date' => $data['date'],
                'meta' => $data['meta'],
            ];
        });
    }
}
