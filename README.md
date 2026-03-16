# Offline Leaderboard Mode (Mobile-First)

This document explains what would need to change to make the leaderboard fully portable on phone (no laptop server), and what to add if you also want optional in-app sync.

## Goal

Current setup:
- `make leaderboard` runs a local Node API + SQLite DB on your computer.
- Mobile app reads leaderboard data from that API.

Target setup:
- App ships with a local snapshot of leaderboard data.
- App reads leaderboard directly from on-device storage/database.
- App works on 5G/Wi-Fi anywhere, even if your computer is off.

## What Must Change (Offline Snapshot Only)

### 1. Data source inside app
Replace remote leaderboard API usage in the app with a local data layer:
- Preferred: SQLite on device (Expo SQLite or RN SQLite lib)
- Alternative: JSON snapshot files bundled with the app (simpler, slower for large datasets)

Why SQLite is better:
- Fast paging/sorting/filtering
- Smaller memory footprint than loading huge JSON in JS
- Closer to current backend query model

### 2. Snapshot export pipeline (build-time)
Add an export step on your computer that converts your backend DB into a mobile snapshot:
- Export tables needed by app (`users`, `campuses`, ranking cache/top10 if needed)
- Normalize fields the app uses in screens
- Version the snapshot (`snapshot_version`, `generated_at`)

Example flow:
1. Run sync on computer (as you do now)
2. Export mobile snapshot
3. Copy snapshot into app assets/data
4. Build app

### 3. On-first-launch DB seed
On first app launch (or app update), copy bundled snapshot into writable app storage:
- If using SQLite: copy prebuilt DB into app documents dir
- If using JSON: copy to cache/documents and index in memory/local storage

### 4. Leaderboard query layer in app
Implement app-side query methods equivalent to backend endpoints:
- `getCampuses()`
- `getLeaderboard({ campusId, promo, sortBy, order, page, perPage, search })`
- `getTop10({ campusId })`
- `getStatus()` (now local metadata)

### 5. Feature parity checks
Ensure these still work from local data:
- Campus filter
- Promo filter (ordered by date logic)
- Sort/order
- Pagination
- Top 10 global/campus
- “Jump to me”
- Excluded logins (e.g. test accounts)

### 6. Update UX messaging
Because data is static offline:
- Show `Last updated: DD/MM/YYYY HH:mm:ss`
- Add badge: `Offline snapshot`
- Add `Data version` in settings/dev panel

## Optional: In-App Sync (Still No Laptop Required)

You can keep offline-first behavior and add manual/automatic refresh from phone.

## Sync Architecture Choices

### A) Sync from a tiny hosted backend (recommended)
Phone calls your hosted API endpoint that serves snapshot diffs or full snapshot.

Pros:
- Keeps 42 secrets off device
- Reliable and secure
- Smaller app complexity

Cons:
- Requires hosting

### B) Direct sync from 42 API on phone (not recommended for production)
Phone fetches 42 API directly and rebuilds local leaderboard.

Pros:
- No server hosting needed

Cons:
- You cannot safely store `FT_CLIENT_SECRET` in app
- Rate limits and long sync time on mobile
- Harder retries/resume/background constraints

If done at all, use a backend token broker at minimum.

## In-App Sync Requirements

### 1. Sync metadata table
Store local sync info:
- `last_sync_at`
- `snapshot_version`
- `sync_state` (`idle`, `running`, `failed`)
- `last_error`

### 2. Sync strategy
- Manual button: `Sync now`
- Optional auto-sync on app open if stale (e.g. >24h)
- Optional Wi-Fi-only sync toggle

### 3. Safe update process
Use transactional replacement:
1. Download to temp DB/file
2. Validate schema + checksum/version
3. Swap atomically
4. Rebuild local ranking indexes/cache

### 4. Incremental updates (advanced)
After stable full-sync flow, add diffs:
- Upsert changed users
- Remove deleted/invalid entries
- Recompute affected ranking subsets

### 5. Background behavior
Platform limits apply:
- iOS background execution is constrained
- Android background tasks depend on OS/battery rules

Practical UX: foreground sync with visible progress and cancel button.

## Security Considerations

- Do **not** embed `FT_CLIENT_SECRET` in mobile app.
- If using hosted sync, app should call your backend only.
- Sign snapshots or include checksums to detect corruption/tampering.

## Performance Considerations

- Keep indexed columns for common filters: `campusId`, `promo`, `level`, `login`
- Precompute top10 tables per campus/global to speed screen load
- Use page size limits and lazy rendering in list UI

## Suggested Migration Plan

1. Add mobile local data schema and query adapter (read-only).
2. Export backend DB to mobile snapshot format.
3. Seed snapshot into app and switch leaderboard screens to local adapter.
4. Validate feature parity (filters, paging, top10, jump-to-me).
5. Add manual sync (from hosted backend) with safe temp swap.
6. Add optional auto-sync policy and stale-data UX.

## Acceptance Criteria

Offline mode is viable when:
- App starts and leaderboard works without any external server running on laptop.
- All leaderboard features work from local data.
- Snapshot metadata is visible.
- Sync (if enabled) updates data safely without breaking UI state.
