# FREE Production Deployment — House of Guidance Chat v1

Target: **$0/month** on Oracle Cloud Always Free + Cloudflare Workers free +
Brevo free SMTP + DuckDNS. Do every step in order; do not skip ahead.

Final production hosts (fixed — do not change without updating
`backend/.env`, `frontend/.env.production.example`, `wrangler.jsonc`,
and the Caddyfile together):

- Chat: `https://chat.houseofguidancechat.duckdns.org`
- API: `https://api.houseofguidancechat.duckdns.org`
- Reverb: `wss://ws.houseofguidancechat.duckdns.org`

---

## 1. DNS

In DuckDNS (houseofguidancechat.duckdns.org), point three `A` records at
the server IP (obtained in step 2):

- `chat.houseofguidancechat.duckdns.org`
- `api.houseofguidancechat.duckdns.org`
- `ws.houseofguidancechat.duckdns.org`

Verify from your machine before continuing:

```bash
nslookup chat.houseofguidancechat.duckdns.org
nslookup api.houseofguidancechat.duckdns.org
nslookup ws.houseofguidancechat.duckdns.org
```

All three must resolve to the VM's public IP.

## 2. Oracle VM

1. Create an account at [cloud.oracle.com](https://cloud.oracle.com) (a
   card is required for identity verification; Always Free resources are
   never billed).
2. Create a **Compute Instance**:
   - Shape: `VM.Standard.A1.Flex` (Ampere ARM) — **at most 2 OCPUs /
     12 GB RAM**. Requesting more fails provisioning under the current
     Always Free allowance.
   - Image: **Ubuntu 24.04**.
   - Add your SSH public key.
   - Boot volume: default (minimum 47 GB) is plenty.
3. Note the instance's public IP address.
4. Known platform behavior: Oracle **may reclaim instances idle for
   7 days** (CPU p95 <20% *and* network <20% *and* memory <20%). Any
   real usage clears the bar, but check the console if the server ever
   goes dark after a quiet week.

## 3. Firewall

In the instance's Virtual Cloud Network, add ingress rules:

- TCP `80` from `0.0.0.0/0` (Caddy HTTP + ACME challenge)
- TCP `443` from `0.0.0.0/0` (HTTPS + WSS)
- TCP `22` restricted to your IP only (SSH)

On the VM itself (UFW), allow the same:

```bash
sudo ufw allow 80,443/tcp
sudo ufw allow from YOUR_HOME_IP to any port 22
sudo ufw enable
```

## 4. Docker

```bash
ssh ubuntu@YOUR_SERVER_IP
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# log out and back in for the group change to apply
docker --version
docker compose version
```

## 5. Production environment

```bash
git clone <your-repo-url> house-of-guidance-chat
cd house-of-guidance-chat
cp backend/.env.production.example backend/.env
nano backend/.env
```

Replace **every** `CHANGE_ME_*` placeholder (deployment fails closed if
any survive):

- `DB_PASSWORD`, `DB_ROOT_PASSWORD` — long random strings
  (`openssl rand -base64 32`)
- `REVERB_APP_KEY`, `REVERB_APP_SECRET` — long random strings
- `MAIL_USERNAME` / `MAIL_PASSWORD` — Brevo SMTP credentials (step 11)
- `VITE_REVERB_APP_KEY` in the frontend build args must match
  `REVERB_APP_KEY` (wired via `docker-compose.prod.yml`)

Confirm these exact values are present:

```bash
grep -E '^(APP_URL|FRONTEND_URL|REVERB_HOST|REVERB_SCHEME|SESSION_DOMAIN|SANCTUM_STATEFUL_DOMAINS|CORS_ALLOWED_ORIGINS|CACHE_STORE|QUEUE_CONNECTION|BROADCAST_CONNECTION)=' backend/.env
```

Expected:

```text
APP_URL=https://api.houseofguidancechat.duckdns.org
FRONTEND_URL=https://chat.houseofguidancechat.duckdns.org
REVERB_HOST=ws.houseofguidancechat.duckdns.org
REVERB_SCHEME=https
SESSION_DOMAIN=.houseofguidancechat.duckdns.org
SANCTUM_STATEFUL_DOMAINS=chat.houseofguidancechat.duckdns.org
CORS_ALLOWED_ORIGINS=https://chat.houseofguidancechat.duckdns.org
CACHE_STORE=redis
QUEUE_CONNECTION=redis
BROADCAST_CONNECTION=reverb
```

Then generate the application key:

```bash
docker run --rm -v $(pwd)/backend:/app -w /app composer:2 install --no-dev --no-scripts
docker run --rm -v $(pwd)/backend:/app -w /app php:8.3-cli php artisan key:generate
```

## 6. Database

MySQL 8.4 runs as the `mysql` compose service with a persistent
`mysql-data` volume (single-node; there is no managed failover on the
free tier — that is what step 14 covers). Credentials come from the
same `backend/.env` (`DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`,
`DB_ROOT_PASSWORD`). MySQL and Redis expose **no public ports**; they
are reachable only inside the compose network.

## 7. Migrations

Migrations run automatically: the backend entrypoint executes
`php artisan migrate --force` on container boot when
`RUN_MIGRATIONS=true` (set in `docker-compose.prod.yml`). After the
first `./scripts/deploy.sh`, confirm the call tables exist:

```bash
docker compose -f docker-compose.prod.yml exec mysql mysql -u root -p"$DB_ROOT_PASSWORD" \
  -e "SHOW TABLES LIKE 'call\_%'; SHOW TABLES LIKE 'room\_seats';"
```

Expected tables: `call_sessions`, `call_participants`, `room_seats`
(plus the `seat_capacity` column on `conversations`).

## 8. Qur'an seed / import

Seed data files ship in the repo
(`backend/database/data/quran-uthmani.txt`,
`backend/database/data/quran-pickthall.txt`). On a **fresh**
database, run once:

```bash
docker compose -f docker-compose.prod.yml exec backend \
  php artisan db:seed --class=SurahSeeder
docker compose -f docker-compose.prod.yml exec backend \
  php artisan db:seed --class=AyahSeeder
docker compose -f docker-compose.prod.yml exec backend \
  php artisan db:seed --class=QuranTranslationSeeder
docker compose -f docker-compose.prod.yml exec backend \
  php artisan db:seed --class=QuranReciterSeeder
docker compose -f docker-compose.prod.yml exec backend \
  php artisan db:seed --class=QuranAudioSeeder
docker compose -f docker-compose.prod.yml exec backend \
  php artisan db:seed --class=QuranSurahAudioSeeder
```

Each seeder validates its own counts and aborts loudly on mismatch.
Expected final counts: **114 surahs, 6,236 ayahs, 6,236 translations,
4 reciters, 6,236 ayah-audio URLs, 114 surah-audio URLs.** Never run
these with `--force` against a database that already holds user data
without a backup — the seeders upsert by natural key and are safe to
re-run, but step 14 comes first on any non-fresh database.

## 9. Hadith seed / import

Source files ship in the repo (`backend/database/data/hadith/*.json`
plus `SOURCES.json` with provenance and licensing notes):

```bash
docker compose -f docker-compose.prod.yml exec backend \
  php artisan db:seed --class=HadithSeeder
docker compose -f docker-compose.prod.yml exec backend \
  php artisan db:seed --class=HadithBookSeeder
```

Expected counts: **16 legacy entries + 42 Nawawi + 40 Qudsi + 1,896
Riyad + 20 Essentials**. The importer rejects malformed files and
never touches legacy rows (NULL `hadith_number`). Licensing note: the
English translations ship under the sources' public-domain dedication
with unattributed translators — review `SOURCES.json` before any
commercial redistribution.

## 10. Caddy / TLS

`./scripts/deploy.sh` starts Caddy, which requests free Let's Encrypt
certificates for all three hosts on first boot — no manual certbot
steps. Verify issuance:

```bash
curl -sSI https://chat.houseofguidancechat.duckdns.org | head -3
curl -sSI https://api.houseofguidancechat.duckdns.org/up | head -3
```

Both must return HTTP 200 with a valid (non-expired) certificate.
Reverb is served at `wss://ws.houseofguidancechat.duckdns.org`
(reverse-proxied to the `reverb` service; clients never tunnel
WebSockets through the Cloudflare Worker).

## 11. Cloudflare

The Worker serves the built frontend and proxies API/Sanctum/
broadcasting-auth/storage to the Oracle backend:

1. `wrangler.jsonc` must contain exactly:

   ```json
   "vars": { "BACKEND_URL": "https://api.houseofguidancechat.duckdns.org" }
   ```

   There is intentionally **no fallback URL** — a missing
   `BACKEND_URL` fails loudly with HTTP 500 instead of proxying auth
   traffic to the wrong backend.
2. Deploy: `wrangler deploy` (from `frontend/`).
3. Smoke test: load the chat host, register/login (session cookie must
   survive the proxy — check the stripped `Domain=` handling), load one
   avatar via `/storage/`.
4. Quota note: Workers free allows **100,000 requests/day**; static
   assets are unlimited, but every proxied API call counts. Monitor
   usage in the Cloudflare dashboard; over-quota returns 429, not a
   bill.

## 12. Brevo (email)

1. Free account at [brevo.com](https://www.brevo.com) (300 emails/day,
   forever; shared across marketing + transactional).
2. Verify a sender identity for `houseofguidancechat.duckdns.org` (or
   your chosen sender domain) in Brevo, then copy SMTP credentials into
   `MAIL_USERNAME` / `MAIL_PASSWORD`.
3. Test: trigger password-reset from the login page and confirm arrival.

## 13. WebRTC

- STUN works out of the box (`stun:stun.l.google.com:19302`,
  Google's free public server, no SLA).
- TURN is **optional and unconfigured**: set `TURN_URLS` /
  `TURN_USERNAME` / `TURN_CREDENTIAL` in `backend/.env` only when you
  have a TURN server. The $0 path is self-hosting `coturn` on this
  same VM (not part of this deployment). Without TURN,
  symmetric-NAT/mobile-carrier pairs will fail to connect — direct and
  same-network calls work fine.
- Operating limits until an SFU exists: group/room video practical for
  ~4–6 seats; audio-only scales further. The 50-seat maximum is an
  admin knob, not a tested capacity — brief room admins accordingly.

## 14. Health checks

```bash
curl -s https://api.houseofguidancechat.duckdns.org/up | head -c 200; echo
curl -s https://api.houseofguidancechat.duckdns.org/api/ping | head -c 200; echo
curl -s https://api.houseofguidancechat.duckdns.org/api/calls/ice-servers \
  -H "Accept: application/json" | head -c 200; echo
```

Then in browsers: register → verify email → 1-to-1 chat → private
audio call → group call → room call with seats → Qur'an reader audio →
Hadith book counts (42 / 40 / 1,896 / 20).

## 15. Backups

Single-node MySQL has no managed backups. Schedule an off-host dump
**before inviting users** (example nightly cron on the VM, copied
off-host):

```bash
(crontab -l 2>/dev/null; echo "0 2 * * * cd $HOME/house-of-guidance-chat && docker compose -f docker-compose.prod.yml exec -T mysql mysqldump -u root -p\"\$DB_ROOT_PASSWORD\" --all-databases | gzip > ~/hog-backup-\$(date +\%F).sql.gz") | crontab -
```

Also back up the `backend-storage`, `mysql-data`, and `redis-data`
Docker volumes before any upgrade. Test-restore the dump to a scratch
database at least once.

## 16. Final launch

1. Re-run sections 14 end-to-end on the live hosts.
2. Run the backend suite in CI (`php artisan test`) — it could not run
   in the audit environment and must pass before inviting users.
3. Announce `https://chat.houseofguidancechat.duckdns.org` to the
   community.
4. Watch week one: Cloudflare Workers request graph (100k/day cap),
   VM CPU/RAM, disk usage, and Oracle's 7-day idle-reclamation status.

## Costs recap

| Item | Cost |
|------|------|
| Oracle Always Free VM (≤2 OCPU / 12 GB) | $0, 10 TB/mo outbound included |
| Cloudflare Workers + assets (within quota) | $0 |
| Caddy + Let's Encrypt HTTPS | $0 |
| Brevo email (≤300/day) | $0 |
| Reverb, Redis, MySQL, queues (self-hosted) | $0 |
| DuckDNS subdomain | $0 |

Pay later only if: email >300/day, Worker API proxying nears 100k/day,
managed TURN/SFU wanted, or a custom domain (~$10/year).
