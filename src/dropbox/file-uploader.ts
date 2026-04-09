import fs from 'fs';
import path from 'path';
import { dropboxUpload, dropboxCreateFolder } from './client';
import { logger } from '../shared/logger';

export async function uploadToDropbox(
  localFilePath: string,
  dropboxPath: string
): Promise<void> {
  logger.info(`Uploading to Dropbox: ${dropboxPath}`);

  // Ensure parent folder exists
  const parentFolder = path.dirname(dropboxPath);
  try {
    await dropboxCreateFolder(parentFolder);
  } catch (err) {
    logger.debug(`Parent folder creation (may already exist): ${parentFolder}`);
  }

  const fileBuffer = fs.readFileSync(localFilePath);
  await dropboxUpload(fileBuffer, dropboxPath);

  logger.info(`Successfully uploaded to Dropbox: ${dropboxPath}`);
}
