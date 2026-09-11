<?php

namespace Tests\Feature\Chat;

use App\Events\ConversationRead;
use App\Events\UserTyping;
use App\Models\Conversation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class TypingAndReadReceiptTest extends TestCase
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

    public function test_a_participant_can_broadcast_a_typing_event(): void
    {
        Event::fake([UserTyping::class]);
        $user = User::factory()->create();
        $other = User::factory()->create();
        $conversation = $this->makePrivateConversation($user, $other);

        $response = $this->actingAs($user)->postJson("/api/conversations/{$conversation->id}/typing", [
            'is_typing' => true,
        ]);

        $response->assertNoContent();
        Event::assertDispatched(UserTyping::class, fn ($event) => $event->isTyping === true && $event->user->is($user));
    }

    public function test_marking_a_conversation_read_updates_the_pivot_and_broadcasts(): void
    {
        Event::fake([ConversationRead::class]);
        $user = User::factory()->create();
        $other = User::factory()->create();
        $conversation = $this->makePrivateConversation($user, $other);

        $response = $this->actingAs($user)->postJson("/api/conversations/{$conversation->id}/read");

        $response->assertOk();
        $pivot = $conversation->participants()->where('user_id', $user->id)->first()->pivot;
        $this->assertNotNull($pivot->last_read_at);
        Event::assertDispatched(ConversationRead::class);
    }
}
