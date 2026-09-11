<?php

namespace Tests\Feature\Islamic;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class QuranTest extends TestCase
{
    use RefreshDatabase;

    public function test_daily_verse_returns_live_data_when_the_api_succeeds(): void
    {
        Http::fake([
            '*/ayah/*/quran-uthmani' => Http::response(['data' => [
                'text' => 'إِنَّ مَعَ الْعُسْرِ يُسْرًا',
                'numberInSurah' => 6,
                'surah' => ['englishName' => 'Ash-Sharh', 'name' => 'الشرح'],
            ]]),
            '*/ayah/*/en.sahih' => Http::response(['data' => [
                'text' => 'Indeed, with hardship comes ease.',
            ]]),
        ]);

        $user = User::factory()->create();
        $response = $this->actingAs($user)->getJson('/api/islamic/quran/daily');

        $response->assertOk()
            ->assertJsonPath('source', 'live')
            ->assertJsonPath('translation', 'Indeed, with hardship comes ease.');
    }

    public function test_daily_verse_falls_back_to_offline_content_when_the_api_fails(): void
    {
        Http::fake(['*' => Http::response([], 500)]);

        $user = User::factory()->create();
        $response = $this->actingAs($user)->getJson('/api/islamic/quran/daily');

        $response->assertOk()->assertJsonPath('source', 'offline');
    }

    public function test_a_guest_cannot_access_the_daily_verse(): void
    {
        $response = $this->getJson('/api/islamic/quran/daily');

        $response->assertStatus(401);
    }
}
