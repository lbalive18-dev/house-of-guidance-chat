<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserSearchTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_user_can_search_for_other_users_by_name(): void
    {
        $user = User::factory()->create();
        User::factory()->create(['name' => 'Bilal ibn Rabah']);
        User::factory()->create(['name' => 'Someone Else']);

        $response = $this->actingAs($user)->getJson('/api/users/search?q=Bilal');

        $response->assertOk();
        $this->assertCount(1, $response->json());
        $this->assertEquals('Bilal ibn Rabah', $response->json('0.name'));
    }

    public function test_search_excludes_the_current_user_and_banned_users(): void
    {
        $user = User::factory()->create(['name' => 'Zayd']);
        User::factory()->create(['name' => 'Zayd Banned', 'is_banned' => true]);

        $response = $this->actingAs($user)->getJson('/api/users/search?q=Zayd');

        $response->assertOk();
        $names = collect($response->json())->pluck('name');
        $this->assertFalse($names->contains('Zayd'));
        $this->assertFalse($names->contains('Zayd Banned'));
    }
}
