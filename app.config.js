import 'dotenv/config';

export default ({ config }) => ({
  ...config,
  extra: {
    apiBaseUrl: process.env.API_BASE_URL || 'https://api.intra.42.fr',
    clientId: process.env.FT_CLIENT_ID,
    clientSecret: process.env.FT_CLIENT_SECRET,
    proxyRedirectUri: process.env.EXPO_PROXY_REDIRECT,
    webClientId: process.env.FT_WEB_CLIENT_ID,
    webClientSecret: process.env.FT_WEB_CLIENT_SECRET,
    webRedirectUri: process.env.FT_WEB_REDIRECT_URI,
    leaderboardApiUrl: process.env.LEADERBOARD_API_URL || process.env.EXPO_PUBLIC_LEADERBOARD_API_URL,
  },
});
