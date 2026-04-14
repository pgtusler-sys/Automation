import { settings } from '../../config/settings';
import { searchAndScoreJobs } from './job-searcher';
import { generateMaterialsForHighScorers, generateMaterials } from './materials-generator';
import { generatePdfsForApplication } from './pdf-generator';
import { sendDigestEmail, buildDigestData } from './notifier';
import { syncTrackerFile, getTrackerSummary } from './tracker-sync';
import { getJobStore } from './job-store';
import { detectATS } from './ats-detector';
import { buildApplyInstructions, triggerJobApplyTask } from './browser-apply';
import { loadCandidateProfile } from './profile-loader';
import { logger } from '../shared/logger';
import path from 'path';

export async function runJobSearch(): Promise<void> {
  logger.info('=== Job Search: Starting ===');
  const result = await searchAndScoreJobs();
  logger.info(`=== Job Search Complete: ${result.new} new listings from ${result.total} results ===`);

  if (result.listings.length > 0) {
    console.log('\nNew listings:');
    for (const l of result.listings.slice(0, 20)) {
      const marker = l.totalScore >= 80 ? '***' : l.totalScore >= 75 ? '**' : '';
      console.log(`  ${marker}[${l.totalScore}] ${l.company} — ${l.title} (${l.location})${marker}`);
    }
  }
}

export async function runMaterialsGeneration(): Promise<void> {
  logger.info('=== Materials Generation: Starting ===');
  const results = await generateMaterialsForHighScorers();

  // Generate PDFs for each
  for (const r of results) {
    const companyDir = path.dirname(r.resumePath);
    await generatePdfsForApplication(companyDir);
  }

  logger.info(`=== Materials Generation Complete: ${results.length} applications ===`);
}

async function runAutoApply(): Promise<void> {
  if (!settings.jobs.autoApply.enabled) {
    logger.info('Auto-apply disabled — skipping');
    return;
  }

  const store = getJobStore();
  const profile = loadCandidateProfile();
  const dailyCount = store.getTodayAutoApplyCount();
  const maxPerDay = settings.jobs.autoApply.maxPerDay;

  if (dailyCount >= maxPerDay) {
    logger.info(`Auto-apply cap reached (${dailyCount}/${maxPerDay}) — skipping`);
    return;
  }

  logger.info('=== Auto-Apply: Starting ===');

  // Get applications with materials ready but not yet applied
  const apps = store.getApplicationsByStatus('applying');
  const listings = store.getAllListings();
  const listingMap = new Map(listings.map((l) => [l.id, l]));

  let applied = 0;
  for (const app of apps) {
    if (dailyCount + applied >= maxPerDay) break;

    const listing = listingMap.get(app.listingId);
    if (!listing || !listing.url || !app.resumePath) continue;

    const ats = detectATS(listing.url);
    const instructions = buildApplyInstructions(
      { company: listing.company, title: listing.title, url: listing.url, description: listing.description },
      profile,
      ats,
      { resumePath: app.resumePath, coverLetterPath: app.coverLetterPath || undefined }
    );

    try {
      const result = await triggerJobApplyTask(
        { id: listing.id, company: listing.company, title: listing.title },
        instructions
      );

      if (result.success) {
        store.markApplied(app.id, 'auto', result.screenshotPaths);
        logger.info(`Auto-applied: ${listing.company} — ${listing.title}`);
        applied++;
      } else {
        store.markNeedsManualApply(app.id, result.error || 'Auto-apply failed');
        logger.warn(`Auto-apply failed for ${listing.company}: ${result.error}`);
      }
    } catch (err) {
      store.markNeedsManualApply(app.id, `Error: ${err}`);
      logger.error(`Auto-apply error for ${listing.company}: ${err}`);
    }
  }

  logger.info(`=== Auto-Apply Complete: ${applied} submitted ===`);
}

export async function runNotification(): Promise<void> {
  logger.info('=== Notification: Starting ===');
  const data = buildDigestData();
  await sendDigestEmail(data);
  logger.info('=== Notification Complete ===');
}

export async function runTrackerSync(): Promise<void> {
  logger.info('=== Tracker Sync: Starting ===');
  syncTrackerFile();
  logger.info('=== Tracker Sync Complete ===');
}

export async function runJobStatus(): Promise<void> {
  const summary = getTrackerSummary();
  console.log(summary);

  const store = getJobStore();
  const recentRuns = store.getRecentSearchRuns(5);
  if (recentRuns.length > 0) {
    console.log('\nRecent search runs:');
    for (const run of recentRuns) {
      console.log(`  ${run.ranAt.split('T')[0]} — ${run.source}: ${run.newResults} new / ${run.totalResults} total`);
    }
  }
}

export async function generateApplyInstructions(): Promise<void> {
  const store = getJobStore();
  const profile = loadCandidateProfile();

  // Get applications ready to apply (both 'applying' and 'needs_manual_apply')
  const applying = store.getApplicationsByStatus('applying', 'needs_manual_apply');
  const listings = store.getAllListings();
  const listingMap = new Map(listings.map((l) => [l.id, l]));

  const ready = applying
    .map((app) => ({ app, listing: listingMap.get(app.listingId)! }))
    .filter(({ listing }) => listing && listing.url)
    .sort((a, b) => b.listing.totalScore - a.listing.totalScore);

  if (ready.length === 0) {
    console.log('No applications ready to apply. Run jobs:search and jobs:generate first.');
    return;
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`  APPLY INSTRUCTIONS — ${ready.length} applications ready`);
  console.log(`  Copy each block into Claude with computer use (claude.ai or Desktop)`);
  console.log(`${'='.repeat(70)}\n`);

  for (let i = 0; i < ready.length; i++) {
    const { app, listing } = ready[i];
    const ats = detectATS(listing.url);

    const resumePath = app.resumePath
      ? path.resolve(__dirname, '../../', app.resumePath)
      : 'N/A';
    const coverLetterPath = app.coverLetterPath
      ? path.resolve(__dirname, '../../', app.coverLetterPath)
      : undefined;

    const instructions = buildApplyInstructions(
      { company: listing.company, title: listing.title, url: listing.url, description: listing.description },
      profile,
      ats,
      { resumePath, coverLetterPath }
    );

    console.log(`${'─'.repeat(70)}`);
    console.log(`  [${i + 1}/${ready.length}] ${listing.company} — ${listing.title}`);
    console.log(`  Score: ${listing.totalScore} | ATS: ${ats.ats} | ${listing.location}`);
    console.log(`  URL: ${listing.url}`);
    console.log(`  Resume: ${resumePath}`);
    if (coverLetterPath) console.log(`  Cover Letter: ${coverLetterPath}`);
    console.log(`${'─'.repeat(70)}`);
    console.log('');
    console.log('--- COPY BELOW THIS LINE ---');
    console.log('');
    console.log(instructions);
    console.log('');
    console.log('--- COPY ABOVE THIS LINE ---');
    console.log('');
    console.log(`After applying, run: npx ts-node src/index.ts jobs:mark-applied ${listing.company.toLowerCase().replace(/\s+/g, '-')}`);
    console.log('');
  }

  console.log(`${'='.repeat(70)}`);
  console.log(`  Done. ${ready.length} instruction blocks generated.`);
  console.log(`${'='.repeat(70)}`);
}

export async function markApplied(companySlug: string): Promise<void> {
  const store = getJobStore();
  const apps = store.getAllApplications();
  const listings = store.getAllListings();
  const listingMap = new Map(listings.map((l) => [l.id, l]));

  const slug = companySlug.toLowerCase();
  const match = apps.find((a) => {
    const listing = listingMap.get(a.listingId);
    if (!listing) return false;
    const company = listing.company.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
    return company.includes(slug) && (a.status === 'applying' || a.status === 'needs_manual_apply');
  });

  if (!match) {
    console.log(`No pending application found matching "${companySlug}"`);
    return;
  }

  const listing = listingMap.get(match.listingId)!;
  store.markApplied(match.id, 'manual');
  syncTrackerFile();
  console.log(`Marked as APPLIED: ${listing.company} — ${listing.title}`);
}

export async function runFullPipeline(): Promise<void> {
  logger.info('========================================');
  logger.info('=== Full Job Pipeline: Starting ===');
  logger.info('========================================');

  // Step 1: Search and score
  await runJobSearch();

  // Step 2: Generate materials for high scorers
  await runMaterialsGeneration();

  // Step 3: Auto-apply (if enabled)
  await runAutoApply();

  // Step 4: Sync tracker
  await runTrackerSync();

  // Step 5: Send notification
  await runNotification();

  logger.info('========================================');
  logger.info('=== Full Job Pipeline: Complete ===');
  logger.info('========================================');
}
