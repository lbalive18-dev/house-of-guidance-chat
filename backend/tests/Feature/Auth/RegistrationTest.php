<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use App\Notifications\VerifyEmailNotification;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_user_can_register_with_valid_data(): void
    {
        Notification::fake();

        $response = $this->postJson('/api/register', [
            'name' => 'Aisha Bakr',
            'email' => 'aisha@example.com',
            'password' => 'Password123',
            'password_confirmation' => 'Password123',
        ]);

        $response->assertCreated()
            ->assertJsonPath('user.email', 'aisha@example.com')
            ->assertJsonPath('user.role', 'student');

        $this->assertDatabaseHas('users', ['email' => 'aisha@example.com']);

        $user = User::where('email', 'aisha@example.com')->first();
        Notification::assertSentTo($user, VerifyEmailNotification::class);
    }

    public function test_registration_fails_with_duplicate_email(): void
    {
        User::factory()->create(['email' => 'taken@example.com']);

        $response = $this->postJson('/api/register', [
            'name' => 'Another User',
            'email' => 'taken@example.com',
            'password' => 'Password123',
            'password_confirmation' => 'Password123',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('email');
    }

    public function test_registration_fails_with_weak_password(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Weak Pass',
            'email' => 'weak@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('password');
    }
}
