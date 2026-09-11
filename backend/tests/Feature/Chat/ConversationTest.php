<?php

namespace Tests\Feature\Chat;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ConversationTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_user_can_start_a_new_private_conversation(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/conversations/start', [
            'user_id' => $other->id,
        ]);

        $response->assertOk()->assertJsonPath('type', 'private');
        $this->assertDatabaseHas('conversation_participants', ['user_id' => $user->id]);
        $this->assertDatabaseHas('conversation_participants', ['user_id' => $other->id]);
    }

    public function test_starting_a_conversation_twice_returns_the_same_conversation(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();

        $first = $this->actingAs($user)->postJson('/api/conversations/start', ['user_id' => $other->id]);
        $second = $this->actingAs($user)->postJson('/api/conversations/start', ['user_id' => $other->id]);

        $this->assertEquals($first->json('id'), $second->json('id'));
        $this->assertEquals(1, Conversation::count());
    }

    public function test_a_user_cannot_start_a_conversation_with_themselves(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/conversations/start', ['user_id' => $user->id]);

        $response->assertStatus(422);
    }

    public function test_a_user_sees_only_their_own_conversations_with_last_message_preview(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $stranger = User::factory()->create();

        $conversation = Conversation::create(['type' => 'private', 'created_by' => $user->id, 'last_message_at' => now()]);
        $conversation->participants()->attach([$user->id => ['joined_at' => now()], $other->id => ['joined_at' => now()]]);
        Message::create(['conversation_id' => $conversation->id, 'sender_id' => $other->id, 'body' => 'Salaam!', 'type' => 'text']);

        $strangerConversation = Conversation::create(['type' => 'private', 'created_by' => $stranger->id, 'last_message_at' => now()]);
        $strangerConversation->participants()->attach([$stranger->id => ['joined_at' => now()]]);

        $response = $this->actingAs($user)->getJson('/api/conversations');

        $response->assertOk();
        $ids = collect($response->json('data'))->pluck('id');
        $this->assertTrue($ids->contains($conversation->id));
        $this->assertFalse($ids->contains($strangerConversation->id));
        $this->assertEquals('Salaam!', $response->json('data.0.last_message.body'));
    }

    public function test_a_non_participant_cannot_view_a_conversation(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();

        $conversation = Conversation::create(['type' => 'private', 'created_by' => $owner->id]);
        $conversation->participants()->attach([$owner->id => ['joined_at' => now()]]);

        $response = $this->actingAs($intruder)->getJson("/api/conversations/{$conversation->id}");

        $response->assertStatus(403);
    }
}
