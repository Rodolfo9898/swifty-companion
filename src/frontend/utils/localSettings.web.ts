import { readLocalSettingsCache, writeLocalSettingsCache } from './appCache';

const FT_CLIENT_SECRET_KEY = 'ft_client_secret_override';

export type LocalRuntimeSettings = {
  ftClientSecret: string;
  leaderboardSyncIntervalMinutes: number;
  updatedAt: number | null;
};

type LocalSettingsCache = {
  leaderboardSyncIntervalMinutes?: number;
  updatedAt?: number;
};

export async function readLocalRuntimeSettings(): Promise<LocalRuntimeSettings> {
  const cache = await readLocalSettingsCache<LocalSettingsCache>();
  return {
    ftClientSecret: globalThis.localStorage?.getItem(FT_CLIENT_SECRET_KEY) || '',
    leaderboardSyncIntervalMinutes: Number(cache.leaderboardSyncIntervalMinutes || 10080),
    updatedAt: typeof cache.updatedAt === 'number' ? cache.updatedAt : null,
  };
}

export async function saveLocalRuntimeSettings(input: {
  ftClientSecret: string;
  leaderboardSyncIntervalMinutes: number;
}) {
  const trimmedSecret = input.ftClientSecret.trim();
  if (trimmedSecret) {
    globalThis.localStorage?.setItem(FT_CLIENT_SECRET_KEY, trimmedSecret);
  } else {
    globalThis.localStorage?.removeItem(FT_CLIENT_SECRET_KEY);
  }
  const updatedAt = Date.now();
  await writeLocalSettingsCache({
    leaderboardSyncIntervalMinutes: Math.round(input.leaderboardSyncIntervalMinutes),
    updatedAt,
  });
  return updatedAt;
}
