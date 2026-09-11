<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Notifications\WelcomeNotification;
use Illuminate\Auth\Events\Registered;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class RegisterController extends Controller
{
    public function __invoke(RegisterRequest $request)
    {
        $user = User::create([
            'name' => $request->validated('name'),
            'email' => $request->validated('email'),
            'password' => Hash::make($request->validated('password')),
            'role' => $request->validated('role', 'student'),
        ]);

        event(new Registered($user));

        $user->notify(new WelcomeNotification);

        Auth::login($user);

        $request->session()->regenerate();

        return response()->json([
            'message' => 'Account created. Please check your email to verify your address.',
            'user' => new UserResource($user),
        ], 201);
    }
}
