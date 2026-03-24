import { triggerAriveTask } from './browser-agent';
import { logger } from '../shared/logger';

export async function uploadToArive(
  filePath: string,
  loanNumber: string,
  documentType: string,
  fileName: string
): Promise<boolean> {
  logger.info(`Uploading ${fileName} to ARIVE loan ${loanNumber}`);

  const result = await triggerAriveTask({
    type: 'upload_document',
    payload: {
      filePath,
      loanNumber,
      documentType,
      fileName,
    },
  });

  if (!result.success) {
    logger.error(`ARIVE upload failed for ${fileName}: ${result.error}`);
    return false;
  }

  logger.info(`Successfully uploaded ${fileName} to ARIVE loan ${loanNumber}`);
  return true;
}
