<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_user_can_request_a_password_reset_link(): void
    {
        $user = User::factory()->create(['email' => 'reset@example.com']);

        $response = $this->postJson('/api/forgot-password', ['email' => $user->email]);

        $response->assertOk();
    }

    public function test_forgot_password_does_not_leak_unknown_emails(): void
    {
        $response = $this->postJson('/api/forgot-password', ['email' => 'unknown@example.com']);

        $response->assertOk();
    }

    public function test_a_user_can_reset_their_password_with_a_valid_token(): void
    {
        $user = User::factory()->create(['email' => 'reset2@example.com']);

        $token = Password::createToken($user);

        $response = $this->postJson('/api/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'NewPassword123',
            'password_confirmation' => 'NewPassword123',
        ]);

        $response->assertOk();

        $this->assertTrue(
            \Illuminate\Support\Facades\Hash::check('NewPassword123', $user->fresh()->password)
        );
    }
}
