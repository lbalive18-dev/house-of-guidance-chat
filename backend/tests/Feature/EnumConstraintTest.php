<?php

namespace Tests\Feature;

use App\Models\CallSession;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class EnumConstraintTest extends TestCase
{
    use RefreshDatabase;

    public function test_valid_enum_values_insert_and_read_back(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $conversation = Conversation::create([
            'type' => 'group',
            'name' => 'Circles',
            'created_by' => $admin->id,
        ]);

        $message = Message::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $admin->id,
            'type' => 'system',
            'body' => 'Hello',
        ]);

        $session = CallSession::create([
            'type' => CallSession::TYPE_ROOM,
            'media' => 'video',
            'conversation_id' => $conversation->id,
            'initiator_id' => $admin->id,
            'status' => CallSession::STATUS_RINGING,
        ]);

        $this->assertSame('system', $message->fresh()->type);
        $this->assertSame('video', $session->fresh()->media);
        $this->assertSame('teacher', User::factory()->create(['role' => 'teacher'])->fresh()->role);
    }

    public function test_invalid_enum_values_are_rejected_by_postgresql_check(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            $this->markTestSkipped('PostgreSQL CHECK enforcement only applies on pgsql.');
        }

        $this->expectException(QueryException::class);

        User::factory()->create(['role' => 'superadmin']);
    }

    public function test_search_is_case_insensitive(): void
    {
        User::factory()->create(['name' => 'Amina Yusuf', 'email' => 'amina@example.org']);
        $searcher = User::factory()->create();

        $response = $this->actingAs($searcher)->getJson('/api/users/search?q=AMINA');

        $response->assertOk();
        $this->assertNotEmpty($response->json());
    }
}
