<?php

namespace Tests\Feature\Chat;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MessageReactionTest extends TestCase
{
    use RefreshDatabase;

    protected function makeConversationWithMessage(): array
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $conversation = Conversation::create(['type' => 'private', 'created_by' => $user->id]);
        $conversation->participants()->attach([
            $user->id => ['joined_at' => now()],
            $other->id => ['joined_at' => now()],
        ]);
        $message = Message::create(['conversation_id' => $conversation->id, 'sender_id' => $other->id, 'type' => 'text', 'body' => 'Hello']);

        return [$user, $other, $conversation, $message];
    }

    public function test_a_user_can_react_to_a_message(): void
    {
        [$user, , $conversation, $message] = $this->makeConversationWithMessage();

        $response = $this->actingAs($user)->postJson(
            "/api/conversations/{$conversation->id}/messages/{$message->id}/react",
            ['emoji' => '❤️']
        );

        $response->assertOk();
        $this->assertDatabaseHas('message_reactions', [
            'message_id' => $message->id,
            'user_id' => $user->id,
            'emoji' => '❤️',
        ]);
    }

    public function test_reacting_twice_with_the_same_emoji_removes_it(): void
    {
        [$user, , $conversation, $message] = $this->makeConversationWithMessage();

        $this->actingAs($user)->postJson("/api/conversations/{$conversation->id}/messages/{$message->id}/react", ['emoji' => '👍']);
        $this->actingAs($user)->postJson("/api/conversations/{$conversation->id}/messages/{$message->id}/react", ['emoji' => '👍']);

        $this->assertDatabaseMissing('message_reactions', ['message_id' => $message->id, 'user_id' => $user->id]);
    }

    public function test_reacting_with_a_different_emoji_replaces_the_previous_one(): void
    {
        [$user, , $conversation, $message] = $this->makeConversationWithMessage();

        $this->actingAs($user)->postJson("/api/conversations/{$conversation->id}/messages/{$message->id}/react", ['emoji' => '👍']);
        $this->actingAs($user)->postJson("/api/conversations/{$conversation->id}/messages/{$message->id}/react", ['emoji' => '🎉']);

        $this->assertDatabaseMissing('message_reactions', ['message_id' => $message->id, 'emoji' => '👍']);
        $this->assertDatabaseHas('message_reactions', ['message_id' => $message->id, 'emoji' => '🎉']);
    }
}
