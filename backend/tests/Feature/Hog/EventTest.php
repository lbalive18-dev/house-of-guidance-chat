<?php

namespace Tests\Feature\Hog;

use App\Models\Event;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EventTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_teacher_can_create_a_seminar_with_registration(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);

        $response = $this->actingAs($teacher)->postJson('/api/events', [
            'title' => 'Understanding Surah Al-Kahf',
            'description' => 'A weekend seminar.',
            'event_type' => 'seminar',
            'starts_at' => now()->addWeek()->toIso8601String(),
            'requires_registration' => true,
            'capacity' => 2,
        ]);

        $response->assertCreated()->assertJsonPath('title', 'Understanding Surah Al-Kahf');
    }

    public function test_a_student_cannot_create_an_event(): void
    {
        $student = User::factory()->create(['role' => 'student']);

        $response = $this->actingAs($student)->postJson('/api/events', [
            'title' => 'Not allowed',
            'starts_at' => now()->addDay()->toIso8601String(),
        ]);

        $response->assertStatus(403);
    }

    public function test_a_student_can_register_for_a_seminar(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $event = Event::create([
            'title' => 'Seminar', 'event_type' => 'seminar', 'starts_at' => now()->addWeek(),
            'created_by' => $teacher->id, 'requires_registration' => true, 'capacity' => 5,
        ]);
        $student = User::factory()->create();

        $response = $this->actingAs($student)->postJson("/api/events/{$event->id}/register");

        $response->assertOk()->assertJsonPath('is_registered', true)->assertJsonPath('registration_count', 1);
    }

    public function test_registration_is_blocked_once_the_event_is_full(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $event = Event::create([
            'title' => 'Small Seminar', 'event_type' => 'seminar', 'starts_at' => now()->addWeek(),
            'created_by' => $teacher->id, 'requires_registration' => true, 'capacity' => 1,
        ]);
        $firstStudent = User::factory()->create();
        $secondStudent = User::factory()->create();

        $this->actingAs($firstStudent)->postJson("/api/events/{$event->id}/register")->assertOk();
        $response = $this->actingAs($secondStudent)->postJson("/api/events/{$event->id}/register");

        $response->assertStatus(422);
    }

    public function test_a_student_can_unregister_from_a_seminar(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $event = Event::create([
            'title' => 'Seminar', 'event_type' => 'seminar', 'starts_at' => now()->addWeek(),
            'created_by' => $teacher->id, 'requires_registration' => true, 'capacity' => 5,
        ]);
        $student = User::factory()->create();
        $this->actingAs($student)->postJson("/api/events/{$event->id}/register");

        $response = $this->actingAs($student)->deleteJson("/api/events/{$event->id}/register");

        $response->assertOk()->assertJsonPath('is_registered', false);
    }

    public function test_events_can_be_filtered_by_month_and_year(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        Event::create(['title' => 'This month', 'event_type' => 'other', 'starts_at' => now(), 'created_by' => $teacher->id]);
        Event::create(['title' => 'Next year', 'event_type' => 'other', 'starts_at' => now()->addYear(), 'created_by' => $teacher->id]);

        $response = $this->actingAs($teacher)->getJson('/api/events?month='.now()->month.'&year='.now()->year);

        $response->assertOk();
        $titles = collect($response->json('data'))->pluck('title');
        $this->assertTrue($titles->contains('This month'));
        $this->assertFalse($titles->contains('Next year'));
    }
}
