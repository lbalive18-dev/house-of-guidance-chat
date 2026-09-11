<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Restricts a route to authenticated users with the "teacher" or "admin" role.
 */
class IsTeacher
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! in_array($user->role, ['teacher', 'admin'], true)) {
            return response()->json(['message' => 'Forbidden. Teacher access required.'], 403);
        }

        return $next($request);
    }
}
