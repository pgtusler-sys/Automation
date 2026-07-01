import { readSheetRange, writeSheetRange, appendToSheet } from './client';
import { LoanFile, PipelineRow } from '../shared/types';
import { loadState, saveState } from '../shared/utils';
import { logger } from '../shared/logger';

const PIPELINE_RANGE = 'Pipeline!A:E';
const HEADERS = ['Borrower Name', 'Loan Number', 'Status', 'Property Address', 'Last Updated'];

function loanFileToRow(lf: LoanFile): string[] {
  return [lf.borrowerName, lf.loanNumber, lf.status, lf.propertyAddress, lf.lastUpdated];
}

export async function syncPipeline(loanFiles: LoanFile[]): Promise<void> {
  logger.info(`Syncing pipeline with ${loanFiles.length} loan files`);

  const existingRows = await readSheetRange(PIPELINE_RANGE);

  // Build a map of existing rows by loan number (skip header row)
  const existingMap = new Map<string, { rowIndex: number; data: string[] }>();
  for (let i = 1; i < existingRows.length; i++) {
    const row = existingRows[i];
    if (row && row[1]) {
      existingMap.set(row[1], { rowIndex: i, data: row });
    }
  }

  const updatedRows: Array<{ rowIndex: number; data: string[] }> = [];
  const newRows: string[][] = [];

  for (const lf of loanFiles) {
    const existing = existingMap.get(lf.loanNumber);
    if (existing) {
      // Check if status changed
      if (existing.data[2] !== lf.status) {
        updatedRows.push({
          rowIndex: existing.rowIndex,
          data: loanFileToRow(lf),
        });
      }
      existingMap.delete(lf.loanNumber); // mark as processed
    } else {
      newRows.push(loanFileToRow(lf));
    }
  }

  // Update changed rows
  for (const update of updatedRows) {
    const rowNum = update.rowIndex + 1; // 1-indexed
    await writeSheetRange(`Pipeline!A${rowNum}:E${rowNum}`, [update.data]);
  }

  // Append new rows
  if (newRows.length > 0) {
    await appendToSheet(PIPELINE_RANGE, newRows);
  }

  const state = loadState();
  saveState({ ...state, lastPipelineSyncTimestamp: new Date().toISOString() });

  logger.info(
    `Pipeline sync complete: ${updatedRows.length} updated, ${newRows.length} new, ${existingMap.size} unchanged`
  );
}
