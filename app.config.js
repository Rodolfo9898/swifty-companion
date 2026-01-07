import 'dotenv/config';

export default ({ config }) => ({
  ...config,
  extra: {
    apiBaseUrl: process.env.API_BASE_URL || 'https://api.intra.42.fr',
    clientId: process.env.FT_CLIENT_ID,
    clientSecret: process.env.FT_CLIENT_SECRET,
  },
});
