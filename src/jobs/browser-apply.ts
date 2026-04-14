import { settings } from '../../config/settings';
import { CandidateProfile, ATSType } from '../shared/types';
import { ATSDetection } from './ats-detector';
import { logger } from '../shared/logger';

interface JobInfo {
  company: string;
  title: string;
  url: string;
  description: string;
}

interface MaterialsPaths {
  resumePath: string;
  coverLetterPath?: string;
}

export interface ApplyResult {
  success: boolean;
  screenshotPaths: string[];
  fieldsFilledCount?: number;
  error?: string;
}

// ── Instruction Builders ──

function buildGreenhouseInstructions(
  job: JobInfo,
  profile: CandidateProfile,
  materials: MaterialsPaths
): string {
  return `
TASK: Apply to "${job.title}" at ${job.company} via Greenhouse

1. Navigate to ${job.url}
2. Wait for the application form to load completely
3. Fill "First Name": ${profile.name.split(' ')[0]}
4. Fill "Last Name": ${profile.name.split(' ').slice(1).join(' ')}
5. Fill "Email": ${profile.email}
6. Fill "Phone": ${profile.phone}
7. Upload resume: click "Attach Resume/CV" or the file upload button → select ${materials.resumePath.replace(/\.md$/, '.pdf')}
${materials.coverLetterPath ? `8. If a cover letter upload field exists: upload ${materials.coverLetterPath.replace(/\.md$/, '.pdf')}` : '8. Skip cover letter if no upload field'}
9. Fill "LinkedIn Profile" if the field exists: ${profile.linkedin}
10. For any screening questions:
    - Read each question carefully
    - Generate the best honest answer based on the candidate profile:
      * Location: ${profile.location}
      * Salary expectation: $${profile.salaryMin.toLocaleString()}+
      * Summary: ${profile.summary.slice(0, 200)}
      * Skills: ${profile.skills.slice(0, 8).join(', ')}
    - If a question asks about work authorization, answer honestly based on location
    - If a question is multiple choice, select the closest matching option
11. Take a screenshot of the completed form BEFORE submitting
12. Click "Submit Application"
13. Take a screenshot of the confirmation page

SAFETY: If a CAPTCHA appears, STOP and report "captcha_blocked"
SAFETY: If asked to create an account, STOP and report "account_required"
SAFETY: If the page shows an error, take a screenshot and report the error text
TIMEOUT: Max 3 minutes for the entire process
`.trim();
}

function buildAshbyInstructions(
  job: JobInfo,
  profile: CandidateProfile,
  materials: MaterialsPaths
): string {
  return `
TASK: Apply to "${job.title}" at ${job.company} via Ashby

1. Navigate to ${job.url}
2. Look for an "Apply" button and click it
3. Wait for the application form to load
4. Fill name fields: ${profile.name}
5. Fill "Email": ${profile.email}
6. Fill "Phone": ${profile.phone}
7. Upload resume when file upload field appears → select ${materials.resumePath.replace(/\.md$/, '.pdf')}
${materials.coverLetterPath ? `8. Upload cover letter if field exists → ${materials.coverLetterPath.replace(/\.md$/, '.pdf')}` : '8. Skip cover letter if no field'}
9. Fill "LinkedIn" if present: ${profile.linkedin}
10. For screening questions, answer from candidate profile:
    * Location: ${profile.location}
    * Salary: $${profile.salaryMin.toLocaleString()}+
    * Skills: ${profile.skills.slice(0, 8).join(', ')}
11. Take screenshot of completed form
12. Click "Submit" or "Submit Application"
13. Take screenshot of confirmation

SAFETY: If CAPTCHA appears, STOP and report "captcha_blocked"
SAFETY: If account creation required, STOP and report "account_required"
TIMEOUT: Max 3 minutes
`.trim();
}

function buildLeverInstructions(
  job: JobInfo,
  profile: CandidateProfile,
  materials: MaterialsPaths
): string {
  return `
TASK: Apply to "${job.title}" at ${job.company} via Lever

1. Navigate to ${job.url}
2. Click "Apply for this job" button
3. Fill "Full name": ${profile.name}
4. Fill "Email": ${profile.email}
5. Fill "Phone": ${profile.phone}
6. Fill "Current company" if present: WeFund Mortgage
7. Fill "LinkedIn URL" if present: ${profile.linkedin}
8. Upload resume → ${materials.resumePath.replace(/\.md$/, '.pdf')}
${materials.coverLetterPath ? `9. Upload cover letter if field exists → ${materials.coverLetterPath.replace(/\.md$/, '.pdf')}` : '9. Skip cover letter'}
10. Answer any additional questions from candidate profile:
    * Location: ${profile.location}
    * Salary: $${profile.salaryMin.toLocaleString()}+
11. Take screenshot of completed form
12. Click "Submit application"
13. Take screenshot of confirmation

SAFETY: If CAPTCHA appears, STOP and report "captcha_blocked"
SAFETY: If account creation required, STOP and report "account_required"
TIMEOUT: Max 3 minutes
`.trim();
}

function buildWorkdayInstructions(
  job: JobInfo,
  profile: CandidateProfile,
  materials: MaterialsPaths
): string {
  return `
TASK: Apply to "${job.title}" at ${job.company} via Workday

NOTE: Workday often requires account creation. If so, STOP and report "account_required".

1. Navigate to ${job.url}
2. Look for "Apply" button and click it
3. If asked to sign in or create account, STOP and report "account_required"
4. If the form loads directly:
   a. Fill name: ${profile.name}
   b. Fill email: ${profile.email}
   c. Fill phone: ${profile.phone}
   d. Upload resume → ${materials.resumePath.replace(/\.md$/, '.pdf')}
   e. Fill any additional fields from profile
5. Take screenshot before submitting
6. Submit the application
7. Take screenshot of confirmation

SAFETY: Workday almost always requires login — abort early if asked
SAFETY: If CAPTCHA appears, STOP and report "captcha_blocked"
TIMEOUT: Max 2 minutes (abort faster since Workday usually requires auth)
`.trim();
}

function buildGenericInstructions(
  job: JobInfo,
  profile: CandidateProfile,
  materials: MaterialsPaths
): string {
  return `
TASK: Apply to "${job.title}" at ${job.company}

1. Navigate to ${job.url}
2. Look for an "Apply", "Apply Now", or "Submit Application" button and click it
3. Wait for the application form to load
4. Fill all visible fields:
   - Name / First Name / Last Name: ${profile.name}
   - Email: ${profile.email}
   - Phone: ${profile.phone}
   - LinkedIn: ${profile.linkedin}
   - Current location: ${profile.location}
5. Upload resume when a file upload field is found → ${materials.resumePath.replace(/\.md$/, '.pdf')}
${materials.coverLetterPath ? `6. Upload cover letter if a second upload field exists → ${materials.coverLetterPath.replace(/\.md$/, '.pdf')}` : '6. Skip cover letter if no second upload'}
7. For any other fields or questions, infer the best answer from:
   - Salary expectation: $${profile.salaryMin.toLocaleString()}+
   - Summary: ${profile.summary.slice(0, 200)}
   - Skills: ${profile.skills.slice(0, 8).join(', ')}
8. Take screenshot of the completed form BEFORE submitting
9. Click the submit button
10. Take screenshot of the confirmation page

SAFETY: If CAPTCHA appears, STOP and report "captcha_blocked"
SAFETY: If account creation is required, STOP and report "account_required"
SAFETY: If the page redirects to an unexpected site, STOP and report "unexpected_redirect"
TIMEOUT: Max 3 minutes for the entire process
`.trim();
}

// ── Public API ──

export function buildApplyInstructions(
  job: JobInfo,
  profile: CandidateProfile,
  atsDetection: ATSDetection,
  materials: MaterialsPaths
): string {
  switch (atsDetection.ats) {
    case 'greenhouse':
      return buildGreenhouseInstructions(job, profile, materials);
    case 'ashby':
      return buildAshbyInstructions(job, profile, materials);
    case 'lever':
      return buildLeverInstructions(job, profile, materials);
    case 'workday':
      return buildWorkdayInstructions(job, profile, materials);
    default:
      return buildGenericInstructions(job, profile, materials);
  }
}

export async function triggerJobApplyTask(
  job: { id: string; company: string; title: string },
  instructions: string
): Promise<ApplyResult> {
  logger.info(`Triggering auto-apply for ${job.company} — ${job.title}`);

  const webhookUrl = `${settings.n8n.webhookUrl}/webhook/job-apply`;

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task: 'apply_to_job',
        jobId: job.id,
        company: job.company,
        title: job.title,
        instructions,
      }),
    });

    if (!response.ok) {
      throw new Error(`Job apply webhook failed: ${response.statusText}`);
    }

    const result = await response.json();
    logger.info(`Auto-apply result for ${job.company}: ${result.success ? 'success' : 'failed'}`);

    return {
      success: result.success || false,
      screenshotPaths: result.screenshotPaths || [],
      fieldsFilledCount: result.fieldsFilledCount,
      error: result.error,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'unknown error';
    logger.error(`Auto-apply failed for ${job.company}: ${errorMsg}`);
    return { success: false, screenshotPaths: [], error: errorMsg };
  }
}
