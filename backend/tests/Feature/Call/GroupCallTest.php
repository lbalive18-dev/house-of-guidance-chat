<?php

namespace Tests\Feature\Call;

use App\Models\CallParticipant;
use App\Models\Conversation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GroupCallTest extends TestCase
{
    use RefreshDatabase;

    private function groupConversation(User $admin, User ...$members): Conversation
    {
        $conversation = Conversation::create([
            'type' => 'group',
            'name' => 'Study circle',
            'created_by' => $admin->id,
        ]);

        $attach = [$admin->id => ['role' => 'admin', 'joined_at' => now()]];
        foreach ($members as $member) {
            $attach[$member->id] = ['role' => 'member', 'joined_at' => now()];
        }
        $conversation->participants()->attach($attach);

        return $conversation;
    }

    public function test_group_members_join_and_leave_without_ending_the_call(): void
    {
        [$admin, $one, $two] = [User::factory()->create(), User::factory()->create(), User::factory()->create()];
        $conversation = $this->groupConversation($admin, $one, $two);

        $sessionId = $this->actingAs($admin)->postJson('/api/calls/start', [
            'conversation_id' => $conversation->id,
            'media' => 'video',
        ])->assertCreated()->assertJsonPath('type', 'group')->json('id');

        $this->actingAs($one)->postJson("/api/calls/{$sessionId}/join")->assertOk();
        $this->actingAs($two)->postJson("/api/calls/{$sessionId}/join")->assertOk();

        // One member leaves: the call survives for the rest.
        $this->actingAs($one)->postJson("/api/calls/{$sessionId}/leave")->assertOk();
        $this->assertDatabaseHas('call_sessions', ['id' => $sessionId, 'status' => 'active']);

        // Media state syncs for joined participants.
        $this->actingAs($two)->putJson("/api/calls/{$sessionId}/media", ['is_muted' => true])->assertNoContent();
        $this->assertDatabaseHas('call_participants', [
            'call_session_id' => $sessionId,
            'user_id' => $two->id,
            'is_muted' => true,
        ]);

        // Everyone leaves: session auto-ends.
        $this->actingAs($two)->postJson("/api/calls/{$sessionId}/leave")->assertOk();
        $this->actingAs($admin)->postJson("/api/calls/{$sessionId}/leave")->assertOk();
        $this->assertDatabaseHas('call_sessions', ['id' => $sessionId, 'status' => 'ended']);
    }

    public function test_admin_can_remove_a_participant(): void
    {
        [$admin, $member] = [User::factory()->create(), User::factory()->create()];
        $conversation = $this->groupConversation($admin, $member);

        $sessionId = $this->actingAs($admin)->postJson('/api/calls/start', [
            'conversation_id' => $conversation->id,
            'media' => 'audio',
        ])->json('id');

        $this->actingAs($member)->postJson("/api/calls/{$sessionId}/join")->assertOk();

        $this->actingAs($admin)->deleteJson("/api/calls/{$sessionId}/participants/{$member->id}")->assertOk();
        $this->assertDatabaseHas('call_participants', [
            'call_session_id' => $sessionId,
            'user_id' => $member->id,
            'status' => CallParticipant::STATUS_REMOVED,
        ]);

        // Removed users cannot rejoin.
        $this->actingAs($member)->postJson("/api/calls/{$sessionId}/join")->assertForbidden();
    }

    public function test_non_admin_cannot_remove_participants(): void
    {
        [$admin, $one, $two] = [User::factory()->create(), User::factory()->create(), User::factory()->create()];
        $conversation = $this->groupConversation($admin, $one, $two);

        $sessionId = $this->actingAs($admin)->postJson('/api/calls/start', [
            'conversation_id' => $conversation->id,
            'media' => 'audio',
        ])->json('id');

        $this->actingAs($one)->postJson("/api/calls/{$sessionId}/join")->assertOk();

        $this->actingAs($one)->deleteJson("/api/calls/{$sessionId}/participants/{$admin->id}")->assertForbidden();
    }
}
