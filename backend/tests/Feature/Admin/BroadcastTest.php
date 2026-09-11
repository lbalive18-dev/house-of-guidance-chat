<?php

namespace Tests\Feature\Admin;

use App\Jobs\SendBroadcastNotification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class BroadcastTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_admin_can_queue_a_broadcast_to_all_users(): void
    {
        Queue::fake();
        $admin = User::factory()->create(['role' => 'admin']);
        User::factory()->count(3)->create();

        $response = $this->actingAs($admin)->postJson('/api/admin/broadcast', [
            'title' => 'Eid Announcement',
            'body' => 'Eid prayer will be at 8am insha Allah.',
            'audience' => 'all',
        ]);

        $response->assertStatus(202)->assertJsonPath('recipient_count', 4);
        Queue::assertPushed(SendBroadcastNotification::class);
    }

    public function test_a_non_admin_cannot_send_a_broadcast(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);

        $response = $this->actingAs($teacher)->postJson('/api/admin/broadcast', [
            'title' => 'Not allowed', 'body' => 'test',
        ]);

        $response->assertStatus(403);
    }

    public function test_the_broadcast_job_actually_creates_notifications_for_the_target_audience(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $student = User::factory()->create(['role' => 'student']);
        $teacher = User::factory()->create(['role' => 'teacher']);

        (new SendBroadcastNotification('Title', 'Body', 'students', $admin->name))->handle();

        $this->assertCount(1, $student->fresh()->notifications);
        $this->assertCount(0, $teacher->fresh()->notifications);
    }
}
