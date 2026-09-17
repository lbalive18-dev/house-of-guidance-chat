<?php

use App\Http\Controllers\Api\Call\CallController;
use App\Http\Controllers\Api\Call\RoomSeatController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Call & Room Seat Routes
|--------------------------------------------------------------------------
|
| Voice/video calling over the existing conversation membership model.
| WebRTC offer/answer/ICE travel as signaling envelopes over Reverb
| (private conversation channels); media itself is peer-to-peer and
| never touches this API.
|
*/

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/calls/ice-servers', [CallController::class, 'iceServers']);
    Route::post('/calls/start', [CallController::class, 'start']);
    Route::get('/calls/active/{conversation}', [CallController::class, 'active']);

    Route::get('/calls/{session}', [CallController::class, 'show']);
    Route::post('/calls/{session}/accept', [CallController::class, 'accept']);
    Route::post('/calls/{session}/decline', [CallController::class, 'decline']);
    Route::post('/calls/{session}/cancel', [CallController::class, 'cancel']);
    Route::post('/calls/{session}/end', [CallController::class, 'end']);
    Route::post('/calls/{session}/join', [CallController::class, 'join']);
    Route::post('/calls/{session}/leave', [CallController::class, 'leave']);
    Route::post('/calls/{session}/heartbeat', [CallController::class, 'heartbeat']);
    Route::put('/calls/{session}/media', [CallController::class, 'mediaState']);
    Route::post('/calls/{session}/signal', [CallController::class, 'signal']);
    Route::delete('/calls/{session}/participants/{user}', [CallController::class, 'removeParticipant']);

    Route::get('/rooms/{conversation}/seats', [RoomSeatController::class, 'index']);
    Route::post('/rooms/{conversation}/seats/claim', [RoomSeatController::class, 'claim']);
    Route::delete('/rooms/{conversation}/seats/{seatNumber}', [RoomSeatController::class, 'release']);
    Route::put('/rooms/{conversation}/seat-capacity', [RoomSeatController::class, 'capacity']);
});
