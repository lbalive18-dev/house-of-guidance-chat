<?php

namespace Tests\Feature\Admin;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_user_can_report_a_message(): void
    {
        $reporter = User::factory()->create();
        $sender = User::factory()->create();
        $conversation = Conversation::create(['type' => 'private']);
        $conversation->participants()->attach([$reporter->id => ['joined_at' => now()], $sender->id => ['joined_at' => now()]]);
        $message = Message::create(['conversation_id' => $conversation->id, 'sender_id' => $sender->id, 'type' => 'text', 'body' => 'Inappropriate content']);

        $response = $this->actingAs($reporter)->postJson('/api/reports', [
            'reportable_type' => 'message',
            'reportable_id' => $message->id,
            'reason' => 'Inappropriate content',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('reports', ['reportable_id' => $message->id, 'status' => 'pending']);
    }

    public function test_a_user_cannot_report_the_same_pending_content_twice(): void
    {
        $reporter = User::factory()->create();
        $target = User::factory()->create();

        $this->actingAs($reporter)->postJson('/api/reports', [
            'reportable_type' => 'user', 'reportable_id' => $target->id, 'reason' => 'Spam',
        ])->assertCreated();

        $response = $this->actingAs($reporter)->postJson('/api/reports', [
            'reportable_type' => 'user', 'reportable_id' => $target->id, 'reason' => 'Spam again',
        ]);

        $response->assertStatus(422);
    }

    public function test_a_user_cannot_report_themselves(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/reports', [
            'reportable_type' => 'user', 'reportable_id' => $user->id, 'reason' => 'test',
        ]);

        $response->assertStatus(422);
    }

    public function test_an_admin_can_view_and_resolve_reports(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $reporter = User::factory()->create();
        $target = User::factory()->create();

        $this->actingAs($reporter)->postJson('/api/reports', [
            'reportable_type' => 'user', 'reportable_id' => $target->id, 'reason' => 'Harassment',
        ]);

        $list = $this->actingAs($admin)->getJson('/api/admin/reports');
        $list->assertOk();
        $reportId = $list->json('data.0.id');

        $resolve = $this->actingAs($admin)->putJson("/api/admin/reports/{$reportId}", [
            'status' => 'resolved',
        ]);

        $resolve->assertOk()->assertJsonPath('status', 'resolved');
    }

    public function test_resolving_a_report_can_delete_the_reported_message(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $reporter = User::factory()->create();
        $sender = User::factory()->create();
        $conversation = Conversation::create(['type' => 'private']);
        $conversation->participants()->attach([$reporter->id => ['joined_at' => now()], $sender->id => ['joined_at' => now()]]);
        $message = Message::create(['conversation_id' => $conversation->id, 'sender_id' => $sender->id, 'type' => 'text', 'body' => 'Bad content']);

        $this->actingAs($reporter)->postJson('/api/reports', [
            'reportable_type' => 'message', 'reportable_id' => $message->id, 'reason' => 'Abuse',
        ]);
        $reportId = \App\Models\Report::first()->id;

        $this->actingAs($admin)->putJson("/api/admin/reports/{$reportId}", [
            'status' => 'resolved',
            'delete_content' => true,
        ])->assertOk();

        $this->assertNotNull($message->fresh()->deleted_at);
    }
}
