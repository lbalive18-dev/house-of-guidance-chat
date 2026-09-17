<?php

namespace App\Providers;

use App\Filesystems\SupabaseStorageAdapter;
use App\Mail\Transport\BrevoApiTransport;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Filesystem\FilesystemAdapter as IlluminateFilesystemAdapter;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use League\Flysystem\Filesystem;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        JsonResource::withoutWrapping();

        // HTTPS mail for hosts that block SMTP ports (Render free tier).
        // Credentials come only from BREVO_API_KEY / BREVO_API_URL.
        Mail::extend('brevo-api', fn () => new BrevoApiTransport(
            apiKey: (string) config('services.brevo.key'),
            apiBaseUrl: (string) config('services.brevo.base_url', 'https://api.brevo.com/v3'),
        ));

        // S3-compatible object storage (Supabase Storage) without extra
        // Composer packages: speaks the Storage REST API over plain HTTPS.
        Storage::extend('supabase', function ($app, array $config) {
            $adapter = new SupabaseStorageAdapter(
                baseUrl: (string) ($config['supabase_url'] ?? ''),
                serviceKey: (string) ($config['supabase_key'] ?? ''),
                bucket: (string) ($config['bucket'] ?? ''),
                prefix: (string) ($config['prefix'] ?? ''),
                publicUrl: (string) ($config['url'] ?? ''),
            );

            return new IlluminateFilesystemAdapter(
                new Filesystem($adapter, $config),
                $adapter,
                $config
            );
        });

        // MySQL's LIKE is case-insensitive but PostgreSQL's is not. Every
        // user-facing search goes through this macro so behavior is
        // identical on MySQL, PostgreSQL, and SQLite.
        Builder::macro('whereLikeInsensitive', function (string $column, string $term, string $boolean = 'and') {
            /** @var Builder $this */
            $wrapped = $this->getModel()->getConnection()->getQueryGrammar()->wrap($column);

            return $this->whereRaw(
                'LOWER('.$wrapped.') LIKE ?',
                ['%'.mb_strtolower($term, 'UTF-8').'%'],
                $boolean
            );
        });

        if (config('app.env') === 'production') {
            URL::forceScheme('https');
        }

        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(120)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('auth', function (Request $request) {
            return Limit::perMinute(6)->by($request->ip());
        });

        RateLimiter::for('messages', function (Request $request) {
            return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
        });
    }
}
