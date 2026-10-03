<?php

use App\Http\Controllers\Api\PushController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Push Routes (free VAPID standard — no paid services)
|--------------------------------------------------------------------------
|
| Devices register their browser push subscriptions here. Pushes are
| content-free tickles: the service worker fetches the real content
| (already stored as a database notification) and renders it locally.
|
*/

Route::middleware('auth:sanctum')->prefix('push')->group(function () {
    Route::post('/subscriptions', [PushController::class, 'subscribe']);
    Route::delete('/subscriptions', [PushController::class, 'unsubscribe']);
    Route::post('/fcm-token', [PushController::class, 'storeFcmToken']);
    Route::get('/inbox', [PushController::class, 'inbox']);
    Route::get('/preferences', [PushController::class, 'preferences']);
    Route::put('/preferences', [PushController::class, 'updatePreferences']);
    Route::get('/status', [PushController::class, 'status']);
});
