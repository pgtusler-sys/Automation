import http from 'http';
import { URL } from 'url';
import { settings } from '../config/settings';

/**
 * Interactive OAuth setup for Dropbox API.
 */

async function main() {
  const { appKey, appSecret } = settings.dropbox;

  if (!appKey || !appSecret) {
    console.error('Error: Set DROPBOX_APP_KEY and DROPBOX_APP_SECRET in your .env file first.');
    process.exit(1);
  }

  const redirectUri = 'http://localhost:3001/auth/callback';

  const authUrl = new URL('https://www.dropbox.com/oauth2/authorize');
  authUrl.searchParams.set('client_id', appKey);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('token_access_type', 'offline');

  console.log('\n=== Dropbox OAuth Setup ===\n');
  console.log('1. Open this URL in your browser:\n');
  console.log(authUrl.toString());
  console.log('\n2. Approve the permissions.');
  console.log('3. You will be redirected back here.\n');

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '', 'http://localhost:3001');

    if (url.pathname === '/auth/callback') {
      const code = url.searchParams.get('code');
      if (!code) {
        res.writeHead(400);
        res.end('No authorization code received.');
        return;
      }

      try {
        const tokenResponse = await fetch('https://api.dropboxapi.com/oauth2/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            grant_type: 'authorization_code',
            client_id: appKey,
            client_secret: appSecret,
            redirect_uri: redirectUri,
          }),
        });

        const data = await tokenResponse.json();

        if (data.error) {
          console.error('Token exchange error:', data);
          res.writeHead(500);
          res.end('Token exchange failed.');
          return;
        }

        console.log('\n=== SUCCESS ===\n');
        console.log('Add this to your .env file:\n');
        console.log(`DROPBOX_REFRESH_TOKEN=${data.refresh_token}\n`);

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>Success!</h1><p>Check your terminal for the refresh token.</p>');

        setTimeout(() => {
          server.close();
          process.exit(0);
        }, 1000);
      } catch (err) {
        console.error('Error:', err);
        res.writeHead(500);
        res.end('Error exchanging token.');
      }
    }
  });

  server.listen(3001, () => {
    console.log('Waiting for OAuth callback on http://localhost:3001 ...\n');
  });
}

main().catch(console.error);
