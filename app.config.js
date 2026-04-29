import 'dotenv/config';

export default ({ config }) => ({
  ...config,
  extra: {
    apiBaseUrl: process.env.API_BASE_URL || 'https://api.intra.42.fr',
    clientId: process.env.FT_CLIENT_ID,
    clientSecret: process.env.EXPO_NO_CLIENT_SECRET === '1' ? undefined : process.env.FT_CLIENT_AUTH,
    proxyRedirectUri: process.env.EXPO_PROXY_REDIRECT,
    webRedirectUri: process.env.EXPO_WEB_RUNTIME_ORIGIN === '1' ? undefined : process.env.FT_WEB_REDIRECT_URI,
    leaderboardApiUrl: process.env.LEADERBOARD_API_URL || process.env.EXPO_PUBLIC_LEADERBOARD_API_URL,
  },
});
