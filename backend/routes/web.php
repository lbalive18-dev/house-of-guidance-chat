<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| This application is an API-driven backend consumed by the React SPA.
| The only "web" routes needed are the Sanctum CSRF cookie endpoint
| (registered automatically) and, optionally, signed email links.
|
*/

Route::get('/', function () {
    return response()->json([
        'message' => 'House of Guidance Chat API',
        'docs' => '/api/ping',
    ]);
});
