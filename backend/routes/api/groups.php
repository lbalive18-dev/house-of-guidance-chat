<?php

use App\Http\Controllers\Api\Chat\GroupController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Group Routes
|--------------------------------------------------------------------------
|
| Messaging within a group reuses every endpoint in routes/api/chat.php -
| Conversation and Message controllers don't distinguish private vs group.
| These routes only cover group-specific concerns: creation, info/avatar
| updates, and membership/role management (admin-gated).
|
*/

Route::middleware('auth:sanctum')->prefix('conversations')->group(function () {
    Route::post('/group', [GroupController::class, 'store']);
    Route::put('/{conversation}/group', [GroupController::class, 'update']);
    Route::post('/{conversation}/members', [GroupController::class, 'addMembers']);
    Route::delete('/{conversation}/members/{user}', [GroupController::class, 'removeMember']);
    Route::put('/{conversation}/members/{user}/role', [GroupController::class, 'updateRole']);
});
