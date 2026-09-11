<?php

namespace Tests\Feature\Islamic;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PrayerTimesAndCalendarTest extends TestCase
{
    use RefreshDatabase;

    public function test_prayer_times_are_returned_for_a_location(): void
    {
        Http::fake(['*/timings/*' => Http::response(['data' => [
            'timings' => ['Fajr' => '05:00', 'Dhuhr' => '12:15', 'Asr' => '15:30', 'Maghrib' => '18:45', 'Isha' => '20:00'],
            'date' => ['readable' => '20 Jul 2026'],
            'meta' => ['timezone' => 'UTC'],
        ]])]);

        $user = User::factory()->create();
        $response = $this->actingAs($user)->getJson('/api/islamic/prayer-times?lat=21.4225&lng=39.8262');

        $response->assertOk()->assertJsonStructure(['timings', 'date', 'meta']);
    }

    public function test_prayer_times_returns_503_when_the_api_is_unreachable(): void
    {
        Http::fake(['*' => Http::response([], 500)]);
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/islamic/prayer-times?lat=21.4225&lng=39.8262');

        $response->assertStatus(503);
    }

    public function test_hijri_date_conversion_returns_expected_shape(): void
    {
        Http::fake(['*/gToH/*' => Http::response(['data' => ['hijri' => [
            'day' => '5', 'year' => '1448',
            'month' => ['number' => 2, 'en' => 'Safar', 'ar' => 'صفر'],
            'weekday' => ['en' => 'Monday'],
            'holidays' => [],
        ]]])]);

        $user = User::factory()->create();
        $response = $this->actingAs($user)->getJson('/api/islamic/hijri-date');

        $response->assertOk()->assertJsonStructure(['day', 'month', 'year', 'formatted']);
    }
}
