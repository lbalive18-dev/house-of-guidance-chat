<?php

namespace Tests\Unit;

use App\Services\QiblahService;
use Tests\TestCase;

class QiblahServiceTest extends TestCase
{
    public function test_bearing_from_the_kaaba_itself_is_effectively_zero_distance(): void
    {
        $service = new QiblahService;

        $distance = $service->distanceKm(21.4225, 39.8262);

        $this->assertEqualsWithDelta(0, $distance, 0.01);
    }

    public function test_bearing_is_always_within_a_valid_compass_range(): void
    {
        $service = new QiblahService;

        // A spread of real-world coordinates.
        $points = [
            [40.7128, -74.0060],   // New York
            [-6.2088, 106.8456],   // Jakarta
            [51.5072, -0.1276],    // London
            [-33.8688, 151.2093],  // Sydney
        ];

        foreach ($points as [$lat, $lng]) {
            $bearing = $service->bearing($lat, $lng);
            $this->assertGreaterThanOrEqual(0, $bearing);
            $this->assertLessThan(360, $bearing);
        }
    }

    public function test_distance_increases_the_further_a_point_is_from_the_kaaba(): void
    {
        $service = new QiblahService;

        $nearby = $service->distanceKm(24.4667, 39.6111); // Madinah, close to Makkah
        $farAway = $service->distanceKm(-33.8688, 151.2093); // Sydney, far away

        $this->assertLessThan($farAway, $nearby);
    }
}
