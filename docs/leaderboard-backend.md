# Leaderboard Backend

This app now supports a real leaderboard using a local backend service that syncs 42 API data into SQLite.

## Setup

1. Add env vars (see `.env.example`):
   - `FT_CLIENT_ID`, `FT_CLIENT_SECRET`
- `LEADERBOARD_API_URL` (default `http://localhost:4242`)
- `LEADERBOARD_PORT` (default `4242`)
- `LEADERBOARD_DB_PATH`
- `LEADERBOARD_SYNC_INTERVAL_MINUTES`
- Optional: `LEADERBOARD_CAMPUS_IDS` (comma-separated list of campus IDs to limit sync)
- Optional: `LEADERBOARD_SYNC_TOKEN` (for `POST /sync`)
- Optional: `FT_CURSUS_ID` (default `21`)
- Optional: `LEADERBOARD_SYNC_COALITIONS=1`
- Optional: `LEADERBOARD_SYNC_LOGTIME=1`

2. Install and run the backend:
```sh
make leaderboard
```

3. Run a one-off sync:
```sh
make leaderboard-sync
```

4. Export app snapshot for offline/local leaderboard mode:
```sh
make leaderboard-export-snapshot
```

## API Endpoints

- `GET /campuses`
- `GET /leaderboard?campusId=1&promo=09/2022&search=foo&sort=desc&sortField=level&page=1&perPage=20&meLogin=rperez-t`
- `GET /leaderboard/top?campusId=1&promo=09/2022&limit=10`
- `GET /promos?campusId=1`
- `POST /sync` (optional, requires `x-sync-token` header if configured)

## Notes

- The mobile app uses `LEADERBOARD_API_URL` to switch from direct 42 API calls to the backend.
- For large campuses, the first sync may take time due to rate limits.
