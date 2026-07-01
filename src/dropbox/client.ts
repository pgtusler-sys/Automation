import { refreshDropboxToken, TokenSet } from '../../config/credentials';
import { logger } from '../shared/logger';

let cachedToken: TokenSet | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.accessToken;
  }
  logger.info('Refreshing Dropbox access token');
  cachedToken = await refreshDropboxToken();
  return cachedToken.accessToken;
}

export async function dropboxUpload(
  fileBuffer: Buffer,
  dropboxPath: string
): Promise<any> {
  const token = await getAccessToken();

  const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/octet-stream',
      'Dropbox-API-Arg': JSON.stringify({
        path: dropboxPath,
        mode: 'add',
        autorename: true,
        mute: false,
      }),
    },
    body: fileBuffer,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Dropbox upload failed: ${response.status} ${body}`);
  }

  return response.json();
}

export async function dropboxCreateFolder(folderPath: string): Promise<void> {
  const token = await getAccessToken();

  const response = await fetch(
    'https://api.dropboxapi.com/2/files/create_folder_v2',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path: folderPath, autorename: false }),
    }
  );

  // 409 means folder already exists, which is fine
  if (!response.ok && response.status !== 409) {
    const body = await response.text();
    throw new Error(`Dropbox create folder failed: ${response.status} ${body}`);
  }
}
