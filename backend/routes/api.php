<?php

use App\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| House of Guidance Chat API. Route groups for chat, groups, Islamic
| features, House of Guidance rooms, and the admin panel are registered
| here module by module, following the same routes/api/*.php pattern
| used for auth.
|
*/

Route::get('/ping', function () {
    return response()->json([
        'app' => config('app.name'),
        'status' => 'ok',
        'time' => now()->toIso8601String(),
    ]);
});

require __DIR__.'/api/auth.php';
require __DIR__.'/api/calls.php';
require __DIR__.'/api/chat.php';
require __DIR__.'/api/groups.php';
require __DIR__.'/api/users.php';
require __DIR__.'/api/notifications.php';
require __DIR__.'/api/islamic.php';
require __DIR__.'/api/hog.php';
require __DIR__.'/api/admin.php';

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return new UserResource($request->user());
});
