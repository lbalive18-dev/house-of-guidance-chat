<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\BroadcastRequest;
use App\Jobs\SendBroadcastNotification;
use App\Models\User;

class BroadcastController extends Controller
{
    public function store(BroadcastRequest $request)
    {
        $audience = $request->validated('audience', 'all');

        $recipientCount = User::query()
            ->where('is_banned', false)
            ->when($audience === 'students', fn ($q) => $q->where('role', 'student'))
            ->when($audience === 'teachers', fn ($q) => $q->where('role', 'teacher'))
            ->when($audience === 'admins', fn ($q) => $q->where('role', 'admin'))
            ->count();

        SendBroadcastNotification::dispatch(
            $request->validated('title'),
            $request->validated('body'),
            $audience,
            $request->user()->name
        );

        return response()->json([
            'message' => "Broadcast queued for {$recipientCount} recipients.",
            'recipient_count' => $recipientCount,
        ], 202);
    }
}
