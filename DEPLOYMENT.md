# Deploying House of Guidance Chat for Free

This walks through a genuinely $0/month deployment: Oracle Cloud's
"Always Free" compute tier, a free subdomain, free HTTPS, and free email
delivery. The only cost that's hard to avoid is a real domain name
(~$10/year) if you want one — a free subdomain works too.

## 1. Get a free server (Oracle Cloud)

1. Create an account at [cloud.oracle.com](https://cloud.oracle.com) (a
   card is required for identity verification, but the Always Free
   resources are never billed).
2. Create a **Compute Instance**:
   - Shape: `VM.Standard.A1.Flex` (Ampere ARM) — the Always Free tier
     includes up to 4 OCPUs / 24GB RAM, easily enough for this stack.
   - Image: **Ubuntu 24.04**.
   - Add your SSH public key.
3. Under the instance's **Virtual Cloud Network**, open ingress rules for
   ports `80` and `443` (and optionally `22` restricted to your IP).
4. Note the instance's public IP address.

## 2. Point a domain at it

- **Free option**: use a free subdomain provider (e.g. DuckDNS, or a free
  subdomain from your registrar of choice) pointed at the server's IP via
  an `A` record.
- **Paid option**: buy a domain (~$10/year) and create three `A` records,
  all pointing at the same IP:
  - `chat.yourdomain.com` (frontend)
  - `api.chat.yourdomain.com` (backend API)
  - `ws.chat.yourdomain.com` (Reverb websockets)

## 3. Install Docker on the server

```bash
ssh ubuntu@YOUR_SERVER_IP
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# log out and back in for the group change to apply
```

## 4. Get the code onto the server

```bash
git clone <your-repo-url> house-of-guidance-chat
cd house-of-guidance-chat
```

(If you're not using git, `scp` the project directory instead.)

## 5. Configure the environment

```bash
cp backend/.env.production.example backend/.env
nano backend/.env
```

Fill in, at minimum:
- `APP_DOMAIN`, `API_DOMAIN`, `REVERB_DOMAIN` — your real domains from step 2
- `APP_URL` / `FRONTEND_URL` — `https://` + the domains above
- `DB_PASSWORD`, `DB_ROOT_PASSWORD` — long random strings
  (`openssl rand -base64 32` is an easy way to generate one)
- `REVERB_APP_KEY`, `REVERB_APP_SECRET` — long random strings
- `MAIL_*` — see step 6

Then generate the application key:

```bash
docker run --rm -v $(pwd)/backend:/app -w /app composer:2 install --no-dev --no-scripts
docker run --rm -v $(pwd)/backend:/app -w /app php:8.3-cli php artisan key:generate
```

## 6. Free transactional email (Brevo)

1. Create a free account at [brevo.com](https://www.brevo.com) (300
   emails/day free, forever — plenty for verification and password-reset
   emails at small-to-moderate scale).
2. Under **SMTP & API**, copy your SMTP credentials into `backend/.env`'s
   `MAIL_USERNAME` / `MAIL_PASSWORD`.

## 7. Deploy

```bash
./scripts/deploy.sh
```

This builds the images, starts everything (MySQL, Redis, the Laravel API,
the queue worker, Reverb, the scheduler, the static frontend, and Caddy),
and Caddy automatically requests free Let's Encrypt certificates for your
three domains the first time it starts — no manual certbot steps.

## 8. Verify

- `https://chat.yourdomain.com` — the app itself
- `https://api.chat.yourdomain.com/up` — Laravel's health check
- `https://api.chat.yourdomain.com/api/ping` — API health check

## Updating later

```bash
git pull
./scripts/deploy.sh
```

The entrypoint script re-runs migrations automatically on every backend
container restart, so schema changes deploy themselves.

## Costs recap

| Item | Cost |
|------|------|
| Oracle Cloud Always Free compute | $0/month, forever |
| Caddy + Let's Encrypt HTTPS | $0 |
| Brevo email (up to 300/day) | $0 |
| Reverb (self-hosted websockets) | $0 — no per-connection billing like managed Pusher |
| Domain name | ~$10/year (optional — free subdomains work) |

## When you'd start paying

- If you outgrow the free-tier server's capacity (very high concurrent
  users/storage)
- If you need >300 emails/day (Brevo's next tier, or switch providers)
- If you want push notifications when the app is closed (Firebase Cloud
  Messaging is free, but is additional work beyond what's built here)
