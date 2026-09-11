<?php

namespace Tests\Feature\Security;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RateLimitingTest extends TestCase
{
    use RefreshDatabase;

    public function test_repeated_login_attempts_are_throttled(): void
    {
        for ($i = 0; $i < 6; $i++) {
            $this->postJson('/api/login', [
                'email' => 'nobody@example.com',
                'password' => 'wrong-password',
            ]);
        }

        // The auth limiter allows 6 attempts/minute; the 7th should be throttled.
        $response = $this->postJson('/api/login', [
            'email' => 'nobody@example.com',
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(429);
    }
}
