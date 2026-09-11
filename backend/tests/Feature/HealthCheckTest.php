<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HealthCheckTest extends TestCase
{
    use RefreshDatabase;

    public function test_ping_endpoint_returns_ok(): void
    {
        $response = $this->getJson('/api/ping');

        $response->assertOk()
            ->assertJson(['status' => 'ok'])
            ->assertJsonStructure(['app', 'status', 'time']);
    }

    public function test_the_up_health_route_is_reachable(): void
    {
        $response = $this->get('/up');

        $response->assertOk();
    }
}
