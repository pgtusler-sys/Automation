import { settings } from '../../config/settings';
import { sendEmail } from '../outlook/client';
import { JobListing, JobApplication } from '../shared/types';
import { getJobStore } from './job-store';
import { logger } from '../shared/logger';

interface DigestData {
  newListings: JobListing[];
  materialsGenerated: { company: string; title: string }[];
  autoApplied: { company: string; title: string; screenshotPaths: string[] }[];
  needsManualApply: { company: string; title: string; url: string; reason: string }[];
  followUpsDue: { company: string; title: string; appliedAt: string; daysSince: number }[];
}

function buildDigestHtml(data: DigestData, stats: ReturnType<ReturnType<typeof getJobStore>['getStats']>): string {
  const sections: string[] = [];

  // Header
  sections.push(`
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
    <h1 style="color: #1a1a1a; border-bottom: 2px solid #4f46e5; padding-bottom: 8px;">Job Search Daily Digest</h1>
    <p style="color: #666; font-size: 14px;">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
  `);

  // Quick stats
  sections.push(`
    <div style="background: #f5f3ff; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <strong>Pipeline Summary:</strong> ${stats.totalListings} tracked | ${stats.applied} applied | ${stats.autoApplied} auto-applied | ${stats.needsManual} need manual action
    </div>
  `);

  // New matches
  if (data.newListings.length > 0) {
    sections.push('<h2 style="color: #4f46e5;">New Matches</h2>');
    for (const l of data.newListings) {
      sections.push(`
        <div style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; margin: 8px 0;">
          <strong>${l.company}</strong> — ${l.title}
          <span style="background: ${l.totalScore >= 80 ? '#dcfce7' : '#fef9c3'}; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-left: 8px;">
            Score: ${l.totalScore}
          </span>
          <br><span style="color: #666; font-size: 13px;">${l.location} | ${l.salaryRange || 'Salary not posted'}</span>
          ${l.url ? `<br><a href="${l.url}" style="color: #4f46e5; font-size: 13px;">View listing</a>` : ''}
        </div>
      `);
    }
  }

  // Materials generated
  if (data.materialsGenerated.length > 0) {
    sections.push('<h2 style="color: #059669;">Materials Ready</h2><ul>');
    for (const m of data.materialsGenerated) {
      sections.push(`<li><strong>${m.company}</strong> — ${m.title} (resume + cover letter generated)</li>`);
    }
    sections.push('</ul>');
  }

  // Auto-applied
  if (data.autoApplied.length > 0) {
    sections.push('<h2 style="color: #2563eb;">Auto-Applied</h2><ul>');
    for (const a of data.autoApplied) {
      sections.push(`<li><strong>${a.company}</strong> — ${a.title} (submitted automatically)</li>`);
    }
    sections.push('</ul>');
  }

  // Needs manual apply
  if (data.needsManualApply.length > 0) {
    sections.push('<h2 style="color: #dc2626;">Needs Manual Action</h2>');
    for (const m of data.needsManualApply) {
      sections.push(`
        <div style="border-left: 3px solid #dc2626; padding-left: 12px; margin: 8px 0;">
          <strong>${m.company}</strong> — ${m.title}
          <br><span style="color: #666; font-size: 13px;">Reason: ${m.reason}</span>
          ${m.url ? `<br><a href="${m.url}" style="color: #4f46e5;">Apply manually</a>` : ''}
        </div>
      `);
    }
  }

  // Follow-ups due
  if (data.followUpsDue.length > 0) {
    sections.push('<h2 style="color: #d97706;">Follow-ups Due</h2><ul>');
    for (const f of data.followUpsDue) {
      sections.push(`<li><strong>${f.company}</strong> — ${f.title} (applied ${f.daysSince} days ago)</li>`);
    }
    sections.push('</ul>');
  }

  if (data.newListings.length === 0 && data.materialsGenerated.length === 0 && data.autoApplied.length === 0) {
    sections.push('<p style="color: #666;">No new activity today. The pipeline is up to date.</p>');
  }

  sections.push('</div>');
  return sections.join('\n');
}

export async function sendDigestEmail(digestData: DigestData): Promise<void> {
  const email = settings.jobs.notifyEmail;
  if (!email) {
    logger.warn('JOB_NOTIFY_EMAIL not set — skipping digest');
    return;
  }

  const store = getJobStore();
  const stats = store.getStats();

  const newCount = digestData.newListings.length;
  const appliedCount = digestData.autoApplied.length;
  const manualCount = digestData.needsManualApply.length;

  const subject = `Job Search: ${newCount} new match${newCount !== 1 ? 'es' : ''}, ${appliedCount} auto-applied, ${manualCount} need${manualCount !== 1 ? '' : 's'} action`;
  const html = buildDigestHtml(digestData, stats);

  try {
    await sendEmail(email, subject, html);
    logger.info(`Digest email sent to ${email}`);
  } catch (err) {
    logger.error(`Failed to send digest email: ${err}`);
  }
}

export function buildDigestData(): DigestData {
  const store = getJobStore();
  const today = new Date().toISOString().split('T')[0];

  // New listings discovered today
  const allListings = store.getAllListings();
  const newListings = allListings.filter(
    (l) => l.discoveredAt.startsWith(today) && l.totalScore >= settings.jobs.scoreThreshold
  );

  // Applications with materials
  const allApps = store.getAllApplications();
  const materialsGenerated = allApps
    .filter((a) => a.status === 'applying' && a.resumePath && a.updatedAt.startsWith(today))
    .map((a) => {
      const listing = allListings.find((l) => l.id === a.listingId);
      return { company: listing?.company || 'Unknown', title: listing?.title || '' };
    });

  // Auto-applied today
  const autoApplied = allApps
    .filter((a) => a.applyMethod === 'auto' && a.appliedAt?.startsWith(today))
    .map((a) => {
      const listing = allListings.find((l) => l.id === a.listingId);
      return {
        company: listing?.company || 'Unknown',
        title: listing?.title || '',
        screenshotPaths: a.screenshotPaths ? JSON.parse(a.screenshotPaths) : [],
      };
    });

  // Needs manual apply
  const needsManualApply = allApps
    .filter((a) => a.status === 'needs_manual_apply')
    .map((a) => {
      const listing = allListings.find((l) => l.id === a.listingId);
      return {
        company: listing?.company || 'Unknown',
        title: listing?.title || '',
        url: listing?.url || '',
        reason: a.notes,
      };
    });

  // Follow-ups due
  const followUpsDue = allApps
    .filter((a) => {
      if (!a.followUpDate || a.status !== 'applied') return false;
      return a.followUpDate <= today;
    })
    .map((a) => {
      const listing = allListings.find((l) => l.id === a.listingId);
      const daysSince = a.appliedAt
        ? Math.floor((Date.now() - new Date(a.appliedAt).getTime()) / (24 * 60 * 60 * 1000))
        : 0;
      return {
        company: listing?.company || 'Unknown',
        title: listing?.title || '',
        appliedAt: a.appliedAt || '',
        daysSince,
      };
    });

  return { newListings, materialsGenerated, autoApplied, needsManualApply, followUpsDue };
}
