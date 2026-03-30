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
- In cloud platforms (Railway), runtime `PORT` is supported automatically.

## Railway Deployment (Public Access)

1. Create a Railway service from this repo and set **Root Directory** to:
   - `leaderboard-server`
2. Keep build/start from `railway.toml` (or equivalent):
   - build: Nixpacks
   - start: `npm run start`
3. Add a **persistent volume** and set:
   - `LEADERBOARD_DB_PATH=/data/leaderboard.db`
4. Set required env vars in Railway:
   - `FT_CLIENT_ID`
   - `FT_CLIENT_SECRET`
   - `API_BASE_URL=https://api.intra.42.fr`
   - `LEADERBOARD_SYNC_INTERVAL_MINUTES` (e.g. `10080`)
5. Optional but recommended:
   - `LEADERBOARD_SYNC_TOKEN` (protects `POST /sync`)
   - `LEADERBOARD_CAMPUS_IDS` (limit sync scope)
6. Point mobile app env to Railway URL:
   - `LEADERBOARD_API_URL=https://<your-service>.up.railway.app`
7. Rebuild the mobile app after env changes.
