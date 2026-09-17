<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\BanUserRequest;
use App\Http\Requests\Admin\UpdateUserRoleRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;

class AdminUserController extends Controller
{
    public function index(Request $request)
    {
        $users = User::query()
            ->when($request->filled('q'), function ($q) use ($request) {
                $term = (string) $request->string('q');
                $q->where(fn ($sub) => $sub->whereLikeInsensitive('name', $term)->whereLikeInsensitive('email', $term, 'or'));
            })
            ->when($request->filled('role'), fn ($q) => $q->where('role', $request->string('role')))
            ->when($request->boolean('banned_only'), fn ($q) => $q->where('is_banned', true))
            ->orderByDesc('created_at')
            ->paginate($this->perPage($request, 25));

        return UserResource::collection($users);
    }

    public function show(User $user)
    {
        return new UserResource($user);
    }

    public function updateRole(UpdateUserRoleRequest $request, User $user)
    {
        abort_if(
            $user->id === $request->user()->id && $request->validated('role') !== 'admin',
            422,
            'You cannot remove your own admin role.'
        );

        $user->update(['role' => $request->validated('role')]);

        return new UserResource($user);
    }

    public function ban(BanUserRequest $request, User $user)
    {
        abort_if($user->id === $request->user()->id, 422, 'You cannot ban yourself.');
        abort_if($user->isAdmin(), 422, 'You cannot ban another admin.');

        $user->update([
            'is_banned' => true,
            'banned_at' => now(),
            'ban_reason' => $request->validated('reason'),
        ]);

        return new UserResource($user);
    }

    public function unban(User $user)
    {
        $user->update(['is_banned' => false, 'banned_at' => null, 'ban_reason' => null]);

        return new UserResource($user);
    }
}
