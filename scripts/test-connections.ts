import { settings } from '../config/settings';

/**
 * Test all API connections to verify credentials are working.
 */

async function testMicrosoftGraph(): Promise<boolean> {
  console.log('\n--- Microsoft Graph API ---');
  try {
    const { refreshMicrosoftToken } = await import('../config/credentials');
    const token = await refreshMicrosoftToken();
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${token.accessToken}` },
    });
    const data = await response.json();
    console.log(`  User: ${data.displayName} (${data.mail})`);
    console.log('  Status: CONNECTED');
    return true;
  } catch (err) {
    console.error(`  Status: FAILED - ${err instanceof Error ? err.message : err}`);
    return false;
  }
}

async function testDropbox(): Promise<boolean> {
  console.log('\n--- Dropbox API ---');
  try {
    const { refreshDropboxToken } = await import('../config/credentials');
    const token = await refreshDropboxToken();
    const response = await fetch(
      'https://api.dropboxapi.com/2/users/get_current_account',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token.accessToken}` },
      }
    );
    const data = await response.json();
    console.log(`  Account: ${data.name?.display_name} (${data.email})`);
    console.log('  Status: CONNECTED');
    return true;
  } catch (err) {
    console.error(`  Status: FAILED - ${err instanceof Error ? err.message : err}`);
    return false;
  }
}

async function testGoogleSheets(): Promise<boolean> {
  console.log('\n--- Google Sheets API ---');
  try {
    const { google } = await import('googleapis');
    const auth = new google.auth.GoogleAuth({
      keyFile: settings.google.serviceAccountKeyPath,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    const sheets = google.sheets({ version: 'v4', auth });
    const res = await sheets.spreadsheets.get({
      spreadsheetId: settings.google.pipelineSheetId,
    });
    console.log(`  Sheet: ${res.data.properties?.title}`);
    console.log('  Status: CONNECTED');
    return true;
  } catch (err) {
    console.error(`  Status: FAILED - ${err instanceof Error ? err.message : err}`);
    return false;
  }
}

async function testClaudeApi(): Promise<boolean> {
  console.log('\n--- Claude API ---');
  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: settings.anthropic.apiKey });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Say "ok"' }],
    });
    const text = response.content.find((b) => b.type === 'text');
    console.log(`  Response: ${text?.text}`);
    console.log('  Status: CONNECTED');
    return true;
  } catch (err) {
    console.error(`  Status: FAILED - ${err instanceof Error ? err.message : err}`);
    return false;
  }
}

async function main() {
  console.log('=== Connection Test Suite ===');

  const results = await Promise.all([
    testMicrosoftGraph(),
    testDropbox(),
    testGoogleSheets(),
    testClaudeApi(),
  ]);

  const passed = results.filter(Boolean).length;
  console.log(`\n=== Results: ${passed}/${results.length} connections successful ===\n`);

  if (passed < results.length) {
    console.log('Fix the failed connections above, then re-run this script.');
    process.exit(1);
  }
}

main().catch(console.error);
