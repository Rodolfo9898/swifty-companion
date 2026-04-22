# External Leaderboard Backend

This app expects a separate leaderboard backend service (different repo).

## App-side configuration

Set:

- `LEADERBOARD_API_URL=https://<your-service>.up.railway.app`

Then rebuild the app.

## Required backend endpoints

- `GET /health`
- `GET /campuses`
- `GET /leaderboard`
- `GET /leaderboard/top`
- `GET /promos`
- `GET /status`
- `POST /sync`

## Sync behavior

From Bonus Settings, the app can trigger:

- full sync: `POST /sync`
- campus-scoped sync: `POST /sync?campusIds=22,46,...`

If your backend enforces auth for `POST /sync`, configure that policy in the backend repo and adapt client auth headers there.
