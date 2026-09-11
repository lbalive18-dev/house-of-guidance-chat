# House of Guidance Chat

> Seeking Knowledge for the Pleasure of Allah.

A production-grade chat and community platform for House of Guidance —
combining one-to-one and group messaging, Islamic daily content, and
teacher/student classroom rooms in a single installable web app (PWA).

## Tech Stack

| Layer      | Technology |
|------------|------------|
| Backend    | Laravel 12, PHP 8.3, Laravel Sanctum, Laravel Reverb (WebSockets) |
| Frontend   | React 18, TypeScript, Vite, Tailwind CSS, vite-plugin-pwa |
| Database   | MySQL 8.4 |
| Cache/Queue| Redis, database queue driver |
| Infra      | Docker & Docker Compose, Nginx |

## Brand

- Primary: `#0B6E4F`
- Secondary: `#D4AF37`
- Background: `#FFFFFF`
- Clean, modern, Islamic-inspired UI — geometric accents used sparingly, no clutter.

## Project Structure

```
house-of-guidance-chat/
├── backend/            Laravel 12 API (app, routes, migrations, tests)
├── frontend/           React + TypeScript + Vite SPA (PWA-enabled)
├── docker/
│   └── nginx/           Nginx config proxying to PHP-FPM
├── docker-compose.yml   Full local orchestration
└── README.md
```

## Build Modules

Built module by module. All complete:

- [x] **Module 1 — Project Scaffolding**: Laravel + React skeletons, Docker, theme, PWA shell
- [x] **Module 2 — Authentication**: register, login, forgot/reset password, email verification, avatar upload, online status
- [x] Module 3 — Dashboard (recent chats, search, notifications, dark/light mode)
- [x] Module 4 — One-to-one chat (messages, reactions, replies, edit/delete, read receipts, typing, files/voice/images)
- [x] Module 5 — Group chats (roles, members, group icon/description)
- [x] Module 6 — Realtime (Laravel Reverb broadcasting — built directly into Modules 4 & 5 rather than bolted on after)
- [x] Module 7 — Islamic features (Quran verse, Hadith, prayer times, Qiblah, calendar, Dua library)
- [x] Module 8 — House of Guidance features (teacher/student roles, rooms, announcements, events, seminars)
- [x] Module 9 — Admin panel (users, roles, reports, broadcast, moderation, bans, analytics)
- [x] Module 10 — Security hardening & automated tests
- [x] Module 11 — Deployment polish

## Getting Started (Docker — recommended)

1. Copy environment files:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```
2. Build and start every service:
   ```bash
   docker compose up -d --build
   ```
3. Install PHP dependencies and prepare the app (first run only):
   ```bash
   docker compose exec backend composer install
   docker compose exec backend php artisan key:generate
   docker compose exec backend php artisan migrate
   docker compose exec backend php artisan storage:link
   ```
4. Visit:
   - Frontend: http://localhost:5173
   - API: http://localhost:8000/api/ping
   - Mailhog (dev email): http://localhost:8025
   - Reverb WebSocket: ws://localhost:8080

## Getting Started (Manual, without Docker)

**Backend**
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan storage:link
php artisan serve
```

**Frontend**
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## Realtime (Laravel Reverb)

One-to-one chat is fully realtime: new messages, edits, deletes, reactions,
typing indicators, and read receipts all broadcast over WebSockets via
Laravel Reverb (a self-hosted, Pusher-protocol-compatible server — no
third-party service or per-message cost).

- Docker Compose already runs a `reverb` service on port 8080.
- Manually: `php artisan reverb:start --host=0.0.0.0 --port=8080`
- Broadcast events use `ShouldBroadcastNow`, so no queue worker is required
  for messages to arrive instantly (the `queue` container is still useful
  for email and future background jobs).
- Channel authorization lives in `routes/channels.php` — a user may only
  subscribe to `conversation.{id}` if they are an active participant.

## Islamic Features

- **Quran verse & Hadith of the day** rotate deterministically (same content
  for everyone on a given calendar day) and are cached 24h.
- The Quran verse calls the free [AlQuran Cloud](https://alquran.cloud) API
  and **falls back to a small bundled offline list** if that API is ever
  down — the widget never breaks.
- Hadiths and Duas are a **curated local library** (seeded in
  `HadithSeeder`/`DuaSeeder`), not a third-party API — no key, no rate
  limit, always available.
- **Prayer times** and the **Hijri calendar** proxy the free
  [Aladhan API](https://aladhan.com/prayer-times-api) (no key required),
  cached server-side (12h for prayer times, 24h for calendar data) so
  repeated requests don't hit the external API.
- **Qiblah direction** is computed locally with the great-circle bearing
  formula — no external call at all.

## House of Guidance Features

- **Rooms** (Public Discussion, Tajweed, Hifdh, Arabic, Ask the Sheikh) are
  just group conversations with `room_type` + `is_public` set — they reuse
  every chat feature (reactions, replies, files, voice notes, realtime)
  with zero extra code. Seeded automatically via `RoomSeeder`.
- **Teacher/student roles** reuse the `role` column from the Auth module;
  `teacher` and `admin` can post announcements, create events, and manage
  seminar capacity.
- **Announcements** are audience-scoped (`all` / `students` / `teachers`)
  and can be pinned to the top.
- **Event calendar** supports classes, seminars, and general events, with
  optional capacity-limited **seminar registration**.

## Admin Panel

- **User management**: search/filter, change role, ban/unban (with a
  required reason). Admins can't demote or ban themselves, or ban another
  admin.
- **Moderation is report-driven by design**: admins do not get a firehose
  view of every private message in the system (that would be a real
  privacy problem for a chat app) — instead, any user can report a message
  or another user, and admins triage a review queue, optionally deleting
  the reported message on resolution. Deleting a message an admin doesn't
  otherwise have access to is intentionally impossible.
- **Broadcast**: sends an in-app notification to a target audience
  (everyone / students / teachers / admins), dispatched through the queue
  (`SendBroadcastNotification` job) so a large user base doesn't block the
  request.
- **Analytics**: user/chat/community counters plus two 14-day activity bar
  charts (messages/signups per day) — hand-rolled with CSS, no charting
  library dependency added.

## Testing

```bash
cd backend
php artisan test
```

## Dev Seed Accounts

Running `php artisan db:seed` outside production creates three accounts
(password for all: `password`, set by the factory default):

| Role    | Email                          |
|---------|---------------------------------|
| Admin   | admin@houseofguidance.org       |
| Teacher | teacher@houseofguidance.org     |
| Student | student@houseofguidance.org     |

## Authentication

Uses Laravel Sanctum's SPA (cookie-based) flow — no bearer tokens in
`localStorage`, which avoids XSS-exposed credentials:

1. Frontend calls `GET /sanctum/csrf-cookie` once per session.
2. Login/register set an httpOnly session cookie; every subsequent request
   is authenticated automatically by the browser.
3. `POST /api/logout` invalidates the session server-side.

Email verification and password reset links point at the React app
(`FRONTEND_URL` in `backend/.env`), which then calls the signed API URL.


## Security

**CSRF** — Sanctum's SPA cookie flow (`statefulApi()`); state-changing
requests from the configured frontend origin are session + CSRF verified
automatically, no manual token plumbing needed.

**XSS** — React escapes all rendered content by default; the codebase
never uses `dangerouslySetInnerHTML`. Security headers (`X-Content-Type-Options`,
`X-Frame-Options: DENY`, `Referrer-Policy`) are set at **two independent
layers** — the `SecurityHeaders` Laravel middleware and the nginx config —
so they still apply even outside Docker (e.g. `php artisan serve`).

**SQL injection** — 100% Eloquent/query builder with bound parameters; the
only raw SQL in the app is a static `ALTER TABLE` in a migration and one
static `ORDER BY` string, neither of which touch user input (verified by
grep, not just by convention).

**File uploads** — every upload is validated with `mimes:` against actual
file content (not just the extension a client claims), sized-capped, and
stored under a randomized filename outside any PHP-executable path,
regardless of what a client tries to upload as. Verified with a dedicated
test that a mislabeled executable is rejected.

**Mass assignment** — every model declares an explicit `$fillable`; no
model uses `$guarded = []`.

**IDOR / authorization** — every controller that accepts a route-bound
model ID checks the actor has a legitimate relationship to it (conversation
participant, message owner, event owner, etc.) before acting — audited
route by route, not assumed.

**Moderation privacy** — admins cannot browse all private messages system-
wide; moderation is report-driven so an admin only ever sees content a
user has actually flagged (see the Admin Panel section above).

**Rate limiting** — a global 120 req/min baseline on every API route,
tightened to 6 req/min on auth endpoints (register/login/password-reset)
and a dedicated limiter on messaging, configured in
`app/Providers/AppServiceProvider.php`.

**Banned users** are rejected on every authenticated request (not just
login) via `EnsureUserIsNotBanned`, even with an otherwise-valid session.

**Input validation** — every mutating endpoint goes through a Form Request
class with explicit rules; paginated list endpoints clamp `per_page` to a
maximum so a client can't request unbounded page sizes.

**Trusted proxies** — configurable via `TRUSTED_PROXIES` in `.env` rather
than hardcoded to trust everything, since blindly trusting `X-Forwarded-*`
headers from an untrusted source enables IP/scheme spoofing if this app
is ever exposed without a reverse proxy in front of it.

**CI** — `.github/workflows/ci.yml` runs the full backend test suite,
Pint style checks, and a frontend production build on every push/PR.

## Production Deployment

For a real deployment (not local dev), use `docker-compose.prod.yml`
instead of `docker-compose.yml`:

- **Caddy** handles ingress and gets free, auto-renewing HTTPS
  certificates from Let's Encrypt with zero manual certbot steps
- No source bind-mounts — the built image is the deployment artifact
- Migrations run once, from a designated container, not raced across
  every worker replica
- Redis-backed cache/queue instead of the database driver, for real
  concurrent load

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for a full walkthrough of
deploying this for free on Oracle Cloud's Always Free tier — free
compute, free HTTPS, and free transactional email, with a real domain as
the only close-to-unavoidable cost (~$10/year, and even that's optional
if you use a free subdomain).

```bash
cp backend/.env.production.example backend/.env
# fill in the placeholders, then:
./scripts/deploy.sh
```

## License

MIT — built for the House of Guidance community.
