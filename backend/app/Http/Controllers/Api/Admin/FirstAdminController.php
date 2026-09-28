<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;

class FirstAdminController extends Controller
{
    /**
     * One-time first-admin claim for hosts without server shell access
     * (e.g. Render free plan). Guarded three ways:
     *  - the requester must be signed in with a verified email address;
     *  - no admin account may exist yet (disabled forever after first claim);
     *  - the requester's email must match FIRST_ADMIN_EMAIL from the server
     *    environment (set via the hosting dashboard, never committed).
     * No passwords are read, printed, or changed here.
     */
    public function __invoke(Request $request)
    {
        $user = $request->user();

        abort_unless((bool) $user->email_verified_at, 403, 'Verify your email address first, then try again.');

        abort_if(User::query()->where('role', 'admin')->exists(), 403, 'An admin already exists.');

        $allowed = trim((string) env('FIRST_ADMIN_EMAIL', ''));

        abort_if($allowed === '', 403, 'First-admin claim is not configured yet. Set it in the hosting dashboard, then try again.');

        abort_unless(
            strtolower(trim((string) $user->email)) === strtolower($allowed),
            403,
            'This account is not eligible to claim admin access.'
        );

        $user->forceFill(['role' => 'admin'])->save();

        return new UserResource($user->fresh());
    }
}
