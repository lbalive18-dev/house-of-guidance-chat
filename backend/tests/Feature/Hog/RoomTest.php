<?php

namespace Tests\Feature\Hog;

use App\Models\Conversation;
use App\Models\User;
use Database\Seeders\RoomSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoomTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_user_can_browse_public_rooms_without_joining(): void
    {
        $this->seed(RoomSeeder::class);
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/rooms');

        $response->assertOk();
        $this->assertCount(5, $response->json());
        $this->assertFalse(collect($response->json())->first()['is_member']);
    }

    public function test_a_user_can_join_a_public_room(): void
    {
        $this->seed(RoomSeeder::class);
        $user = User::factory()->create();
        $room = Conversation::where('room_type', 'tajweed')->first();

        $response = $this->actingAs($user)->postJson("/api/rooms/{$room->id}/join");

        $response->assertOk()->assertJsonPath('is_member', true);
        $this->assertDatabaseHas('conversation_participants', [
            'conversation_id' => $room->id,
            'user_id' => $user->id,
        ]);
    }

    public function test_a_member_can_leave_a_room_via_the_existing_member_route(): void
    {
        $this->seed(RoomSeeder::class);
        $user = User::factory()->create();
        $room = Conversation::where('room_type', 'hifdh')->first();
        $this->actingAs($user)->postJson("/api/rooms/{$room->id}/join");

        $response = $this->actingAs($user)->deleteJson("/api/conversations/{$room->id}/members/{$user->id}");

        $response->assertOk();
    }

    public function test_a_joined_member_can_send_a_message_in_the_room(): void
    {
        $this->seed(RoomSeeder::class);
        $user = User::factory()->create();
        $room = Conversation::where('room_type', 'arabic')->first();
        $this->actingAs($user)->postJson("/api/rooms/{$room->id}/join");

        $response = $this->actingAs($user)->postJson("/api/conversations/{$room->id}/messages", [
            'body' => 'Marhaban!',
        ]);

        $response->assertCreated();
    }

    public function test_a_non_member_cannot_send_a_message_before_joining(): void
    {
        $this->seed(RoomSeeder::class);
        $user = User::factory()->create();
        $room = Conversation::where('room_type', 'ask_sheikh')->first();

        $response = $this->actingAs($user)->postJson("/api/conversations/{$room->id}/messages", [
            'body' => 'Can I ask a question?',
        ]);

        $response->assertStatus(403);
    }
}
