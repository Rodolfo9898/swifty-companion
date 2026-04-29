import Constants from 'expo-constants';

type ExtraConfig = {
  apiBaseUrl?: string;
  clientId?: string;
  clientSecret?: string;
  proxyRedirectUri?: string;
  webRedirectUri?: string;
  leaderboardApiUrl?: string;
};

function readExpoExtra(): ExtraConfig {
  return (
    (Constants.expoConfig?.extra as ExtraConfig | undefined) ??
    ((Constants as { manifest?: { extra?: ExtraConfig } }).manifest?.extra ?? {}) ??
    ((Constants as { manifest2?: { extra?: ExtraConfig } }).manifest2?.extra ?? {})
  );
}

export interface AppConfig {
  apiBaseUrl: string;
  clientId: string;
  clientSecret: string;
  proxyRedirectUri: string;
  webRedirectUri: string;
  leaderboardApiUrl: string;
}

export function getConfig(): AppConfig {
  const extra = readExpoExtra();
  const envLeaderboardUrl =
    (typeof process !== 'undefined' &&
      (process.env?.EXPO_PUBLIC_LEADERBOARD_API_URL || process.env?.LEADERBOARD_API_URL)) ||
    '';

  return {
    apiBaseUrl: extra.apiBaseUrl || 'https://api.intra.42.fr',
    clientId: extra.clientId || '',
    clientSecret: extra.clientSecret || '',
    proxyRedirectUri: extra.proxyRedirectUri || '',
    webRedirectUri: extra.webRedirectUri || '',
    leaderboardApiUrl: String(extra.leaderboardApiUrl || envLeaderboardUrl || ''),
  };
}
