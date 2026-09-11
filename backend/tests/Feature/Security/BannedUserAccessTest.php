<?php

namespace Tests\Feature\Security;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BannedUserAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_banned_user_is_blocked_from_the_api_even_with_a_valid_session(): void
    {
        $user = User::factory()->create(['is_banned' => true]);

        $response = $this->actingAs($user)->getJson('/api/user');

        $response->assertStatus(403);
    }

    public function test_an_unbanned_user_regains_access(): void
    {
        $user = User::factory()->create(['is_banned' => false]);

        $response = $this->actingAs($user)->getJson('/api/user');

        $response->assertOk();
    }
}
