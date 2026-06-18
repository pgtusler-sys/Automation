import http from 'http';
import { URL } from 'url';
import { settings } from '../config/settings';

/**
 * Interactive OAuth setup for Microsoft Graph API.
 *
 * 1. Opens a local HTTP server on port 3000
 * 2. Prints an authorization URL for the user to visit
 * 3. Exchanges the auth code for access + refresh tokens
 * 4. Prints the refresh token to store in .env
 */

const SCOPES = [
  'offline_access',
  'Mail.ReadWrite',
  'Mail.Send',
  'Mail.ReadWrite.Shared',
  'MailboxSettings.Read',
  'User.Read',
].join(' ');

async function main() {
  const { clientId, clientSecret, tenantId, redirectUri } = settings.outlook;

  if (!clientId || !tenantId) {
    console.error('Error: Set AZURE_CLIENT_ID and AZURE_TENANT_ID in your .env file first.');
    process.exit(1);
  }

  const authUrl = new URL(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`
  );
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', SCOPES);
  authUrl.searchParams.set('response_mode', 'query');

  console.log('\n=== Microsoft Graph OAuth Setup ===\n');
  console.log('1. Open this URL in your browser:\n');
  console.log(authUrl.toString());
  console.log('\n2. Sign in and approve the permissions.');
  console.log('3. You will be redirected back here.\n');

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '', `http://localhost:3000`);

    if (url.pathname === '/auth/callback') {
      const code = url.searchParams.get('code');

      if (!code) {
        res.writeHead(400);
        res.end('Error: No authorization code received.');
        return;
      }

      try {
        const tokenResponse = await fetch(
          `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: clientId,
              client_secret: clientSecret,
              code,
              redirect_uri: redirectUri,
              grant_type: 'authorization_code',
              scope: SCOPES,
            }),
          }
        );

        const data = await tokenResponse.json();

        if (data.error) {
          console.error('Token exchange error:', data);
          res.writeHead(500);
          res.end('Token exchange failed. Check console.');
          return;
        }

        console.log('\n=== SUCCESS ===\n');
        console.log('Add this to your .env file:\n');
        console.log(`MS_GRAPH_REFRESH_TOKEN=${data.refresh_token}\n`);

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>Success!</h1><p>You can close this tab. Check your terminal for the refresh token.</p>');

        setTimeout(() => {
          server.close();
          process.exit(0);
        }, 1000);
      } catch (err) {
        console.error('Error exchanging token:', err);
        res.writeHead(500);
        res.end('Error exchanging token. Check console.');
      }
    }
  });

  server.listen(3000, () => {
    console.log('Waiting for OAuth callback on http://localhost:3000 ...\n');
  });
}

main().catch(console.error);
