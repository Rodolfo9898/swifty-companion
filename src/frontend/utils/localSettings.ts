import * as SecureStore from 'expo-secure-store';

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
  let ftClientSecret = '';
  try {
    ftClientSecret = (await SecureStore.getItemAsync(FT_CLIENT_SECRET_KEY)) || '';
  } catch {
    ftClientSecret = '';
  }
  return {
    ftClientSecret,
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
    await SecureStore.setItemAsync(FT_CLIENT_SECRET_KEY, trimmedSecret);
  } else {
    await SecureStore.deleteItemAsync(FT_CLIENT_SECRET_KEY);
  }
  const updatedAt = Date.now();
  await writeLocalSettingsCache({
    leaderboardSyncIntervalMinutes: Math.round(input.leaderboardSyncIntervalMinutes),
    updatedAt,
  });
  return updatedAt;
}
