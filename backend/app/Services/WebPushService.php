<?php

namespace App\Services;

use App\Models\PushSubscription;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Minimal Web Push sender (RFC 8292 VAPID, tickle-only).
 *
 * Pushes carry NO payload — the service worker wakes, fetches the latest
 * unread database notification over the normal API, and renders locally.
 * This keeps all content inside our own infrastructure and avoids shipping
 * a payload-encryption stack: only VAPID JWT signing (ES256) is needed,
 * using the P-256 keypair from WEBPUSH_VAPID_* (free, self-generated).
 */
class WebPushService
{
    /**
     * Send a content-free tickle to every subscription of a user.
     * Dead endpoints (404/410) are pruned. Failures never throw.
     *
     * @return int number of endpoints that accepted the push
     */
    public function tickleUser(int $userId, string $urgency = 'normal', int $ttl = 3600): int
    {
        $accepted = 0;

        $subscriptions = PushSubscription::query()->where('user_id', $userId)->get();

        foreach ($subscriptions as $subscription) {
            if ($this->sendTickle($subscription, $urgency, $ttl, $userId)) {
                $accepted++;
            }
        }

        return $accepted;
    }

    public function isConfigured(): bool
    {
        return trim((string) config('services.webpush.private_key')) !== '';
    }

    protected function sendTickle(PushSubscription $subscription, string $urgency, int $ttl, ?int $userId = null): bool
    {
        if (! $this->isConfigured()) {
            $this->recordAttempt($userId, 'not_configured');

            return false;
        }

        try {
            $jwt = $this->vapidJwt($subscription->endpoint);

            $response = Http::timeout(10)
                ->withHeaders([
                    'Authorization' => 'vapid t='.$jwt.', k='.trim((string) config('services.webpush.public_key')),
                    'TTL' => (string) $ttl,
                    'Urgency' => $urgency,
                ])
                ->withBody('', 'text/plain')
                ->post($subscription->endpoint);

            if ($response->status() === 404 || $response->status() === 410) {
                $subscription->delete();
                $this->recordAttempt($userId, 'expired');

                return false;
            }

            if (! $response->successful()) {
                // Never silent: log the push-service verdict (status + host
                // only — no tokens, keys, or endpoints) so handshake failures
                // like a mismatched VAPID key become diagnosable.
                Log::warning('Web push rejected by push service.', [
                    'status' => $response->status(),
                    'host' => parse_url($subscription->endpoint, PHP_URL_HOST),
                ]);
                $this->recordAttempt($userId, 'rejected');

                return false;
            }

            $this->recordAttempt($userId, 'delivered');

            return true;
        } catch (\Throwable $exception) {
            Log::warning('Web push tickle failed.', [
                'subscription_id' => $subscription->id,
                'status' => method_exists($exception, 'getCode') ? $exception->getCode() : null,
            ]);
            $this->recordAttempt($userId, 'error');

            return false;
        }
    }

    /**
     * Last delivery receipt per user (outcome word + time only — nothing
     * sensitive). Powers the plain-language status line in Settings.
     */
    protected function recordAttempt(?int $userId, string $outcome): void
    {
        if ($userId === null) {
            return;
        }

        try {
            \Illuminate\Support\Facades\Cache::put(
                "push:last:{$userId}",
                ['outcome' => $outcome, 'at' => now()->toIso8601String()],
                now()->addDay()
            );
        } catch (\Throwable) {
            // telemetry must never break delivery
        }
    }

    public static function lastAttemptFor(int $userId): ?array
    {
        try {
            $record = \Illuminate\Support\Facades\Cache::get("push:last:{$userId}");

            return is_array($record) ? $record : null;
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * Build a VAPID JWT (ES256) for a push endpoint's origin.
     */
    protected function vapidJwt(string $endpoint): string
    {
        $parts = parse_url($endpoint);
        $audience = ($parts['scheme'] ?? 'https').'://'.($parts['host'] ?? '');
        if (! empty($parts['port'])) {
            $audience .= ':'.$parts['port'];
        }

        $header = $this->base64Url(json_encode(['typ' => 'JWT', 'alg' => 'ES256']));
        $payload = $this->base64Url(json_encode([
            'aud' => $audience,
            'exp' => time() + 43200,
            'sub' => trim((string) config('services.webpush.subject')),
        ]));

        $signingInput = $header.'.'.$payload;
        $signature = $this->es256Sign($signingInput);

        return $signingInput.'.'.$signature;
    }

    /**
     * ES256-sign with the raw 32-byte P-256 private key (base64url).
     * Returns base64url(R || S), converting OpenSSL's DER output.
     */
    protected function es256Sign(string $input): string
    {
        $d = $this->base64UrlDecode(trim((string) config('services.webpush.private_key')));

        if (strlen($d) !== 32) {
            throw new \RuntimeException('WEBPUSH_VAPID_PRIVATE must decode to 32 bytes.');
        }

        $privateKey = openssl_pkey_get_private($this->sec1Pem($d));

        if (! $privateKey) {
            throw new \RuntimeException('Unusable VAPID private key.');
        }

        $der = '';
        if (! openssl_sign($input, $der, $privateKey, OPENSSL_ALGO_SHA256)) {
            throw new \RuntimeException('VAPID signing failed.');
        }

        return $this->base64Url($this->derToRaw($der));
    }

    /**
     * Wrap a raw P-256 scalar in a minimal SEC1 EC PRIVATE KEY envelope.
     *
     * The public point is intentionally omitted: OpenSSL derives it from
     * the scalar on load, so there is no embedded point that could ever
     * mismatch. The real public key travels separately as the VAPID `k`
     * parameter; it is only used by the push service, never for signing.
     */
    protected function sec1Pem(string $d): string
    {
        $der = "\x30\x31\x02\x01\x01\x04\x20".$d
            ."\xA0\x0A\x06\x08\x2A\x86\x48\xCE\x3D\x03\x01\x07";

        return "-----BEGIN EC PRIVATE KEY-----\n".chunk_split(base64_encode($der), 64, "\n").'-----END EC PRIVATE KEY-----';
    }

    /**
     * Convert a DER-encoded ECDSA signature to raw R || S (64 bytes).
     */
    protected function derToRaw(string $der): string
    {
        $offset = 0;

        if (ord($der[$offset++]) !== 0x30) {
            throw new \RuntimeException('Bad VAPID signature encoding.');
        }

        $offset += $this->derLengthSize($der, $offset);

        if (ord($der[$offset++]) !== 0x02) {
            throw new \RuntimeException('Bad VAPID signature encoding.');
        }

        $rLen = $this->derLength($der, $offset, $sizeBytes);
        $offset += $sizeBytes;
        $r = substr($der, $offset, $rLen);
        $offset += $rLen;

        if (ord($der[$offset++]) !== 0x02) {
            throw new \RuntimeException('Bad VAPID signature encoding.');
        }

        $sLen = $this->derLength($der, $offset, $sizeBytes);
        $offset += $sizeBytes;
        $s = substr($der, $offset, $sLen);

        return str_pad(ltrim($r, "\x00"), 32, "\x00", STR_PAD_LEFT)
            .str_pad(ltrim($s, "\x00"), 32, "\x00", STR_PAD_LEFT);
    }

    protected function derLengthSize(string $der, int $offset): int
    {
        $first = ord($der[$offset]);

        return ($first & 0x80) ? ($first & 0x7F) + 1 : 1;
    }

    protected function derLength(string $der, int $offset, ?int &$sizeBytes): int
    {
        $first = ord($der[$offset]);

        if (! ($first & 0x80)) {
            $sizeBytes = 1;

            return $first;
        }

        $count = $first & 0x7F;
        $sizeBytes = 1 + $count;
        $length = 0;

        for ($i = 1; $i <= $count; $i++) {
            $length = ($length << 8) | ord($der[$offset + $i]);
        }

        return $length;
    }

    protected function base64Url(string $binary): string
    {
        return rtrim(strtr(base64_encode($binary), '+/', '-_'), '=');
    }

    protected function base64UrlDecode(string $input): string
    {
        $padded = strtr($input, '-_', '+/').str_repeat('=', (4 - strlen($input) % 4) % 4);

        $decoded = base64_decode($padded, true);

        return $decoded === false ? '' : $decoded;
    }
}
