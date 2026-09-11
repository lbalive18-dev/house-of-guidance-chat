<?php

namespace Tests\Feature\Islamic;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QiblahTest extends TestCase
{
    use RefreshDatabase;

    public function test_qiblah_bearing_is_computed_for_a_given_location(): void
    {
        $user = User::factory()->create();

        // New York City coordinates - Qiblah should point roughly east-northeast.
        $response = $this->actingAs($user)->getJson('/api/islamic/qiblah?lat=40.7128&lng=-74.0060');

        $response->assertOk()->assertJsonStructure(['bearing', 'distance_km']);
        $this->assertGreaterThan(0, $response->json('bearing'));
        $this->assertLessThan(360, $response->json('bearing'));
        $this->assertGreaterThan(0, $response->json('distance_km'));
    }

    public function test_qiblah_requires_valid_coordinates(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/islamic/qiblah?lat=999&lng=999');

        $response->assertStatus(422);
    }
}
