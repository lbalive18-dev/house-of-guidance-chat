<?php

namespace App\Console\Commands;

use App\Jobs\SendPushTickle;
use App\Models\Hadith;
use App\Models\User;
use App\Notifications\ReminderNotification;
use App\Services\PrayerTimeService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

/**
 * Dispatch due daily + prayer reminders (runs every five minutes).
 *
 * Daily Quran/Hadith nudges go out once per user-local day at the user's
 * chosen time. Prayer nudges fire when a prayer starts inside the current
 * window for users who saved a home location. Everything is idempotent
 * (last_reminder_date / last_salah_key), so overlapping or retried runs
 * never double-notify. Free-tier note: if the host sleeps through a slot,
 * the next awake run delivers it — slightly late, never lost.
 */
class RemindersDispatch extends Command
{
    protected $signature = 'reminders:dispatch';

    protected $description = 'Send due daily Quran/Hadith and prayer-time push reminders.';

    public function handle(PrayerTimeService $prayerTimes): int
    {
        $this->dispatchDaily();
        $this->dispatchSalah($prayerTimes);

        return self::SUCCESS;
    }

    protected function dispatchDaily(): void
    {
        User::query()
            ->where('is_banned', false)
            ->where('reminder_enabled', true)
            ->where(function ($query) {
                $query->where('remind_quran', true)->orWhere('remind_hadith', true);
            })
            ->chunkById(200, function ($users) {
                foreach ($users as $user) {
                    try {
                        $this->maybeDailyFor($user);
                    } catch (\Throwable $exception) {
                        report($exception);
                    }
                }
            });
    }

    protected function maybeDailyFor(User $user): void
    {
        try {
            $tz = $user->reminder_timezone ?: 'UTC';
            $now = Carbon::now($tz);
        } catch (\Throwable) {
            $now = Carbon::now('UTC');
        }

        if ($user->last_reminder_date === $now->toDateString()) {
            return;
        }

        [$hour, $minute] = array_map('intval', explode(':', $user->reminder_time ?: '07:00')) + [7, 0];

        if ($now->hour < $hour || ($now->hour === $hour && $now->minute < $minute)) {
            return;
        }

        if ($user->remind_quran) {
            $verse = $this->dailyVerseLine();
            $user->notify(new ReminderNotification([
                'type' => 'quran',
                'title' => 'Did you read Qur’an today?',
                'body' => 'Open a few verses now. '.$verse,
                'url' => '/islamic/quran/read',
            ]));
        }

        if ($user->remind_hadith) {
            $line = $this->dailyHadithLine();
            $user->notify(new ReminderNotification([
                'type' => 'hadith',
                'title' => 'Hadith of the day',
                'body' => $line,
                'url' => '/islamic/hadith',
            ]));
        }

        $user->forceFill(['last_reminder_date' => $now->toDateString()])->save();
        SendPushTickle::dispatch($user->id);
    }

    protected function dailyVerseLine(): string
    {
        try {
            $verse = app(\App\Services\QuranService::class)->dailyVerse();

            return "Today: {$verse['surah']} {$verse['ayah']} — ".mb_substr($verse['translation'] ?? '', 0, 120);
        } catch (\Throwable) {
            return 'A few verses a day keeps the heart connected.';
        }
    }

    protected function dailyHadithLine(): string
    {
        try {
            $count = Hadith::count();

            if ($count === 0) {
                return 'Reflect on a teaching of the Prophet ﷺ today.';
            }

            $index = ((int) now()->format('z')) % $count;
            $hadith = Hadith::orderBy('id')->skip($index)->first();

            return mb_substr($hadith->text ?? '', 0, 140).' — '.$hadith->reference;
        } catch (\Throwable) {
            return 'Reflect on a teaching of the Prophet ﷺ today.';
        }
    }

    protected function dispatchSalah(PrayerTimeService $prayerTimes): void
    {
        User::query()
            ->where('is_banned', false)
            ->where('reminder_enabled', true)
            ->where('remind_salah', true)
            ->whereNotNull('prayer_lat')
            ->whereNotNull('prayer_lng')
            ->chunkById(200, function ($users) use ($prayerTimes) {
                foreach ($users as $user) {
                    try {
                        $this->maybeSalahFor($user, $prayerTimes);
                    } catch (\Throwable $exception) {
                        report($exception);
                    }
                }
            });
    }

    protected function maybeSalahFor(User $user, PrayerTimeService $prayerTimes): void
    {
        try {
            $tz = $user->reminder_timezone ?: 'UTC';
            $now = Carbon::now($tz);
        } catch (\Throwable) {
            return;
        }

        $result = $prayerTimes->forCoordinates((float) $user->prayer_lat, (float) $user->prayer_lng);

        if (! $result || empty($result['timings'])) {
            return;
        }

        foreach (['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as $name) {
            $at = $result['timings'][$name] ?? null;

            if (! is_string($at)) {
                continue;
            }

            try {
                $prayerAt = Carbon::parse($now->toDateString().' '.$at, $tz);
            } catch (\Throwable) {
                continue;
            }

            $key = $now->toDateString().'-'.$name;

            if ($user->last_salah_key === $key) {
                continue;
            }

            // Fire inside the run window: started up to 5 minutes ago or in
            // the next 10 minutes (covers the 5-minute cron cadence).
            $diffMinutes = ($prayerAt->timestamp - $now->timestamp) / 60;

            if ($diffMinutes < -5 || $diffMinutes > 10) {
                continue;
            }

            $user->notify(new ReminderNotification([
                'type' => 'salah',
                'title' => "{$name} prayer",
                'body' => $diffMinutes <= 0
                    ? "It is time for {$name}".($user->prayer_label ? " ({$user->prayer_label})" : '').'.'
                    : "{$name} begins in ".max(1, (int) round($diffMinutes)).' min'.($user->prayer_label ? " ({$user->prayer_label})" : '').'.',
                'url' => '/islamic/prayer-times',
            ]));

            $user->forceFill(['last_salah_key' => $key])->save();
            SendPushTickle::dispatch($user->id, 'high');

            return;
        }
    }
}
