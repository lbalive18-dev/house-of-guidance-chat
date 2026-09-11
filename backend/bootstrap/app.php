<?php

use App\Http\Middleware\EnsureUserIsNotBanned;
use App\Http\Middleware\IsAdmin;
use App\Http\Middleware\IsTeacher;
use App\Http\Middleware\SecurityHeaders;
use App\Http\Middleware\UpdateLastSeen;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        channels: __DIR__.'/../routes/channels.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->statefulApi();
        $middleware->redirectGuestsTo("/login");

        $middleware->append(SecurityHeaders::class);

        $middleware->api(prepend: [
            \Illuminate\Http\Middleware\HandleCors::class,
        ]);

        $middleware->api(append: [
            EnsureUserIsNotBanned::class,
            UpdateLastSeen::class,
        ]);

        $middleware->alias([
            'admin' => IsAdmin::class,
            'teacher' => IsTeacher::class,
            'not-banned' => EnsureUserIsNotBanned::class,
        ]);

        $middleware->throttleApi();

        // Behind our own Docker nginx this is safe to leave as '*', but if
        // this app is ever exposed directly to the internet (no reverse
        // proxy in front), set TRUSTED_PROXIES to specific IPs/CIDRs in
        // .env - trusting '*' blindly allows X-Forwarded-* header spoofing.
        $middleware->trustProxies(at: env('TRUSTED_PROXIES', '*'));
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->shouldRenderJsonWhen(function ($request, $throwable) {
            return $request->is('api/*') || $request->expectsJson();
        });
    })->create();
