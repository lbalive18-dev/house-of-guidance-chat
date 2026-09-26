<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\UpdatePasswordRequest;
use App\Http\Requests\Auth\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class ProfileController extends Controller
{
    public function show(Request $request)
    {
        return new UserResource($request->user());
    }

    public function update(UpdateProfileRequest $request)
    {
        $user = $request->user();

        $user->fill($request->safe()->except('avatar'));
        $emailChanged = $user->isDirty('email');
        $oldAvatarPath = $user->avatar_path;

        if ($request->hasFile('avatar')) {
            try {
                $path = $request->file('avatar')->store('avatars', 'public');
            } catch (\Throwable $exception) {
                report($exception);

                return response()->json(['message' => 'Profile picture storage is temporarily unavailable. Please try again.'], 503);
            }

            if (! is_string($path) || $path === '') {
                return response()->json(['message' => 'Profile picture storage is temporarily unavailable. Please try again.'], 503);
            }

            $user->avatar_path = $path;
        }

        if ($emailChanged) {
            $user->email_verified_at = null;
        }

        $user->save();

        if ($request->hasFile('avatar') && $oldAvatarPath && $oldAvatarPath !== $user->avatar_path) {
            try {
                Storage::disk('public')->delete($oldAvatarPath);
            } catch (\Throwable $exception) {
                report($exception);
            }
        }

        if ($emailChanged && ! $user->hasVerifiedEmail()) {
            try {
                $user->sendEmailVerificationNotification();
            } catch (\Throwable $exception) {
                // Profile changes are already saved; mail delivery can be retried.
                report($exception);
            }
        }

        return new UserResource($user->fresh());
    }

    public function updatePassword(UpdatePasswordRequest $request)
    {
        $request->user()->forceFill([
            'password' => Hash::make($request->validated('password')),
        ])->save();

        return response()->json(['message' => 'Password updated successfully.']);
    }

    public function deleteAvatar(Request $request)
    {
        $user = $request->user();

        if ($user->avatar_path) {
            Storage::disk('public')->delete($user->avatar_path);
            $user->update(['avatar_path' => null]);
        }

        return new UserResource($user->fresh());
    }
}
