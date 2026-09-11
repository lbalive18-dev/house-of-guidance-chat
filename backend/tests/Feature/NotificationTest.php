<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\WelcomeNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_welcome_notification_is_sent_on_registration(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Omar Farooq',
            'email' => 'omar@example.com',
            'password' => 'Password123',
            'password_confirmation' => 'Password123',
        ]);

        $response->assertCreated();
        $user = User::where('email', 'omar@example.com')->first();
        $this->assertCount(1, $user->notifications);
    }

    public function test_a_user_can_list_and_mark_notifications_as_read(): void
    {
        $user = User::factory()->create();
        $user->notify(new WelcomeNotification);

        $unread = $this->actingAs($user)->getJson('/api/notifications/unread-count');
        $unread->assertOk()->assertJson(['unread_count' => 1]);

        $list = $this->actingAs($user)->getJson('/api/notifications');
        $list->assertOk();
        $notificationId = $list->json('data.0.id');

        $markRead = $this->actingAs($user)->postJson("/api/notifications/{$notificationId}/read");
        $markRead->assertOk();

        $unreadAfter = $this->actingAs($user)->getJson('/api/notifications/unread-count');
        $unreadAfter->assertJson(['unread_count' => 0]);
    }
}
