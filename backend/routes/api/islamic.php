<?php

use App\Http\Controllers\Api\Islamic\DuaController;
use App\Http\Controllers\Api\Islamic\HadithController;
use App\Http\Controllers\Api\Islamic\IslamicCalendarController;
use App\Http\Controllers\Api\Islamic\PrayerTimeController;
use App\Http\Controllers\Api\Islamic\QiblahController;
use App\Http\Controllers\Api\Islamic\QuranController;
use App\Http\Controllers\Api\Islamic\QuranBookmarkController;
use App\Http\Controllers\Api\Islamic\QuranProgressController;
use App\Http\Controllers\Api\Islamic\QuranReadingController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Islamic Feature Routes
|--------------------------------------------------------------------------
|
| Daily Quran verse, Quran reading, bookmarks, reading progress,
| Hadith, Dua library, prayer times, Qiblah, and Hijri calendar.
|
*/

Route::middleware('auth:sanctum')->prefix('islamic')->group(function () {
    Route::get('/quran/daily', [QuranController::class, 'daily']);

    Route::get('/quran/bookmarks', [QuranBookmarkController::class, 'index']);
    Route::post('/quran/ayahs/{ayah}/bookmark', [QuranBookmarkController::class, 'store']);
    Route::delete('/quran/ayahs/{ayah}/bookmark', [QuranBookmarkController::class, 'destroy']);

    Route::get('/quran/progress/{surah}', [QuranProgressController::class, 'show']);
    Route::post('/quran/progress/{surah}/ayah/{ayah}', [QuranProgressController::class, 'store']);

    Route::get('/quran', [QuranReadingController::class, 'index']);
    Route::get('/quran/reciters', [QuranReadingController::class, 'reciters']);
    Route::get('/quran/{surah}', [QuranReadingController::class, 'show']);

    Route::get('/hadith/daily', [HadithController::class, 'daily']);
    Route::get('/hadith', [HadithController::class, 'index']);
    Route::get('/hadith/categories', [HadithController::class, 'categories']);

    Route::get('/duas', [DuaController::class, 'index']);
    Route::get('/duas/categories', [DuaController::class, 'categories']);
    Route::get('/duas/{dua}', [DuaController::class, 'show']);

    Route::get('/prayer-times', PrayerTimeController::class);
    Route::get('/qiblah', QiblahController::class);

    Route::get('/hijri-date', [IslamicCalendarController::class, 'today']);
    Route::get('/calendar', [IslamicCalendarController::class, 'month']);
});