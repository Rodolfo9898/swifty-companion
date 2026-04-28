# Swifty Companion App

This repo now contains only the mobile app.
It can also run as an Expo web app.

Leaderboard backend logic was moved to a separate repository/service.  
This app only consumes that external API via `LEADERBOARD_API_URL`.

## Environment

Create `.env` from `.env.example` and set:

- `FT_CLIENT_ID`
- `FT_CLIENT_SECRET`
- `LEADERBOARD_API_URL` (external leaderboard service URL)

Optional:

- `API_BASE_URL` (defaults to `https://api.intra.42.fr`)
- `EXPO_PROXY_REDIRECT`
- `FT_WEB_CLIENT_ID` / `FT_WEB_CLIENT_SECRET` (use these if your 42 web OAuth app is separate from mobile)
- `FT_WEB_REDIRECT_URI` (defaults to the current web origin, for example `https://localhost`)

## Local Run

```sh
npm install
make run-android
# or
make run-ios
# or
npm run launch:web
```

If your 42 redirect URI is exactly `https://localhost`, use:

```sh
npm run build:web
sudo npm run serve:web:localhost
```

The local web server also proxies `/oauth/token`, `/api/*`, and `/leaderboard-api/*`, which is required because browsers cannot call those external services directly unless the services enable CORS for your web origin.

## Android Release Install

```sh
make android-release-install
```

## External Leaderboard Service

Your external service should expose at least:

- `GET /health`
- `GET /campuses`
- `GET /leaderboard`
- `GET /leaderboard/top`
- `GET /promos`
- `GET /status`
- `POST /sync`

The app can trigger refresh from Bonus Settings.  
If your backend requires sync auth headers/tokens, configure the backend policy accordingly.
