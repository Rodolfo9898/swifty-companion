# 42 Intranet App Registration (Swifty Companion)

Use this after the code is ready. These steps create the OAuth2 app and give you the client ID/secret.

## 1) Create a new application
1. Log in to the 42 intranet.
2. Go to your **Profile** → **Settings** → **API** (or directly to the **Applications** section).
3. Click **Create a new application**.

## 2) Fill the form
- **Name**: `companion` (or any unique name)
- **Description**: `Swifty Companion (RN Expo)`
- **Application type**: choose **Confidential** (if available) or **Web**.
- **Website**: you can use `https://example.com` or your Git repo URL.
- **Redirect URI**: add the redirect(s) you will actually use:
  - Expo Go: `https://auth.expo.io/@YOUR_EXPO_USERNAME/swifty-companion`
  - Standalone/dev client: `swifty-companion://redirect`
  - Local web static callback: `https://localhost`
  - Deployed web: your deployed site origin, for example `https://your-domain.example`
- **Scopes**: select **public** data (the minimum needed to read profiles).
- **Public**: leave **unchecked** unless you want the app to be public.

Click **Submit**.

## 3) Copy credentials
After saving, you’ll see:
- **Client ID**
- **Client Secret**

Keep them private.

## 4) Add credentials to your project
1. In the project root, create a `.env` file:
   ```
   FT_CLIENT_ID=YOUR_42_APP_CLIENT_ID
   FT_CLIENT_SECRET=YOUR_42_APP_CLIENT_SECRET
   API_BASE_URL=https://api.intra.42.fr
   EXPO_PROXY_REDIRECT=https://auth.expo.io/@YOUR_EXPO_USERNAME/swifty-companion
   FT_WEB_REDIRECT_URI=https://localhost
   ```
2. Make sure `.env` is **not** committed (it’s already in `.gitignore`).

## 5) Run the app
```
npm run android
```

For local web with `https://localhost` as the registered redirect:

```
npm run build:web
sudo npm run serve:web:localhost
```

The local HTTPS server handles `/oauth/token`, `/api/*`, and `/leaderboard-api/*` as same-origin proxies. Without that proxy, browser login/profile/leaderboard requests fail unless the external services allow CORS from `https://localhost`.

If the API returns errors, double-check:
- The scopes include **public** data.
- The client ID/secret are correct.
- The login exists in 42.
