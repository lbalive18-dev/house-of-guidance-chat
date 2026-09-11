<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class LoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_user_can_login_with_correct_credentials(): void
    {
        $user = User::factory()->create([
            'email' => 'khalid@example.com',
            'password' => Hash::make('Password123'),
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'khalid@example.com',
            'password' => 'Password123',
        ]);

        $response->assertOk()->assertJsonPath('user.email', $user->email);
        $this->assertAuthenticatedAs($user);
    }

    public function test_login_fails_with_incorrect_password(): void
    {
        User::factory()->create([
            'email' => 'khalid@example.com',
            'password' => Hash::make('Password123'),
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'khalid@example.com',
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('email');
        $this->assertGuest();
    }

    public function test_a_banned_user_cannot_login(): void
    {
        User::factory()->create([
            'email' => 'banned@example.com',
            'password' => Hash::make('Password123'),
            'is_banned' => true,
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'banned@example.com',
            'password' => 'Password123',
        ]);

        $response->assertStatus(422);
        $this->assertGuest();
    }

    public function test_an_authenticated_user_can_logout(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/logout');

        $response->assertOk();
    }
}
