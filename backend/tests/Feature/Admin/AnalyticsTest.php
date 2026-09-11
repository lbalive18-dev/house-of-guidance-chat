<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AnalyticsTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_admin_can_view_the_analytics_overview(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        User::factory()->count(2)->create(['role' => 'student']);

        $response = $this->actingAs($admin)->getJson('/api/admin/analytics');

        $response->assertOk()->assertJsonStructure([
            'users' => ['total', 'students', 'teachers', 'admins', 'verified', 'banned'],
            'chats' => ['private_conversations', 'groups', 'rooms', 'total_messages'],
            'community' => ['upcoming_events', 'total_registrations'],
            'moderation' => ['pending_reports', 'resolved_reports'],
            'messages_per_day',
            'signups_per_day',
        ]);
        $this->assertEquals(3, $response->json('users.total'));
    }

    public function test_a_non_admin_cannot_view_analytics(): void
    {
        $student = User::factory()->create(['role' => 'student']);

        $response = $this->actingAs($student)->getJson('/api/admin/analytics');

        $response->assertStatus(403);
    }
}
