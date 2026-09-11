<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Foundation\Auth\EmailVerificationRequest;
use Illuminate\Http\Request;
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
}
