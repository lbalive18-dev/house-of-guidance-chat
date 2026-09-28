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

        abort_if(User::query()->where('role', 'admin')->exists(), 403, 'An admin already exists. Ask an existing admin to grant your account access instead.');

        $allowed = trim((string) $this->allowlistedEmail());

        abort_if($allowed === '', 403, 'First-admin claim is not configured yet. Set FIRST_ADMIN_EMAIL in the hosting dashboard and redeploy, then try again.');

        abort_unless(
            strtolower(trim((string) $user->email)) === strtolower($allowed),
            403,
            'This account is not eligible to claim admin access. Sign in with the allowlisted email address.'
        );

        $user->forceFill(['role' => 'admin'])->save();

        return new UserResource($user->fresh());
    }

    /**
     * Diagnoses claim readiness without revealing any email address.
     * Lets the web UI tell the user exactly which step is missing.
     */
    public function status(Request $request)
    {
        $user = $request->user();

        $adminExists = User::query()->where('role', 'admin')->exists();
        $configured = trim((string) $this->allowlistedEmail()) !== '';
        $verified = (bool) $user->email_verified_at;
        $eligible = $configured
            && strtolower(trim((string) $user->email)) === strtolower(trim((string) $this->allowlistedEmail()));

        return response()->json([
            'admin_exists' => $adminExists,
            'configured' => $configured,
            'verified' => $verified,
            'eligible' => $eligible,
            'is_admin' => $user->role === 'admin',
            // Boolean only — never reveals whether any credential exists or
            // what it is. Lets the UI explain an unverifiable email.
            'mail_configured' => trim((string) config('services.brevo.key', env('BREVO_API_KEY', ''))) !== '',
        ]);
    }

    protected function allowlistedEmail(): string
    {
        // config() first so the value survives the production config cache;
        // env() fallback covers local dev without a cached config.
        $fromConfig = trim((string) config('auth.first_admin_email', ''));

        if ($fromConfig !== '') {
            return $fromConfig;
        }

        return trim((string) env('FIRST_ADMIN_EMAIL', ''));
    }
}
