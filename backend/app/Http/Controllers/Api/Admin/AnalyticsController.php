<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Event;
use App\Models\Message;
use App\Models\Report;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    public function overview()
    {
        $now = now();

        return response()->json([
            'users' => [
                'total' => User::count(),
                'students' => User::where('role', 'student')->count(),
                'teachers' => User::where('role', 'teacher')->count(),
                'admins' => User::where('role', 'admin')->count(),
                'verified' => User::whereNotNull('email_verified_at')->count(),
                'banned' => User::where('is_banned', true)->count(),
                'online_now' => User::where('last_seen_at', '>=', $now->copy()->subMinutes(2))->count(),
                'active_last_7_days' => User::where('last_seen_at', '>=', $now->copy()->subDays(7))->count(),
                'new_last_30_days' => User::where('created_at', '>=', $now->copy()->subDays(30))->count(),
            ],
            'chats' => [
                'private_conversations' => Conversation::where('type', 'private')->count(),
                'groups' => Conversation::where('type', 'group')->whereNull('room_type')->count(),
                'rooms' => Conversation::whereNotNull('room_type')->count(),
                'total_messages' => Message::count(),
                'messages_last_7_days' => Message::where('created_at', '>=', $now->copy()->subDays(7))->count(),
            ],
            'community' => [
                'upcoming_events' => Event::where('starts_at', '>=', $now)->count(),
                'total_registrations' => DB::table('event_registrations')->count(),
            ],
            'moderation' => [
                'pending_reports' => Report::where('status', 'pending')->count(),
                'resolved_reports' => Report::where('status', 'resolved')->count(),
            ],
            'messages_per_day' => $this->messagesPerDay(),
            'signups_per_day' => $this->signupsPerDay(),
        ]);
    }

    /**
     * Message counts for each of the last 14 days, oldest first - used to
     * render a simple activity bar chart on the frontend.
     */
    protected function messagesPerDay(): array
    {
        return $this->countsPerDay(Message::query());
    }

    protected function signupsPerDay(): array
    {
        return $this->countsPerDay(User::query());
    }

    protected function countsPerDay($query): array
    {
        $since = now()->subDays(13)->startOfDay();

        $rows = $query
            ->selectRaw('DATE(created_at) as day, COUNT(*) as total')
            ->where('created_at', '>=', $since)
            ->groupBy('day')
            ->pluck('total', 'day');

        $days = [];
        for ($i = 13; $i >= 0; $i--) {
            $date = now()->subDays($i)->format('Y-m-d');
            $days[] = ['date' => $date, 'count' => (int) ($rows[$date] ?? 0)];
        }

        return $days;
    }
}
