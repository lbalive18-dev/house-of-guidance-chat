<?php

namespace Tests\Unit;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_role_helper_methods_reflect_the_users_role(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $teacher = User::factory()->create(['role' => 'teacher']);
        $student = User::factory()->create(['role' => 'student']);

        $this->assertTrue($admin->isAdmin());
        $this->assertFalse($admin->isTeacher());

        $this->assertTrue($teacher->isTeacher());
        $this->assertFalse($teacher->isAdmin());

        $this->assertTrue($student->isStudent());
        $this->assertFalse($student->isAdmin());
    }

    public function test_a_user_is_online_only_if_seen_within_the_last_two_minutes(): void
    {
        $recentlyActive = User::factory()->create(['last_seen_at' => now()->subSeconds(30)]);
        $longGone = User::factory()->create(['last_seen_at' => now()->subMinutes(10)]);
        $neverSeen = User::factory()->create(['last_seen_at' => null]);

        $this->assertTrue($recentlyActive->is_online);
        $this->assertFalse($longGone->is_online);
        $this->assertFalse($neverSeen->is_online);
    }

    public function test_avatar_url_is_null_without_an_uploaded_avatar(): void
    {
        $user = User::factory()->create(['avatar_path' => null]);

        $this->assertNull($user->avatar_url);
    }
}
