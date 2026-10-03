<?php

namespace App\Services;

use App\Models\PushSubscription;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Firebase Cloud Messaging sender (free Spark plan, no card).
 *
 * Unlike Web Push tickles, FCM messages carry their own title/body/url so
 * native devices render instantly without an extra fetch. Auth uses the
 * service-account JSON from FIREBASE_SERVICE_ACCOUNT_JSON (OAuth2 JWT
 * bearer flow) — the only secret involved, never committed, never logged.
 */
class FcmService
{
    public function isConfigured(): bool
    {
        return $this->serviceAccount() !== null;
    }

    /**
     * @param  array{title:string,body:string,url:string,tag?:string}  $content
     */
    public function sendToUser(int $userId, array $content, string $urgency = 'normal'): int
    {
        if (! $this->isConfigured()) {
            return 0;
        }

        $tokens = PushSubscription::query()
            ->where('user_id', $userId)
            ->where('platform', 'android')
            ->whereNotNull('fcm_token')
            ->pluck('fcm_token')
            ->unique()
            ->values();

        $sent = 0;

        foreach ($tokens as $token) {
            if ($this->sendToToken($token, $content, $urgency)) {
                $sent++;
            }
        }

        return $sent;
    }

    protected function sendToToken(string $token, array $content, string $urgency): bool
    {
        $accessToken = $this->accessToken();

        if (! $accessToken) {
            return false;
        }

        $account = $this->serviceAccount();

        try {
            $response = Http::timeout(10)
                ->withToken($accessToken)
                ->post(
                    "https://fcm.googleapis.com/v1/projects/{$account['project_id']}/messages:send",
                    [
                        'message' => [
                            'token' => $token,
                            'notification' => [
                                'title' => mb_substr($content['title'], 0, 120),
                                'body' => mb_substr($content['body'], 0, 400),
                            ],
                            'data' => [
                                'url' => $content['url'],
                                'tag' => $content['tag'] ?? 'hog',
                            ],
                            'android' => [
                                'priority' => $urgency === 'high' ? 'high' : 'normal',
                                'notification' => [
                                    'channel_id' => 'hog_default',
                                    'sound' => 'default',
                                    'click_action' => 'FLIP',
                                ],
                            ],
                        ],
                    ]
                );

            if ($response->successful()) {
                return true;
            }

            if ($this->isDeadToken($response->json())) {
                PushSubscription::query()->where('fcm_token', $token)->delete();
            }

            Log::warning('FCM message rejected.', ['status' => $response->status()]);

            return false;
        } catch (\Throwable $exception) {
            Log::warning('FCM send failed.', ['code' => $exception->getCode()]);

            return false;
        }
    }

    protected function isDeadToken(mixed $body): bool
    {
        $error = is_array($body) ? ($body['error']['details'][0]['errorCode'] ?? $body['error']['status'] ?? '') : '';

        return in_array($error, ['UNREGISTERED', 'NOT_FOUND', 'INVALID_ARGUMENT'], true);
    }

    protected function accessToken(): ?string
    {
        $account = $this->serviceAccount();

        if (! $account) {
            return null;
        }

        try {
            return Cache::remember('fcm:access-token', now()->addMinutes(55), function () use ($account) {
            $now = time();
            $header = $this->base64Url(json_encode(['alg' => 'RS256', 'typ' => 'JWT', 'kid' => $account['private_key_id'] ?? null]));
            $claims = $this->base64Url(json_encode([
                'iss' => $account['client_email'],
                'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
                'aud' => 'https://oauth2.googleapis.com/token',
                'iat' => $now,
                'exp' => $now + 3600,
            ]));

            $jwt = $header.'.'.$claims;
            $signature = '';

            if (! openssl_sign($jwt, $signature, $account['private_key'], OPENSSL_ALGO_SHA256)) {
                throw new \RuntimeException('FCM assertion signing failed.');
            }

            $response = Http::timeout(10)->asForm()->post('https://oauth2.googleapis.com/token', [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => $jwt.'.'.$this->base64Url($signature),
            ]);

            if (! $response->successful()) {
                throw new \RuntimeException('FCM OAuth exchange failed (HTTP '.$response->status().').');
            }

            return $response->json('access_token');
        });
        } catch (\Throwable $exception) {
            Log::warning('FCM OAuth failed; native pushes paused until it recovers.');
            report($exception);

            return null;
        }
    }

    protected function serviceAccount(): ?array
    {
        static $account;

        if ($account !== null) {
            return $account === false ? null : $account;
        }

        try {
            $decoded = json_decode((string) env('FIREBASE_SERVICE_ACCOUNT_JSON'), true);
        } catch (\Throwable) {
            $decoded = null;
        }

        $valid = is_array($decoded)
            && isset($decoded['project_id'], $decoded['client_email'], $decoded['private_key'])
            && is_string($decoded['private_key']);

        $account = $valid ? $decoded : false;

        return $valid ? $decoded : null;
    }

    protected function base64Url(string $binary): string
    {
        return rtrim(strtr(base64_encode($binary), '+/', '-_'), '=');
    }
}
