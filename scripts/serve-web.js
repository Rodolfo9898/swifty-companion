require('dotenv/config');

const fs = require('fs');
const http = require('http');
const path = require('path');

const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
const port = Number(process.env.PORT || 3000);
const apiBaseUrl = process.env.API_BASE_URL || 'https://api.intra.42.fr';
const leaderboardApiUrl = process.env.LEADERBOARD_API_URL || process.env.EXPO_PUBLIC_LEADERBOARD_API_URL || '';
const ftClientId = process.env.FT_CLIENT_ID || '';
const ftClientSecret = process.env.FT_CLIENT_AUTH || '';
const mobileOAuthStatePrefix = 'mobile-';
const mobileRedirectUri = 'swifty-companion://redirect';

function maskValue(value) {
  if (!value) return 'missing';
  if (value.length <= 10) return `${value.slice(0, 2)}...${value.slice(-2)}`;
  return `${value.slice(0, 10)}...${value.slice(-6)}`;
}

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
};

function sendText(res, status, text) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(text);
}

function handleMobileOAuthBridge(req, res) {
  const url = new URL(req.url || '/', 'https://app.local');
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const state = url.searchParams.get('state');
  if ((!code && !error) || !state?.startsWith(mobileOAuthStatePrefix)) {
    return false;
  }
  const appUrl = `${mobileRedirectUri}?${url.searchParams.toString()}`;
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Opening Swifty Companion</title>
    <meta http-equiv="refresh" content="0;url=${appUrl}">
    <script>window.location.replace(${JSON.stringify(appUrl)});</script>
  </head>
  <body style="font-family: sans-serif; background: #0f172a; color: white; display: grid; min-height: 100vh; place-items: center;">
    <main style="text-align: center;">
      <p>Opening Swifty Companion...</p>
      <p><a style="color: #38bdf8;" href="${appUrl}">Tap here if the app does not open.</a></p>
    </main>
  </body>
</html>`);
  return true;
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendText(res, 500, 'Unable to read file.');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream' });
    res.end(content);
  });
}

function resolveFile(urlPath) {
  const normalized = path.normalize(decodeURIComponent(urlPath.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  const requested = path.join(distDir, normalized === '/' ? 'index.html' : normalized);
  if (requested.startsWith(distDir) && fs.existsSync(requested) && fs.statSync(requested).isFile()) {
    return requested;
  }
  return path.join(distDir, 'index.html');
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 100_000) {
        reject(new Error('Request body is too large.'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

async function proxyTokenRequest(req, res) {
  if (!ftClientId || !ftClientSecret) {
    sendText(res, 500, 'Missing FT_CLIENT_ID or FT_CLIENT_AUTH.');
    return;
  }

  try {
    const body = await readRequestBody(req);
    const params = new URLSearchParams(body);
    const requestedClientId = params.get('client_id') || ftClientId;
    if (requestedClientId !== ftClientId) {
      res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        error: 'invalid_client',
        error_description: 'The web bundle client_id does not match FT_CLIENT_ID from the deployment environment.',
      }));
      return;
    }
    params.set('client_id', ftClientId);
    params.set('client_secret', ftClientSecret);
    console.info(`[42 OAuth] token proxy using client_id=${maskValue(ftClientId)} secret=${maskValue(ftClientSecret)}`);

    const tokenResponse = await fetch(`${apiBaseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    const content = await tokenResponse.text();
    res.writeHead(tokenResponse.status, {
      'Content-Type': tokenResponse.headers.get('content-type') || 'application/json; charset=utf-8',
      'x-42tools-client-id': maskValue(ftClientId),
    });
    res.end(content);
  } catch (error) {
    sendText(res, 500, error instanceof Error ? error.message : 'Token proxy failed.');
  }
}

async function proxyApiRequest(req, res) {
  try {
    const targetPath = req.url.slice('/api'.length) || '/';
    const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await readRequestBody(req);
    const headers = {};
    if (req.headers.authorization) {
      headers.authorization = req.headers.authorization;
    }
    if (req.headers['content-type']) {
      headers['content-type'] = req.headers['content-type'];
    }

    const apiResponse = await fetch(`${apiBaseUrl}${targetPath}`, {
      method: req.method,
      headers,
      body,
    });
    const content = await apiResponse.text();
    res.writeHead(apiResponse.status, {
      'Content-Type': apiResponse.headers.get('content-type') || 'application/json; charset=utf-8',
      'x-total': apiResponse.headers.get('x-total') || '',
      'x-total-count': apiResponse.headers.get('x-total-count') || '',
      'x-total-counts': apiResponse.headers.get('x-total-counts') || '',
    });
    res.end(content);
  } catch (error) {
    sendText(res, 500, error instanceof Error ? error.message : 'API proxy failed.');
  }
}

async function proxyLeaderboardRequest(req, res) {
  if (!leaderboardApiUrl) {
    sendText(res, 500, 'Missing LEADERBOARD_API_URL.');
    return;
  }

  try {
    const targetPath = req.url.slice('/leaderboard-api'.length) || '/';
    const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await readRequestBody(req);
    const headers = {};
    if (req.headers.authorization) {
      headers.authorization = req.headers.authorization;
    }
    if (req.headers['content-type']) {
      headers['content-type'] = req.headers['content-type'];
    }

    const apiResponse = await fetch(`${leaderboardApiUrl}${targetPath}`, {
      method: req.method,
      headers,
      body,
    });
    const content = await apiResponse.text();
    res.writeHead(apiResponse.status, {
      'Content-Type': apiResponse.headers.get('content-type') || 'application/json; charset=utf-8',
    });
    res.end(content);
  } catch (error) {
    sendText(res, 500, error instanceof Error ? error.message : 'Leaderboard proxy failed.');
  }
}

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    sendText(res, 200, 'ok');
    return;
  }
  if (handleMobileOAuthBridge(req, res)) {
    return;
  }
  if (req.url?.startsWith('/oauth/token')) {
    if (req.method !== 'POST') {
      sendText(res, 405, 'Method not allowed.');
      return;
    }
    void proxyTokenRequest(req, res);
    return;
  }
  if (req.url?.startsWith('/api/')) {
    void proxyApiRequest(req, res);
    return;
  }
  if (req.url?.startsWith('/leaderboard-api/')) {
    void proxyLeaderboardRequest(req, res);
    return;
  }
  sendFile(res, resolveFile(req.url || '/'));
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Serving web app on port ${port}`);
});
