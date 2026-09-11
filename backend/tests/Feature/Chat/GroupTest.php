<?php

namespace Tests\Feature\Chat;

use App\Models\Conversation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GroupTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_user_can_create_a_group_and_becomes_admin(): void
    {
        $creator = User::factory()->create();
        $member1 = User::factory()->create();
        $member2 = User::factory()->create();

        $response = $this->actingAs($creator)->postJson('/api/conversations/group', [
            'name' => 'Tajweed Circle',
            'description' => 'Weekly Tajweed practice',
            'member_ids' => [$member1->id, $member2->id],
        ]);

        $response->assertCreated()
            ->assertJsonPath('type', 'group')
            ->assertJsonPath('name', 'Tajweed Circle')
            ->assertJsonPath('my_role', 'admin')
            ->assertJsonPath('participant_count', 3);

        $conversation = Conversation::first();
        $this->assertDatabaseHas('conversation_participants', [
            'conversation_id' => $conversation->id,
            'user_id' => $creator->id,
            'role' => 'admin',
        ]);
        $this->assertDatabaseHas('messages', ['conversation_id' => $conversation->id, 'type' => 'system']);
    }

    public function test_group_creation_requires_at_least_one_member(): void
    {
        $creator = User::factory()->create();

        $response = $this->actingAs($creator)->postJson('/api/conversations/group', [
            'name' => 'Empty Group',
            'member_ids' => [],
        ]);

        $response->assertStatus(422);
    }

    protected function makeGroup(User $admin, array $members): Conversation
    {
        $conversation = Conversation::create(['type' => 'group', 'name' => 'Hifdh Circle', 'created_by' => $admin->id]);
        $conversation->participants()->attach([$admin->id => ['role' => 'admin', 'joined_at' => now()]]);
        foreach ($members as $member) {
            $conversation->participants()->attach([$member->id => ['role' => 'member', 'joined_at' => now()]]);
        }

        return $conversation;
    }

    public function test_an_admin_can_add_members(): void
    {
        $admin = User::factory()->create();
        $existing = User::factory()->create();
        $newMember = User::factory()->create();
        $group = $this->makeGroup($admin, [$existing]);

        $response = $this->actingAs($admin)->postJson("/api/conversations/{$group->id}/members", [
            'member_ids' => [$newMember->id],
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('conversation_participants', [
            'conversation_id' => $group->id,
            'user_id' => $newMember->id,
        ]);
    }

    public function test_a_non_admin_cannot_add_members(): void
    {
        $admin = User::factory()->create();
        $regularMember = User::factory()->create();
        $newMember = User::factory()->create();
        $group = $this->makeGroup($admin, [$regularMember]);

        $response = $this->actingAs($regularMember)->postJson("/api/conversations/{$group->id}/members", [
            'member_ids' => [$newMember->id],
        ]);

        $response->assertStatus(403);
    }

    public function test_an_admin_can_remove_a_member(): void
    {
        $admin = User::factory()->create();
        $member = User::factory()->create();
        $group = $this->makeGroup($admin, [$member]);

        $response = $this->actingAs($admin)->deleteJson("/api/conversations/{$group->id}/members/{$member->id}");

        $response->assertOk();
        $this->assertDatabaseMissing('conversation_participants', [
            'conversation_id' => $group->id,
            'user_id' => $member->id,
        ]);
    }

    public function test_a_member_can_leave_a_group_themselves(): void
    {
        $admin = User::factory()->create();
        $member = User::factory()->create();
        $group = $this->makeGroup($admin, [$member]);

        $response = $this->actingAs($member)->deleteJson("/api/conversations/{$group->id}/members/{$member->id}");

        $response->assertOk();
    }

    public function test_the_only_admin_cannot_be_removed_while_other_members_remain(): void
    {
        $admin = User::factory()->create();
        $member = User::factory()->create();
        $group = $this->makeGroup($admin, [$member]);

        $response = $this->actingAs($admin)->deleteJson("/api/conversations/{$group->id}/members/{$admin->id}");

        $response->assertStatus(422);
    }

    public function test_an_admin_can_promote_another_member(): void
    {
        $admin = User::factory()->create();
        $member = User::factory()->create();
        $group = $this->makeGroup($admin, [$member]);

        $response = $this->actingAs($admin)->putJson("/api/conversations/{$group->id}/members/{$member->id}/role", [
            'role' => 'admin',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('conversation_participants', [
            'conversation_id' => $group->id,
            'user_id' => $member->id,
            'role' => 'admin',
        ]);
    }

    public function test_the_last_admin_cannot_be_demoted(): void
    {
        $admin = User::factory()->create();
        $member = User::factory()->create();
        $group = $this->makeGroup($admin, [$member]);

        $response = $this->actingAs($admin)->putJson("/api/conversations/{$group->id}/members/{$admin->id}/role", [
            'role' => 'member',
        ]);

        $response->assertStatus(422);
    }

    public function test_an_admin_can_update_group_name_and_description(): void
    {
        $admin = User::factory()->create();
        $member = User::factory()->create();
        $group = $this->makeGroup($admin, [$member]);

        $response = $this->actingAs($admin)->putJson("/api/conversations/{$group->id}/group", [
            'name' => 'Updated Name',
            'description' => 'Updated description',
        ]);

        $response->assertOk()->assertJsonPath('name', 'Updated Name');
    }

    public function test_a_group_member_can_send_a_message_using_existing_message_routes(): void
    {
        $admin = User::factory()->create();
        $member = User::factory()->create();
        $group = $this->makeGroup($admin, [$member]);

        $response = $this->actingAs($member)->postJson("/api/conversations/{$group->id}/messages", [
            'body' => 'Salaam everyone!',
        ]);

        $response->assertCreated()->assertJsonPath('body', 'Salaam everyone!');
    }
}
