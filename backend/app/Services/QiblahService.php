<?php

namespace App\Services;

class QiblahService
{
    private const KAABA_LAT = 21.4225;

    private const KAABA_LNG = 39.8262;

    private const EARTH_RADIUS_KM = 6371.0;

    /**
     * Compass bearing (0-360, clockwise from true north) to face the
     * Kaaba from the given coordinates, using the great-circle initial
     * bearing formula.
     */
    public function bearing(float $lat, float $lng): float
    {
        $latRad = deg2rad($lat);
        $kaabaLatRad = deg2rad(self::KAABA_LAT);
        $deltaLngRad = deg2rad(self::KAABA_LNG - $lng);

        $y = sin($deltaLngRad) * cos($kaabaLatRad);
        $x = cos($latRad) * sin($kaabaLatRad) - sin($latRad) * cos($kaabaLatRad) * cos($deltaLngRad);

        $bearing = rad2deg(atan2($y, $x));

        return fmod($bearing + 360, 360);
    }

    /**
     * Great-circle distance to the Kaaba in kilometers (Haversine formula).
     */
    public function distanceKm(float $lat, float $lng): float
    {
        $latRad = deg2rad($lat);
        $kaabaLatRad = deg2rad(self::KAABA_LAT);
        $deltaLat = deg2rad(self::KAABA_LAT - $lat);
        $deltaLng = deg2rad(self::KAABA_LNG - $lng);

        $a = sin($deltaLat / 2) ** 2 + cos($latRad) * cos($kaabaLatRad) * sin($deltaLng / 2) ** 2;
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return self::EARTH_RADIUS_KM * $c;
    }
}
