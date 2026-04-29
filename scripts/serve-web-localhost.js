require('dotenv/config');

const { execFileSync } = require('child_process');
const fs = require('fs');
const https = require('https');
const path = require('path');

const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
const certDir = path.join(root, '.expo', 'localhost-certs');
const keyPath = path.join(certDir, 'localhost-key.pem');
const certPath = path.join(certDir, 'localhost-cert.pem');
const port = 443;
const apiBaseUrl = process.env.API_BASE_URL || 'https://api.intra.42.fr';
const leaderboardApiUrl = process.env.LEADERBOARD_API_URL || process.env.EXPO_PUBLIC_LEADERBOARD_API_URL || '';
const ftClientId = process.env.FT_CLIENT_ID || '';
const ftClientSecret = process.env.FT_CLIENT_SECRET || '';

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

function ensureCertificate() {
  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    return;
  }
  fs.mkdirSync(certDir, { recursive: true });
  execFileSync('openssl', [
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-sha256',
    '-days',
    '365',
    '-subj',
    '/CN=localhost',
    '-addext',
    'subjectAltName=DNS:localhost,IP:127.0.0.1',
    '-keyout',
    keyPath,
    '-out',
    certPath,
  ], { stdio: 'inherit' });
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Unable to read file.');
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
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Missing FT_CLIENT_ID or FT_CLIENT_SECRET.');
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
        error_description: 'The web bundle client_id does not match FT_CLIENT_ID from the local .env file.',
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
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(error instanceof Error ? error.message : 'Token proxy failed.');
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
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(error instanceof Error ? error.message : 'API proxy failed.');
  }
}

async function proxyLeaderboardRequest(req, res) {
  if (!leaderboardApiUrl) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Missing LEADERBOARD_API_URL.');
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
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(error instanceof Error ? error.message : 'Leaderboard proxy failed.');
  }
}

ensureCertificate();

const server = https.createServer({
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath),
}, (req, res) => {
  if (req.url?.startsWith('/oauth/token')) {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Method not allowed.');
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

server.listen(port, 'localhost', () => {
  console.log(`Serving web app at https://localhost`);
  console.log('If the browser warns about the certificate, accept the local development certificate.');
});

server.on('error', (error) => {
  if (error.code === 'EACCES') {
    console.error('Port 443 needs administrator privileges.');
    console.error('Run: sudo npm run launch:web:localhost');
    process.exit(1);
  }
  throw error;
});
