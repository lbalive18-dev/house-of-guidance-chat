<?php

use App\Http\Controllers\Api\NoorController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Noor — the House of Guidance assistant (free tier)
|--------------------------------------------------------------------------
|
| One endpoint: validate, answer local-first, serve repeats from cache,
| and only then ask the model. The model key never leaves the server.
|
*/

Route::middleware(['auth:sanctum', 'throttle:20,1'])->post('/noor/chat', [NoorController::class, 'chat']);
