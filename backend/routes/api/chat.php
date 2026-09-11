<?php

use App\Http\Controllers\Api\Chat\ConversationController;
use App\Http\Controllers\Api\Chat\MessageController;
use App\Http\Controllers\Api\Chat\MessageReactionController;
use App\Http\Controllers\Api\Chat\TypingController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Chat Routes
|--------------------------------------------------------------------------
|
| One-to-one messaging: conversations, messages (send/edit/delete),
| reactions, typing indicators, and read receipts. Group-specific
| endpoints (membership, admin actions) are added in Module 5.
|
*/

Route::middleware('auth:sanctum')->prefix('conversations')->group(function () {
    Route::get('/', [ConversationController::class, 'index']);
    Route::post('/start', [ConversationController::class, 'start']);
    Route::get('/{conversation}', [ConversationController::class, 'show']);
    Route::post('/{conversation}/read', [MessageController::class, 'markRead']);
    Route::post('/{conversation}/typing', TypingController::class);

    Route::middleware('throttle:messages')->group(function () {
        Route::get('/{conversation}/messages', [MessageController::class, 'index']);
        Route::post('/{conversation}/messages', [MessageController::class, 'store']);
        Route::put('/{conversation}/messages/{message}', [MessageController::class, 'update']);
        Route::delete('/{conversation}/messages/{message}', [MessageController::class, 'destroy']);
        Route::post('/{conversation}/messages/{message}/react', [MessageReactionController::class, 'store']);
    });
});
