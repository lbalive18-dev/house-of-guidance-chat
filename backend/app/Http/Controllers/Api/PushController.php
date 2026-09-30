<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PushSubscription;
use Illuminate\Http\Request;

class PushController extends Controller
{
    /**
     * Save (or refresh) a device's Web Push subscription.
     */
    public function subscribe(Request $request)
    {
        $validated = $request->validate([
            'endpoint' => ['required', 'string', 'max:2000', 'starts_with:https://'],
            'keys.p256dh' => ['required', 'string', 'max:255'],
            'keys.auth' => ['required', 'string', 'max:255'],
            'user_agent' => ['sometimes', 'nullable', 'string', 'max:255'],
        ]);

        PushSubscription::query()->updateOrCreate(
            ['endpoint' => $validated['endpoint']],
            [
                'user_id' => $request->user()->id,
                'p256dh_key' => $validated['keys']['p256dh'],
                'auth_token' => $validated['keys']['auth'],
                'user_agent' => $validated['user_agent'] ?? substr((string) $request->userAgent(), 0, 255),
            ]
        );

        return response()->json(['message' => 'Push notifications enabled on this device.']);
    }

    public function unsubscribe(Request $request)
    {
        $validated = $request->validate([
            'endpoint' => ['required', 'string', 'max:2000'],
        ]);

        PushSubscription::query()
            ->where('user_id', $request->user()->id)
            ->where('endpoint', $validated['endpoint'])
            ->delete();

        return response()->json(['message' => 'Push notifications disabled on this device.']);
    }

    /**
     * What the service worker renders when a tickle arrives: the newest
     * unread notification, normalized for display. Cookies ride along
     * (same-origin through the Worker proxy), so no token is needed.
     */
    public function inbox(Request $request)
    {
        $notification = $request->user()
            ->unreadNotifications()
            ->latest()
            ->first();

        if (! $notification) {
            return response()->json(['notification' => null, 'unread_count' => 0]);
        }

        $data = $notification->data;
        $type = class_basename($notification->type);

        $url = $data['url'] ?? $data['action_url'] ?? '/';
        $tag = match ($type) {
            'IncomingCallNotification' => 'call-'.($data['session_id'] ?? $notification->id),
            'ReminderNotification' => 'reminder-'.($data['kind'] ?? 'daily').'-'.substr((string) $notification->created_at, 0, 10),
            default => 'hog-'.$notification->id,
        };

        return response()->json([
            'notification' => [
                'id' => $notification->id,
                'kind' => $type,
                'title' => $data['title'] ?? 'House of Guidance',
                'body' => $data['body'] ?? 'You have a new update.',
                'url' => is_string($url) && str_starts_with($url, '/') ? $url : '/',
                'tag' => $tag,
                'created_at' => $notification->created_at,
            ],
            'unread_count' => $request->user()->unreadNotifications()->count(),
        ]);
    }

    public function preferences(Request $request)
    {
        return response()->json([
            'preferences' => $request->user()->only([
                'reminder_enabled',
                'reminder_time',
                'reminder_timezone',
                'remind_quran',
                'remind_hadith',
                'remind_salah',
                'prayer_lat',
                'prayer_lng',
                'prayer_label',
            ]),
            'devices' => PushSubscription::query()
                ->where('user_id', $request->user()->id)
                ->orderByDesc('updated_at')
                ->get(['id', 'user_agent', 'created_at', 'updated_at']),
        ]);
    }

    public function updatePreferences(Request $request)
    {
        $validated = $request->validate([
            'reminder_enabled' => ['sometimes', 'boolean'],
            'reminder_time' => ['sometimes', 'regex:/^([01][0-9]|2[0-3]):[0-5][0-9]$/'],
            'reminder_timezone' => ['sometimes', 'timezone'],
            'remind_quran' => ['sometimes', 'boolean'],
            'remind_hadith' => ['sometimes', 'boolean'],
            'remind_salah' => ['sometimes', 'boolean'],
            'prayer_lat' => ['sometimes', 'nullable', 'numeric', 'between:-90,90'],
            'prayer_lng' => ['sometimes', 'nullable', 'numeric', 'between:-180,180'],
            'prayer_label' => ['sometimes', 'nullable', 'string', 'max:120'],
        ]);

        $request->user()->forceFill($validated)->save();

        return response()->json(['message' => 'Reminder preferences saved.']);
    }

    /**
     * Plain-language readiness for Settings: is the server key present,
     * and how many of this user's devices are registered? Booleans and
     * counts only — nothing sensitive ever leaves the server.
     */
    public function status(Request $request)
    {
        return response()->json([
            'server_ready' => trim((string) config('services.webpush.private_key')) !== '',
            'devices' => PushSubscription::query()->where('user_id', $request->user()->id)->count(),
        ]);
    }
}
