# House of Guidance Chat — Android APK (free, no card)

The APK is built by GitHub Actions on every push that touches `frontend/`
(or manually from the Actions tab). No local Android SDK needed.

## One-time setup (all free)

### 1. Firebase project (FCM push for the APK)

1. Go to console.firebase.google.com → **Add project** → name it
   `house-of-guidance-chat` → decline Analytics → Create. The Spark
   (free, no card) plan covers everything below.
2. **Project Overview → Add app → Android**.
   - Package name (must match exactly): **`org.houseofguidance.chat`**
     (this is the `applicationId` in `frontend/android/app/build.gradle`
     and `appId` in `frontend/capacitor.config.ts` — do not invent your own).
   - Nickname: HoG Chat → Register → **Download `google-services.json`**.
3. **Project Settings → Cloud Messaging**: no action needed (V1 API works
   on Spark by default).
4. **Project Settings → Service accounts** → **Generate new private key**
   → saves a JSON file. This lets your server send pushes.
   Keep it private — same rule as every other server secret.

### 2. GitHub Secrets (repo Settings → Secrets → Actions)

Web build values (same as a production web deploy; the VAPID public key
is public by design):
`VITE_API_URL`, `VITE_REVERB_APP_KEY`, `VITE_REVERB_HOST`,
`VITE_REVERB_PORT`, `VITE_REVERB_SCHEME`, `VITE_VAPID_PUBLIC_KEY`

Firebase file (keeps the real file out of git):
`ANDROID_GOOGLE_SERVICES_JSON` = base64 of your `google-services.json`
(PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes('google-services.json'))`).

### 3. Render (backend) environment

- `FIREBASE_SERVICE_ACCOUNT_JSON` = the entire service-account JSON file
  contents pasted as one value. Redeploy after saving.
- `CORS_ALLOWED_ORIGINS` and `SANCTUM_STATEFUL_DOMAINS` already include
  the native origins (`http://localhost`, `capacitor://localhost`) —
  no action needed.

## Get the APK

Actions tab → latest **Android APK** run → **Artifacts** →
`house-of-guidance-chat-debug` → install `app-debug.apk` on the phone
(allow “install unknown apps” once). Sign in — push permission is
requested automatically, and taps deep-link into chats.

## What works in the APK vs the web app

- Same app, same account, same everything — plus system-level FCM push
  (calls ring, messages/reminders buzz) even with the app closed.
- Offline: the shell plus browsed Qur'an/Hadith/Duas and recent chats
  stay readable; typed messages queue and send automatically on
  reconnect (attachments and voice notes need a connection).
- Android back button walks back; on Home it minimizes instead of
  killing the app.

## iOS honesty

Apple requires macOS + a $99/year Developer account to install on real
iPhones — there is no free local path. iPhone users get the full
experience today as an installed PWA (Share → Add to Home Screen),
including Web Push on iOS 16.4+.
