<?php

use App\Http\Controllers\Api\Hog\AnnouncementController;
use App\Http\Controllers\Api\Hog\EventController;
use App\Http\Controllers\Api\Hog\RoomController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| House of Guidance Routes
|--------------------------------------------------------------------------
|
| Public discussion/class rooms (Tajweed, Hifdh, Arabic, Ask the Sheikh,
| general Discussion) reuse the existing conversation/message endpoints
| for everything after joining - these routes only cover browsing and
| joining. Announcements and the event calendar (with seminar
| registration) are standalone features.
|
*/

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/rooms', [RoomController::class, 'index']);
    Route::post('/rooms/{conversation}/join', [RoomController::class, 'join']);

    Route::get('/announcements', [AnnouncementController::class, 'index']);
    Route::post('/announcements', [AnnouncementController::class, 'store']);
    Route::delete('/announcements/{announcement}', [AnnouncementController::class, 'destroy']);

    Route::get('/events', [EventController::class, 'index']);
    Route::get('/events/{event}', [EventController::class, 'show']);
    Route::post('/events', [EventController::class, 'store']);
    Route::put('/events/{event}', [EventController::class, 'update']);
    Route::delete('/events/{event}', [EventController::class, 'destroy']);
    Route::post('/events/{event}/register', [EventController::class, 'register']);
    Route::delete('/events/{event}/register', [EventController::class, 'unregister']);
});
