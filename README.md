# Swifty Companion App

This repo now contains only the mobile app.

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

## Local Run

```sh
npm install
make run-android
# or
make run-ios
```

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
