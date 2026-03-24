import { google, sheets_v4 } from 'googleapis';
import { settings } from '../../config/settings';
import { logger } from '../shared/logger';

let sheetsClient: sheets_v4.Sheets | null = null;

async function getSheetsClient(): Promise<sheets_v4.Sheets> {
  if (sheetsClient) return sheetsClient;

  const auth = new google.auth.GoogleAuth({
    keyFile: settings.google.serviceAccountKeyPath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

export async function readSheetRange(range: string): Promise<any[][]> {
  const client = await getSheetsClient();
  const response = await client.spreadsheets.values.get({
    spreadsheetId: settings.google.pipelineSheetId,
    range,
  });

  return response.data.values || [];
}

export async function writeSheetRange(
  range: string,
  values: any[][]
): Promise<void> {
  const client = await getSheetsClient();
  await client.spreadsheets.values.update({
    spreadsheetId: settings.google.pipelineSheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });

  logger.info(`Updated sheet range ${range} (${values.length} rows)`);
}

export async function appendToSheet(
  range: string,
  values: any[][]
): Promise<void> {
  const client = await getSheetsClient();
  await client.spreadsheets.values.append({
    spreadsheetId: settings.google.pipelineSheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });

  logger.info(`Appended ${values.length} rows to sheet range ${range}`);
}
