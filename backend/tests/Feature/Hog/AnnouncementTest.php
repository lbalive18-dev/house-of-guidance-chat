<?php

namespace Tests\Feature\Hog;

use App\Models\Announcement;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AnnouncementTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_teacher_can_post_an_announcement(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);

        $response = $this->actingAs($teacher)->postJson('/api/announcements', [
            'title' => 'Ramadan Schedule',
            'body' => 'Our Ramadan class schedule is now posted.',
            'audience' => 'all',
            'pinned' => true,
        ]);

        $response->assertCreated()->assertJsonPath('title', 'Ramadan Schedule');
    }

    public function test_a_student_cannot_post_an_announcement(): void
    {
        $student = User::factory()->create(['role' => 'student']);

        $response = $this->actingAs($student)->postJson('/api/announcements', [
            'title' => 'Not allowed',
            'body' => 'Students should not be able to post this.',
        ]);

        $response->assertStatus(403);
    }

    public function test_students_only_see_announcements_for_all_or_students(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        Announcement::create(['title' => 'For everyone', 'body' => 'x', 'author_id' => $teacher->id, 'audience' => 'all']);
        Announcement::create(['title' => 'For students', 'body' => 'x', 'author_id' => $teacher->id, 'audience' => 'students']);
        Announcement::create(['title' => 'For teachers only', 'body' => 'x', 'author_id' => $teacher->id, 'audience' => 'teachers']);

        $student = User::factory()->create(['role' => 'student']);
        $response = $this->actingAs($student)->getJson('/api/announcements');

        $response->assertOk();
        $titles = collect($response->json('data'))->pluck('title');
        $this->assertTrue($titles->contains('For everyone'));
        $this->assertTrue($titles->contains('For students'));
        $this->assertFalse($titles->contains('For teachers only'));
    }

    public function test_pinned_announcements_are_listed_first(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        Announcement::create(['title' => 'Old normal', 'body' => 'x', 'author_id' => $teacher->id, 'audience' => 'all', 'created_at' => now()->subDays(3)]);
        Announcement::create(['title' => 'Pinned one', 'body' => 'x', 'author_id' => $teacher->id, 'audience' => 'all', 'pinned' => true, 'created_at' => now()->subDays(2)]);

        $response = $this->actingAs($teacher)->getJson('/api/announcements');

        $response->assertOk();
        $this->assertEquals('Pinned one', $response->json('data.0.title'));
    }
}
