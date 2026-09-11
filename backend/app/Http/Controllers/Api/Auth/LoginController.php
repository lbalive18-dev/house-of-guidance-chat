<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class LoginController extends Controller
{
    public function login(LoginRequest $request)
    {
        $credentials = $request->only('email', 'password');

        if (! Auth::attempt($credentials, $request->boolean('remember'))) {
            throw ValidationException::withMessages([
                'email' => 'These credentials do not match our records.',
            ]);
        }

        $user = $request->user();

        if ($user->is_banned) {
            Auth::logout();

            throw ValidationException::withMessages([
                'email' => 'This account has been suspended. Contact an administrator.',
            ]);
        }

        $request->session()->regenerate();

        $user->forceFill(['last_seen_at' => now()])->save();

        return response()->json([
            'message' => 'Logged in successfully.',
            'user' => new UserResource($user),
        ]);
    }

    public function logout(\Illuminate\Http\Request $request)
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Logged out successfully.']);
    }
}
