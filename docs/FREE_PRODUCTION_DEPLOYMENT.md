# Free Cloudflare Worker deployment

This guide deploys the existing React frontend and API proxy to Cloudflare
Workers Free. The Laravel backend remains on Render at
`https://house-of-guidance-chat.onrender.com`, with its existing Neon,
Supabase, Brevo, queue, and Reverb configuration unchanged except for the
frontend-origin values listed below.

## Cost and services

- Use Cloudflare Workers Free. This Worker requires no Workers Paid plan,
  credit card, custom domain, R2, KV, D1, Durable Objects, or other Cloudflare
  paid service.
- Frontend static assets are served as free static assets. Only API,
  Sanctum, broadcasting-auth, and storage paths invoke Worker code; these
  share the Free plan limit of 100,000 Worker requests per account per day.
  Above the free limit requests fail with HTTP 429; there is no automatic
  paid upgrade.
- Reverb WebSockets connect directly from the browser to Render over WSS,
  bypassing Worker request usage.

## Configure and deploy

From the repository root, create `frontend/.env.production` by copying
`frontend/.env.production.example`. Set the following values:

```dotenv
VITE_API_URL=https://house-of-guidance-chat.lbalive18.workers.dev
VITE_REVERB_APP_KEY=<the public REVERB_APP_KEY configured on Render>
VITE_REVERB_HOST=house-of-guidance-chat.onrender.com
VITE_REVERB_PORT=443
VITE_REVERB_SCHEME=https
```

The live Worker URL is `https://house-of-guidance-chat.lbalive18.workers.dev`. The app calls APIs through
same-origin `/` paths; `VITE_API_URL` documents that public origin and is
used for local Vite development proxying. Never use the Reverb app secret in
the frontend.

Install dependencies if this checkout does not already have them, then
authenticate Wrangler and deploy from `frontend/`:

```sh
npm ci
npx wrangler login
npm run build
npx wrangler deploy
```

`npm ci` is only needed once per checkout. The exact Worker URL has the form
`https://house-of-guidance-chat.lbalive18.workers.dev`.

## Configure Render production origins

Copy the exact hostname Wrangler reports, without `https://`, into the
Render backend environment:

```dotenv
FRONTEND_URL=https://house-of-guidance-chat.lbalive18.workers.dev
SANCTUM_STATEFUL_DOMAINS=house-of-guidance-chat.lbalive18.workers.dev
CORS_ALLOWED_ORIGINS=https://house-of-guidance-chat.lbalive18.workers.dev
APP_URL=https://house-of-guidance-chat.onrender.com
REVERB_HOST=house-of-guidance-chat.onrender.com
REVERB_PORT=443
REVERB_SCHEME=https
```

Keep the existing Render `REVERB_APP_KEY` and `REVERB_APP_SECRET` values
private. Set `VITE_REVERB_APP_KEY` to the matching app key (the public client
key, not the app secret). Leave the database settings and schema untouched.

Vite embeds `VITE_*` values during the build. After replacing the placeholder
with the exact Worker URL in `frontend/.env.production`, build and deploy
again:

```sh
npm run build
npx wrangler deploy
```

Check `https://<worker-host>/api/ping`, CSRF cookie and login, a file served
through `/storage/`, and a Reverb connection in the browser. The backend
must accept the exact Worker host in `FRONTEND_URL`,
`SANCTUM_STATEFUL_DOMAINS`, and `CORS_ALLOWED_ORIGINS` for cookie-based
Sanctum authentication to work.

## Bindings and secrets

`frontend/wrangler.jsonc` configures only the static `ASSETS` binding and
the non-secret `BACKEND_URL` variable. There are no Cloudflare storage,
database, KV, Durable Object, queue, or paid-service bindings. No secret
needs to be added to the Worker. Wrangler login authenticates deployment
from the local machine; do not put an API token in the repository.

The deploy commands above do not create Cloudflare resources that require a
card. Keep the account on Workers Free and do not upgrade the plan. Cloudflare
currently lists a 100,000-per-day Free Worker request limit and free,
unlimited static asset requests; check the official [Workers pricing]
(https://developers.cloudflare.com/workers/platform/pricing/) and
[static asset billing limits]
(https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)
if Cloudflare changes these limits.
