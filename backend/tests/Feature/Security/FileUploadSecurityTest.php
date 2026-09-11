<?php

namespace Tests\Feature\Security;

use App\Models\Conversation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class FileUploadSecurityTest extends TestCase
{
    use RefreshDatabase;

    protected function makeConversation(User $a, User $b): Conversation
    {
        $conversation = Conversation::create(['type' => 'private']);
        $conversation->participants()->attach([
            $a->id => ['joined_at' => now()],
            $b->id => ['joined_at' => now()],
        ]);

        return $conversation;
    }

    public function test_an_executable_file_is_rejected_regardless_of_its_filename(): void
    {
        Storage::fake('chat-attachments');
        $user = User::factory()->create();
        $other = User::factory()->create();
        $conversation = $this->makeConversation($user, $other);

        $malicious = UploadedFile::fake()->create('totally-a-document.pdf', 50, 'application/x-msdownload');

        $response = $this->actingAs($user)->postJson("/api/conversations/{$conversation->id}/messages", [
            'attachment' => $malicious,
            'attachment_type' => 'file',
        ]);

        $response->assertStatus(422);
    }

    public function test_a_profile_avatar_must_be_a_real_image(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/profile', [
            'avatar' => UploadedFile::fake()->create('not-an-image.txt', 10, 'text/plain'),
        ]);

        $response->assertStatus(422);
    }

    public function test_a_legitimate_pdf_is_accepted(): void
    {
        Storage::fake('chat-attachments');
        $user = User::factory()->create();
        $other = User::factory()->create();
        $conversation = $this->makeConversation($user, $other);

        $response = $this->actingAs($user)->postJson("/api/conversations/{$conversation->id}/messages", [
            'attachment' => UploadedFile::fake()->create('notes.pdf', 500, 'application/pdf'),
            'attachment_type' => 'pdf',
        ]);

        $response->assertCreated();
    }
}
