<?php

use App\Http\Controllers\Api\Admin\AdminUserController;
use App\Http\Controllers\Api\Admin\AnalyticsController;
use App\Http\Controllers\Api\Admin\BroadcastController;
use App\Http\Controllers\Api\Admin\ReportController as AdminReportController;
use App\Http\Controllers\Api\ReportController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Admin & Reporting Routes
|--------------------------------------------------------------------------
|
| /reports (filing a report) is open to any authenticated user. Everything
| under /admin requires the "admin" role (see the `admin` middleware alias
| registered in bootstrap/app.php).
|
*/

Route::middleware('auth:sanctum')->post('/reports', [ReportController::class, 'store']);

Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
    Route::get('/users', [AdminUserController::class, 'index']);
    Route::get('/users/{user}', [AdminUserController::class, 'show']);
    Route::put('/users/{user}/role', [AdminUserController::class, 'updateRole']);
    Route::post('/users/{user}/ban', [AdminUserController::class, 'ban']);
    Route::post('/users/{user}/unban', [AdminUserController::class, 'unban']);

    Route::get('/reports', [AdminReportController::class, 'index']);
    Route::put('/reports/{report}', [AdminReportController::class, 'updateStatus']);

    Route::post('/broadcast', [BroadcastController::class, 'store']);

    Route::get('/analytics', [AnalyticsController::class, 'overview']);
});
