import { google } from 'googleapis';
import { settings } from '../config/settings';
import fs from 'fs';

/**
 * Verify Google Sheets service account setup.
 *
 * Prerequisites:
 * 1. Create a Google Cloud project and enable Sheets API
 * 2. Create a service account and download the JSON key
 * 3. Set GOOGLE_SERVICE_ACCOUNT_KEY_PATH in .env
 * 4. Share the Pipeline spreadsheet with the service account email (Editor)
 */

async function main() {
  console.log('\n=== Google Sheets Setup Verification ===\n');

  const keyPath = settings.google.serviceAccountKeyPath;
  if (!fs.existsSync(keyPath)) {
    console.error(`Error: Service account key not found at: ${keyPath}`);
    console.error('Download from Google Cloud Console > IAM > Service Accounts > Keys');
    process.exit(1);
  }

  const keyData = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
  console.log(`Service account email: ${keyData.client_email}`);
  console.log(`Project: ${keyData.project_id}\n`);

  const auth = new google.auth.GoogleAuth({
    keyFile: keyPath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  if (!settings.google.pipelineSheetId) {
    console.error('Error: Set GOOGLE_PIPELINE_SHEET_ID in .env');
    process.exit(1);
  }

  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId: settings.google.pipelineSheetId,
    });

    console.log(`Spreadsheet: ${response.data.properties?.title}`);
    console.log(`Sheets: ${response.data.sheets?.map((s) => s.properties?.title).join(', ')}`);
    console.log('\nGoogle Sheets connection verified successfully!');
  } catch (err) {
    console.error('Failed to access spreadsheet. Make sure you:');
    console.error('1. Shared the spreadsheet with:', keyData.client_email);
    console.error('2. The GOOGLE_PIPELINE_SHEET_ID is correct');
    console.error('Error:', err);
    process.exit(1);
  }
}

main().catch(console.error);
