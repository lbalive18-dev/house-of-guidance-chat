<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Seeds the database exactly once, and only when it is provably fresh.
 *
 * Hosts without shell access (Render free tier) cannot run
 * `php artisan db:seed` by hand, so the entrypoint invokes this command
 * when RUN_SEEDS=true. The fresh-database guard (all key tables empty)
 * makes re-running harmless: on any database that already holds users,
 * surahs, or hadiths it exits without touching a row — so legacy
 * create()-based seeders can never duplicate data.
 */
class SeedIfFresh extends Command
{
    protected $signature = 'app:seed-if-fresh';

    protected $description = 'Run db:seed once, only if the database holds no users, surahs, or hadiths.';

    public function handle(): int
    {
        foreach (['users', 'surahs', 'hadiths'] as $table) {
            if (! Schema::hasTable($table)) {
                $this->error("Table '{$table}' is missing — run migrations first.");

                return self::FAILURE;
            }
        }

        if ($this->seedDataIsComplete()) {
            $this->info('Starter data is already complete — skipping seed.');

            return self::SUCCESS;
        }

        $this->info('Starter data is missing or incomplete — seeding or resuming...');
        $exitCode = $this->call('db:seed', ['--force' => true]);

        if ($exitCode !== self::SUCCESS || ! $this->seedDataIsComplete()) {
            $this->error('Starter data seeding did not complete. It will be retried on the next boot.');

            return self::FAILURE;
        }

        $this->info('Seed complete.');

        return self::SUCCESS;
    }

    private function seedDataIsComplete(): bool
    {
        foreach (config('hadith_books.books', []) as $book) {
            if (! DB::table('hadiths')
                ->where('collection', $book['collection'])
                ->whereNotNull('hadith_number')
                ->exists()) {
                return false;
            }
        }

        $reciterId = DB::table('quran_reciters')
            ->where('slug', 'mishary-rashid-alafasy')
            ->value('id');

        if (! $reciterId) {
            return false;
        }

        return DB::table('duas')->count() >= 14
            && DB::table('hadiths')->whereNull('hadith_number')->count() >= 16
            && DB::table('surahs')->count() === 114
            && DB::table('ayahs')->count() === 6236
            && DB::table('quran_translations')
                ->where('language', 'en')
                ->where('translator', 'Mohammed Marmaduke Pickthall')
                ->count() === 6236
            && DB::table('quran_audio')
                ->where('quran_reciter_id', $reciterId)
                ->count() === 6236
            && DB::table('quran_surah_audio')
                ->where('quran_reciter_id', $reciterId)
                ->count() === 114
            && DB::table('conversations')
                ->whereIn('room_type', ['discussion', 'tajweed', 'hifdh', 'arabic', 'ask_sheikh'])
                ->distinct()
                ->count('room_type') === 5;
    }
}
