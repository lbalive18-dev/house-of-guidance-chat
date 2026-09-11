<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class UpdateLastSeen
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if ($user = $request->user()) {
            // Throttle the write: only touch the DB if the timestamp is stale
            // by more than 60 seconds, to avoid hammering the users table.
            if (! $user->last_seen_at || $user->last_seen_at->lt(now()->subSeconds(60))) {
                $user->forceFill(['last_seen_at' => now()])->saveQuietly();
            }
        }

        return $response;
    }
}
