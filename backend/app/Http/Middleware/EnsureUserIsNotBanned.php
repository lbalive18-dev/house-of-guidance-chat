<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Blocks banned users from accessing any protected route. The
 * `is_banned` / `banned_at` columns are introduced in the Admin module.
 */
class EnsureUserIsNotBanned
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->is_banned) {
            return response()->json([
                'message' => 'Your account has been suspended. Contact an administrator.',
            ], 403);
        }

        return $next($request);
    }
}
