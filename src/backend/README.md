# Backend

The backend is organized by responsibility.

## Folders

- `core/`: shared infrastructure
- `auth/`: auth state and user OAuth flow
- `ft/`: 42 API access and app-token flow
- `leaderboard/`: leaderboard reads and sync command

## Layout

- `core/config.ts`: environment and Expo config
- `core/http.ts`: shared API client with retry/auth handling
- `core/repo.ts`: CRUD/read repository contracts
- `core/refresh.ts`: refresh scheduling
- `auth/store.ts`: persisted auth-state CRUD store
- `auth/user.ts`: user OAuth flow and session refresh
- `ft/token.ts`: client-credentials token flow
- `ft/repo.ts`: authenticated 42 API reads
- `ft/public.ts`: public 42 API reads using app credentials
- `leaderboard/repo.ts`: leaderboard reads and sync command

## Design

- SOLID: config, HTTP, persistence, auth flow, and resource access are separated.
- CRUD: only local persisted state uses full CRUD.
- Read-only APIs stay read-only, and sync remains an explicit command.
