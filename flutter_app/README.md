# LiteMoov Mobile (Flutter)

TikTok-style mobile app for browsing and creating UGC ads. Uses the same LiteMoov backend as the website.

## Features

- **Vertical video feed** — swipe through your generated ads fullscreen
- **Floating create dock** — describe an ad and generate UGC video from the bottom bar
- **Auth** — sign in / sign up with your existing LiteMoov account (Bearer token)
- **Onboarding** — same 4-step workspace onboarding as the web app

## Setup

1. Install [Flutter](https://docs.flutter.dev/get-started/install) (SDK 3.0+)
2. From this folder:

```bash
cd flutter_app
flutter pub get
```

3. Copy `env.example` to `.env` and adjust for local dev (optional):

```bash
cp env.example .env
```

```env
# Local dev (phone on same Wi‑Fi; run web with: npm run dev -- -H 0.0.0.0)
API_ENV=development
API_BASE_URL=http://YOUR_PC_IP:3000/api

# Force production API while debugging:
# API_ENV=production
```

**Production API** (used automatically on release builds and when `.env` is absent):

```
https://www.litemoov.com/api
```

## Run

```bash
flutter run
```

## App flow

```
Splash → Login/Signup → Onboarding (if new) → Feed
                              ↑
                    Floating prompt → POST /api/generate → poll status → refresh feed
```

## API endpoints used

| Endpoint | Purpose |
|----------|---------|
| `POST /api/auth/login` | Sign in, store session token |
| `POST /api/auth/signup` | Create account |
| `GET /api/auth/me` | Restore session |
| `GET/POST /api/onboarding` | Onboarding wizard |
| `GET /api/generations` | Video feed (paginated) |
| `POST /api/generate` | Create UGC video |
| `GET /api/generate/:jobId/status` | Poll until complete |

## Project structure

```
lib/
  core/          theme, router
  models/        generation, onboarding, user
  providers/     auth, onboarding, generation state
  screens/       feed, auth, onboarding
  services/      api_service.dart
  widgets/       video_feed_item, floating_create_dock
```
