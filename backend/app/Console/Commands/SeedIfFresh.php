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

        $existing = (int) DB::table('users')->count()
            + (int) DB::table('surahs')->count()
            + (int) DB::table('hadiths')->count();

        if ($existing > 0) {
            $this->info('Database already holds data — skipping seed.');

            return self::SUCCESS;
        }

        $this->info('Fresh database detected — seeding...');
        $this->call('db:seed', ['--force' => true]);
        $this->info('Seed complete.');

        return self::SUCCESS;
    }
}
