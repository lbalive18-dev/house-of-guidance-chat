<?php

namespace Tests\Feature\Call;

use App\Models\Conversation;
use App\Models\RoomSeat;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoomSeatTest extends TestCase
{
    use RefreshDatabase;

    private function room(User $admin, User $member, int $capacity = 2): Conversation
    {
        $conversation = Conversation::create([
            'type' => 'group',
            'room_type' => 'discussion',
            'is_public' => true,
            'seat_capacity' => $capacity,
            'name' => 'Tajweed circle',
            'created_by' => $admin->id,
        ]);
        $conversation->participants()->attach([
            $admin->id => ['role' => 'admin', 'joined_at' => now()],
            $member->id => ['role' => 'member', 'joined_at' => now()],
        ]);

        return $conversation;
    }

    private function startRoomCall(User $admin, Conversation $conversation, string $media = 'audio'): int
    {
        return $this->actingAs($admin)->postJson('/api/calls/start', [
            'conversation_id' => $conversation->id,
            'media' => $media,
        ])->assertCreated()->assertJsonPath('type', 'room')->json('id');
    }

    public function test_only_room_admins_can_start_room_calls(): void
    {
        [$admin, $member] = [User::factory()->create(), User::factory()->create()];
        $conversation = $this->room($admin, $member);

        $this->actingAs($member)->postJson('/api/calls/start', [
            'conversation_id' => $conversation->id,
            'media' => 'audio',
        ])->assertForbidden();

        $this->startRoomCall($admin, $conversation);
    }

    public function test_seat_claim_release_and_full_room(): void
    {
        [$admin, $member] = [User::factory()->create(), User::factory()->create()];
        $extra = User::factory()->create();
        $conversation = $this->room($admin, $member, 2);
        $conversation->participants()->attach([$extra->id => ['role' => 'member', 'joined_at' => now()]]);

        $this->startRoomCall($admin, $conversation);
        $this->actingAs($member)->postJson(
            "/api/calls/{$conversation->activeCallSession()->id}/join"
        )->assertOk();

        // Claim two seats (capacity 2).
        $this->actingAs($admin)->postJson("/api/rooms/{$conversation->id}/seats/claim", ['seat_number' => 1])
            ->assertCreated();
        $this->actingAs($member)->postJson("/api/rooms/{$conversation->id}/seats/claim", ['seat_number' => 2])
            ->assertCreated();

        // Same user cannot hold two seats.
        $this->actingAs($admin)->postJson("/api/rooms/{$conversation->id}/seats/claim", ['seat_number' => 1])
            ->assertStatus(422);

        // Room is full for the third member (after joining the call).
        $this->actingAs($extra)->postJson("/api/calls/{$conversation->activeCallSession()->id}/join")->assertOk();
        $this->actingAs($extra)->postJson("/api/rooms/{$conversation->id}/seats/claim", ['seat_number' => 1])
            ->assertStatus(409);

        // Seats require joining first.
        $outsider = User::factory()->create();
        $conversation->participants()->attach([$outsider->id => ['role' => 'member', 'joined_at' => now()]]);
        $this->actingAs($outsider)->postJson("/api/rooms/{$conversation->id}/seats/claim", ['seat_number' => 1])
            ->assertStatus(422);

        // Release frees the seat.
        $this->actingAs($member)->deleteJson("/api/rooms/{$conversation->id}/seats/2")->assertOk();
        $this->assertDatabaseMissing('room_seats', [
            'conversation_id' => $conversation->id,
            'seat_number' => 2,
        ]);
    }

    public function test_leaving_the_call_releases_the_seat(): void
    {
        [$admin, $member] = [User::factory()->create(), User::factory()->create()];
        $conversation = $this->room($admin, $member);

        $sessionId = $this->startRoomCall($admin, $conversation);
        $this->actingAs($member)->postJson("/api/calls/{$sessionId}/join")->assertOk();
        $this->actingAs($member)->postJson("/api/rooms/{$conversation->id}/seats/claim", ['seat_number' => 3])
            ->assertCreated();

        $this->actingAs($member)->postJson("/api/calls/{$sessionId}/leave")->assertOk();

        $this->assertDatabaseMissing('room_seats', [
            'conversation_id' => $conversation->id,
            'user_id' => $member->id,
        ]);
    }

    public function test_admin_can_configure_capacity_and_cannot_shrink_below_occupied(): void
    {
        [$admin, $member] = [User::factory()->create(), User::factory()->create()];
        $conversation = $this->room($admin, $member, 8);

        $sessionId = $this->startRoomCall($admin, $conversation);
        $this->actingAs($member)->postJson("/api/calls/{$sessionId}/join")->assertOk();
        $this->actingAs($admin)->postJson("/api/rooms/{$conversation->id}/seats/claim", ['seat_number' => 1])->assertCreated();
        $this->actingAs($member)->postJson("/api/rooms/{$conversation->id}/seats/claim", ['seat_number' => 2])->assertCreated();

        // Non-admin cannot configure.
        $this->actingAs($member)->putJson("/api/rooms/{$conversation->id}/seat-capacity", ['seat_capacity' => 12])
            ->assertForbidden();

        // Shrink below 2 occupied → rejected.
        $this->actingAs($admin)->putJson("/api/rooms/{$conversation->id}/seat-capacity", ['seat_capacity' => 1])
            ->assertStatus(422);

        // Grow works.
        $this->actingAs($admin)->putJson("/api/rooms/{$conversation->id}/seat-capacity", ['seat_capacity' => 12])
            ->assertOk()->assertJsonPath('seat_capacity', 12);
    }

    public function test_seats_require_a_live_room_call(): void
    {
        [$admin, $member] = [User::factory()->create(), User::factory()->create()];
        $conversation = $this->room($admin, $member);

        $this->actingAs($admin)->postJson("/api/rooms/{$conversation->id}/seats/claim", ['seat_number' => 1])
            ->assertStatus(422);
    }

    public function test_ending_a_room_call_clears_all_seats(): void
    {
        [$admin, $member] = [User::factory()->create(), User::factory()->create()];
        $conversation = $this->room($admin, $member);

        $sessionId = $this->startRoomCall($admin, $conversation);
        $this->actingAs($member)->postJson("/api/calls/{$sessionId}/join")->assertOk();
        $this->actingAs($admin)->postJson("/api/rooms/{$conversation->id}/seats/claim", ['seat_number' => 1])->assertCreated();

        $this->actingAs($admin)->postJson("/api/calls/{$sessionId}/end")->assertOk();

        $this->assertEquals(0, RoomSeat::where('conversation_id', $conversation->id)->count());
    }
}
