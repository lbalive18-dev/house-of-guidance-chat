<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UserSearchController extends Controller
{
    public function __invoke(Request $request)
    {
        $request->validate([
            'q' => ['required', 'string', 'min:1', 'max:100'],
            'role' => ['sometimes', Rule::in(['student', 'teacher', 'admin'])],
        ]);

        $query = $request->string('q');

        $users = User::query()
            ->where('id', '!=', $request->user()->id)
            ->where('is_banned', false)
            ->where(function ($q) use ($query) {
                $q->where('name', 'like', "%{$query}%")
                    ->orWhere('email', 'like', "%{$query}%");
            })
            ->when($request->filled('role'), fn ($q) => $q->where('role', $request->string('role')))
            ->orderBy('name')
            ->limit(20)
            ->get();

        return UserResource::collection($users);
    }
}
