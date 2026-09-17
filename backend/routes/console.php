<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Drop disconnected call participants (and free their room seats) so a
// lost network or closed tab cannot squat a seat forever. Runs every 15
// minutes (not every minute) so metered free-tier databases are not kept
// warm around the clock; the 120s heartbeat threshold still bounds how
// stale a seat can get once a prune pass runs.
Schedule::command('calls:prune-stale')->everyFifteenMinutes();
