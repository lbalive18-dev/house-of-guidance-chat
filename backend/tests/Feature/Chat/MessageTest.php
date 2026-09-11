<?php

namespace Tests\Feature\Chat;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MessageTest extends TestCase
{
    use RefreshDatabase;

    protected function makePrivateConversation(User $a, User $b): Conversation
    {
        $conversation = Conversation::create(['type' => 'private', 'created_by' => $a->id]);
        $conversation->participants()->attach([
            $a->id => ['joined_at' => now()],
            $b->id => ['joined_at' => now()],
        ]);

        return $conversation;
    }

    public function test_a_participant_can_send_a_text_message(): void
    {
        Event::fake();
        $user = User::factory()->create();
        $other = User::factory()->create();
        $conversation = $this->makePrivateConversation($user, $other);

        $response = $this->actingAs($user)->postJson("/api/conversations/{$conversation->id}/messages", [
            'body' => 'Assalamu alaikum!',
        ]);

        $response->assertCreated()
            ->assertJsonPath('body', 'Assalamu alaikum!')
            ->assertJsonPath('is_mine', true);

        $this->assertDatabaseHas('messages', ['conversation_id' => $conversation->id, 'body' => 'Assalamu alaikum!']);
        $this->assertNotNull($conversation->fresh()->last_message_at);
    }

    public function test_a_non_participant_cannot_send_a_message(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $intruder = User::factory()->create();
        $conversation = $this->makePrivateConversation($user, $other);

        $response = $this->actingAs($intruder)->postJson("/api/conversations/{$conversation->id}/messages", [
            'body' => 'Hi',
        ]);

        $response->assertStatus(403);
    }

    public function test_a_message_requires_a_body_or_an_attachment(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $conversation = $this->makePrivateConversation($user, $other);

        $response = $this->actingAs($user)->postJson("/api/conversations/{$conversation->id}/messages", []);

        $response->assertStatus(422);
    }

    public function test_a_participant_can_send_an_image_attachment(): void
    {
        Storage::fake('chat-attachments');
        $user = User::factory()->create();
        $other = User::factory()->create();
        $conversation = $this->makePrivateConversation($user, $other);

        $response = $this->actingAs($user)->postJson("/api/conversations/{$conversation->id}/messages", [
            'attachment' => UploadedFile::fake()->image('photo.jpg'),
            'attachment_type' => 'image',
        ]);

        $response->assertCreated()->assertJsonPath('type', 'image');
        $this->assertCount(1, $response->json('attachments'));
    }

    public function test_a_sender_can_edit_their_own_recent_text_message(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $conversation = $this->makePrivateConversation($user, $other);

        $message = Message::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $user->id,
            'type' => 'text',
            'body' => 'Original',
        ]);

        $response = $this->actingAs($user)->putJson(
            "/api/conversations/{$conversation->id}/messages/{$message->id}",
            ['body' => 'Edited']
        );

        $response->assertOk()->assertJsonPath('body', 'Edited')->assertJsonPath('is_edited', true);
    }

    public function test_a_user_cannot_edit_someone_elses_message(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $conversation = $this->makePrivateConversation($user, $other);

        $message = Message::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $other->id,
            'type' => 'text',
            'body' => 'Not yours',
        ]);

        $response = $this->actingAs($user)->putJson(
            "/api/conversations/{$conversation->id}/messages/{$message->id}",
            ['body' => 'Hacked']
        );

        $response->assertStatus(403);
    }

    public function test_a_sender_can_delete_their_own_message(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $conversation = $this->makePrivateConversation($user, $other);

        $message = Message::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $user->id,
            'type' => 'text',
            'body' => 'Delete me',
        ]);

        $response = $this->actingAs($user)->deleteJson(
            "/api/conversations/{$conversation->id}/messages/{$message->id}"
        );

        $response->assertOk();
        $this->assertNotNull($message->fresh()->deleted_at);
        $this->assertNull($message->fresh()->body);
    }

    public function test_messages_are_listed_newest_first_with_pagination_meta(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $conversation = $this->makePrivateConversation($user, $other);

        Message::create(['conversation_id' => $conversation->id, 'sender_id' => $user->id, 'type' => 'text', 'body' => 'First']);
        Message::create(['conversation_id' => $conversation->id, 'sender_id' => $other->id, 'type' => 'text', 'body' => 'Second']);

        $response = $this->actingAs($user)->getJson("/api/conversations/{$conversation->id}/messages");

        $response->assertOk();
        $this->assertEquals('Second', $response->json('data.0.body'));
    }

    public function test_a_reply_references_the_original_message(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $conversation = $this->makePrivateConversation($user, $other);

        $original = Message::create(['conversation_id' => $conversation->id, 'sender_id' => $other->id, 'type' => 'text', 'body' => 'Original question']);

        $response = $this->actingAs($user)->postJson("/api/conversations/{$conversation->id}/messages", [
            'body' => 'Here is my reply',
            'reply_to_id' => $original->id,
        ]);

        $response->assertCreated();
        $this->assertEquals($original->id, $response->json('reply_to.id'));
        $this->assertEquals('Original question', $response->json('reply_to.body'));
    }
}
