<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\EmailVerificationCode;
use Illuminate\Foundation\Auth\EmailVerificationRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;

class EmailVerificationController extends Controller
{
    /**
     * Handle the signed verification link. This is hit by the frontend
     * (not the raw email link) so it can be called via fetch with the
     * `verify_url` query param captured on the /verify-email page.
     */
    public function verify(EmailVerificationRequest $request)
    {
        if ($request->user()->hasVerifiedEmail()) {
            return response()->json(['message' => 'Email already verified.']);
        }

        $request->fulfill();

        return response()->json(['message' => 'Email verified successfully.']);
    }

    public function resend(Request $request)
    {
        $key = 'verify-email:'.$request->user()->id;

        if (RateLimiter::tooManyAttempts($key, 3)) {
            return response()->json([
                'message' => 'Too many verification emails requested. Please wait before trying again.',
            ], 429);
        }

        RateLimiter::hit($key, 300);

        if ($request->user()->hasVerifiedEmail()) {
            return response()->json(['message' => 'Email already verified.']);
        }

        $request->user()->sendEmailVerificationNotification();

        return response()->json(['message' => 'Verification email sent.']);
    }

    /**
     * Typed-code fallback for the signed link: the user reads 6 digits out
     * of the same email and posts them while signed in. Brute force is
     * bounded by route throttling plus 5 attempts per code, after which a
     * fresh code must be requested.
     */
    public function verifyCode(Request $request)
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'size:6', 'regex:/^[0-9]{6}$/'],
        ]);

        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Email already verified.']);
        }

        $record = EmailVerificationCode::query()
            ->where('email', strtolower(trim($user->getEmailForVerification())))
            ->first();

        abort_if(! $record || $record->isExpired() || $record->attempts >= 5, 422, 'That code is invalid or expired. Request a fresh email and try again.');

        if (! Hash::check($validated['code'], $record->code_hash)) {
            $record->increment('attempts');

            return response()->json(['message' => 'That code does not match. Check the latest email and try again.'], 422);
        }

        $record->delete();
        $user->markEmailAsVerified();

        return response()->json(['message' => 'Email verified successfully.']);
    }
}
