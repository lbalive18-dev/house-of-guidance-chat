<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use App\Models\User;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('hog:make-admin {email}', function (string $email) {
    $user = User::query()->where('email', strtolower(trim($email)))->first();

    if (! $user) {
        $this->error('No registered account was found for that email. Register or sign in to the account first.');

        return self::FAILURE;
    }

    $user->forceFill(['role' => 'admin'])->save();
    $this->info('Admin access granted to the existing account. Its password was not changed.');

    return self::SUCCESS;
})->purpose('Grant admin access to a registered account from the trusted server shell (self-hosted; hosted free plans should use the one-time /admin/claim web page instead)');

// Drop disconnected call participants (and free their room seats) so a
// lost network or closed tab cannot squat a seat forever. Runs every 15
// minutes (not every minute) so metered free-tier databases are not kept
// warm around the clock; the 120s heartbeat threshold still bounds how
// stale a seat can get once a prune pass runs.
Schedule::command('calls:prune-stale')->everyFifteenMinutes();
