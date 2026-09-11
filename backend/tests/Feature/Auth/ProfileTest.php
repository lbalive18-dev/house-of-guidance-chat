<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_authenticated_user_can_view_their_profile(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/profile');

        $response->assertOk()->assertJsonPath('id', $user->id);
    }

    public function test_a_guest_cannot_view_a_profile(): void
    {
        $response = $this->getJson('/api/profile');

        $response->assertStatus(401);
    }

    public function test_a_user_can_update_their_name_and_bio(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/profile', [
            'name' => 'Updated Name',
            'bio' => 'Student of knowledge.',
        ]);

        $response->assertOk()->assertJsonPath('name', 'Updated Name');
        $this->assertDatabaseHas('users', ['id' => $user->id, 'name' => 'Updated Name']);
    }

    public function test_a_user_can_upload_a_profile_picture(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/profile', [
            'avatar' => UploadedFile::fake()->image('avatar.jpg'),
        ]);

        $response->assertOk();
        $path = $user->fresh()->avatar_path;
        $this->assertNotNull($path);
        Storage::disk('public')->assertExists($path);
    }

    public function test_a_user_can_change_their_password(): void
    {
        $user = User::factory()->create(['password' => bcrypt('OldPassword123')]);

        $response = $this->actingAs($user)->putJson('/api/profile/password', [
            'current_password' => 'OldPassword123',
            'password' => 'NewPassword123',
            'password_confirmation' => 'NewPassword123',
        ]);

        $response->assertOk();
    }
}
