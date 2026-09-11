<?php

use App\Http\Controllers\Api\UserSearchController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| User Routes
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/users/search', UserSearchController::class);
});
