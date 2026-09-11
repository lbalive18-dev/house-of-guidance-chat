<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminUserManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_admin_can_list_users(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        User::factory()->count(3)->create();

        $response = $this->actingAs($admin)->getJson('/api/admin/users');

        $response->assertOk();
        $this->assertCount(4, $response->json('data'));
    }

    public function test_a_non_admin_cannot_access_the_admin_user_list(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);

        $response = $this->actingAs($teacher)->getJson('/api/admin/users');

        $response->assertStatus(403);
    }

    public function test_an_admin_can_change_a_users_role(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $student = User::factory()->create(['role' => 'student']);

        $response = $this->actingAs($admin)->putJson("/api/admin/users/{$student->id}/role", [
            'role' => 'teacher',
        ]);

        $response->assertOk()->assertJsonPath('role', 'teacher');
    }

    public function test_an_admin_can_ban_and_unban_a_user(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $student = User::factory()->create(['role' => 'student']);

        $ban = $this->actingAs($admin)->postJson("/api/admin/users/{$student->id}/ban", [
            'reason' => 'Repeated spam',
        ]);
        $ban->assertOk();
        $this->assertTrue($student->fresh()->is_banned);

        $unban = $this->actingAs($admin)->postJson("/api/admin/users/{$student->id}/unban");
        $unban->assertOk();
        $this->assertFalse($student->fresh()->is_banned);
    }

    public function test_an_admin_cannot_ban_another_admin(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $otherAdmin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->postJson("/api/admin/users/{$otherAdmin->id}/ban", [
            'reason' => 'test',
        ]);

        $response->assertStatus(422);
    }

    public function test_an_admin_cannot_demote_themselves(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->putJson("/api/admin/users/{$admin->id}/role", [
            'role' => 'student',
        ]);

        $response->assertStatus(422);
    }
}
