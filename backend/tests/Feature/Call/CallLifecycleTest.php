<?php

namespace Tests\Feature\Call;

use App\Models\CallParticipant;
use App\Models\CallSession;
use App\Models\Conversation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CallLifecycleTest extends TestCase
{
    use RefreshDatabase;

    private function privateConversation(User $a, User $b): Conversation
    {
        $conversation = Conversation::create(['type' => 'private', 'created_by' => $a->id]);
        $conversation->participants()->attach([
            $a->id => ['joined_at' => now()],
            $b->id => ['joined_at' => now()],
        ]);

        return $conversation;
    }

    public function test_private_audio_call_full_lifecycle(): void
    {
        $caller = User::factory()->create();
        $callee = User::factory()->create();
        $conversation = $this->privateConversation($caller, $callee);

        $start = $this->actingAs($caller)->postJson('/api/calls/start', [
            'conversation_id' => $conversation->id,
            'media' => 'audio',
        ]);

        $start->assertCreated()->assertJsonPath('type', 'private')->assertJsonPath('status', 'ringing');
        $sessionId = $start->json('id');

        // Callee accepts → session goes active.
        $this->actingAs($callee)->postJson("/api/calls/{$sessionId}/accept")
            ->assertOk()->assertJsonPath('status', 'active');

        // Caller ends → session ended, nobody missed.
        $end = $this->actingAs($caller)->postJson("/api/calls/{$sessionId}/end");
        $end->assertOk()->assertJsonPath('missed_user_ids', []);

        $this->assertDatabaseHas('call_sessions', ['id' => $sessionId, 'status' => 'ended']);
    }

    public function test_declined_call_marks_no_missed_when_caller_leaves(): void
    {
        $caller = User::factory()->create();
        $callee = User::factory()->create();
        $conversation = $this->privateConversation($caller, $callee);

        $sessionId = $this->actingAs($caller)->postJson('/api/calls/start', [
            'conversation_id' => $conversation->id,
            'media' => 'video',
        ])->json('id');

        $this->actingAs($callee)->postJson("/api/calls/{$sessionId}/decline")->assertOk();

        // Nobody joined: session auto-ends once empty.
        $this->assertDatabaseHas('call_sessions', ['id' => $sessionId, 'status' => 'ended']);
        $this->assertDatabaseHas('call_participants', [
            'call_session_id' => $sessionId,
            'user_id' => $callee->id,
            'status' => CallParticipant::STATUS_DECLINED,
        ]);
    }

    public function test_unanswered_call_marks_callee_missed_with_notification(): void
    {
        $caller = User::factory()->create();
        $callee = User::factory()->create();
        $conversation = $this->privateConversation($caller, $callee);

        $sessionId = $this->actingAs($caller)->postJson('/api/calls/start', [
            'conversation_id' => $conversation->id,
            'media' => 'audio',
        ])->json('id');

        $this->actingAs($caller)->postJson("/api/calls/{$sessionId}/end")
            ->assertOk()->assertJsonPath('missed_user_ids', [$callee->id]);

        $this->assertDatabaseHas('call_participants', [
            'call_session_id' => $sessionId,
            'user_id' => $callee->id,
            'status' => CallParticipant::STATUS_MISSED,
        ]);
        $this->assertDatabaseHas('notifications', [
            'notifiable_id' => $callee->id,
            'type' => 'App\\Notifications\\MissedCallNotification',
        ]);
    }

    public function test_outsider_cannot_start_or_join_a_private_call(): void
    {
        $caller = User::factory()->create();
        $callee = User::factory()->create();
        $outsider = User::factory()->create();
        $conversation = $this->privateConversation($caller, $callee);

        $this->actingAs($outsider)->postJson('/api/calls/start', [
            'conversation_id' => $conversation->id,
            'media' => 'audio',
        ])->assertForbidden();

        $sessionId = $this->actingAs($caller)->postJson('/api/calls/start', [
            'conversation_id' => $conversation->id,
            'media' => 'audio',
        ])->json('id');

        $this->actingAs($outsider)->postJson("/api/calls/{$sessionId}/accept")->assertForbidden();
        $this->actingAs($outsider)->postJson("/api/calls/{$sessionId}/join")->assertForbidden();
    }

    public function test_second_call_in_same_conversation_is_rejected(): void
    {
        $caller = User::factory()->create();
        $callee = User::factory()->create();
        $conversation = $this->privateConversation($caller, $callee);

        $this->actingAs($caller)->postJson('/api/calls/start', [
            'conversation_id' => $conversation->id,
            'media' => 'audio',
        ])->assertCreated();

        $this->actingAs($callee)->postJson('/api/calls/start', [
            'conversation_id' => $conversation->id,
            'media' => 'audio',
        ])->assertStatus(409);

        $this->assertEquals(1, CallSession::count());
    }

    public function test_signaling_requires_both_ends_joined(): void
    {
        $caller = User::factory()->create();
        $callee = User::factory()->create();
        $conversation = $this->privateConversation($caller, $callee);

        $sessionId = $this->actingAs($caller)->postJson('/api/calls/start', [
            'conversation_id' => $conversation->id,
            'media' => 'audio',
        ])->json('id');

        // Callee has not joined: no offers accepted yet.
        $this->actingAs($caller)->postJson("/api/calls/{$sessionId}/signal", [
            'to_user_id' => $callee->id,
            'signal_type' => 'offer',
            'payload' => ['sdp' => 'x', 'type' => 'offer'],
        ])->assertStatus(422);

        $this->actingAs($callee)->postJson("/api/calls/{$sessionId}/accept")->assertOk();

        $this->actingAs($caller)->postJson("/api/calls/{$sessionId}/signal", [
            'to_user_id' => $callee->id,
            'signal_type' => 'offer',
            'payload' => ['sdp' => 'x', 'type' => 'offer'],
        ])->assertNoContent();
    }

    public function test_ice_servers_endpoint_returns_env_configured_servers(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->getJson('/api/calls/ice-servers')
            ->assertOk()->assertJsonStructure(['ice_servers']);
    }
}
