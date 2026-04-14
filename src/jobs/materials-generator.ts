import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { settings } from '../../config/settings';
import { JobListing, CandidateProfile } from '../shared/types';
import { getJobStore } from './job-store';
import { loadCandidateProfile } from './profile-loader';
import { buildResumeTailoringPrompt, buildCoverLetterPrompt } from './prompt-templates-jobs';
import { logger } from '../shared/logger';

const client = new Anthropic({ apiKey: settings.anthropic.apiKey });
const APPLICATIONS_DIR = path.join(__dirname, '../../applications');
const MASTER_RESUME_PATH = path.join(__dirname, '../../master-resume.md');

function companyDirName(company: string): string {
  return company
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function getCompanyDir(company: string): string {
  const dir = path.join(APPLICATIONS_DIR, companyDirName(company));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function loadMasterResume(): string {
  try {
    return fs.readFileSync(MASTER_RESUME_PATH, 'utf-8');
  } catch {
    logger.warn('master-resume.md not found — building from CLAUDE.md profile');
    const profile = loadCandidateProfile();
    return `# ${profile.name}\n${profile.location} | ${profile.phone} | ${profile.email} | ${profile.linkedin}\n\n## Professional Summary\n${profile.summary}\n\n## Skills\n${profile.skills.join(', ')}\n\n## Experience Highlights\n${profile.experienceHighlights.map((h) => `- ${h}`).join('\n')}\n\n## Education\n${profile.education}`;
  }
}

async function generateTailoredResume(
  profile: CandidateProfile,
  listing: JobListing
): Promise<string> {
  const masterResume = loadMasterResume();
  const prompt = buildResumeTailoringPrompt(profile, masterResume, {
    company: listing.company,
    title: listing.title,
    description: listing.description.slice(0, 3000),
  });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content.find((b) => b.type === 'text')?.text || '';
  return text;
}

async function generateCoverLetter(
  profile: CandidateProfile,
  listing: JobListing,
  resumeGaps: string
): Promise<string> {
  const prompt = buildCoverLetterPrompt(
    profile,
    {
      company: listing.company,
      title: listing.title,
      description: listing.description.slice(0, 3000),
      url: listing.url,
    },
    resumeGaps
  );

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content.find((b) => b.type === 'text')?.text || '';
  return text;
}

export interface MaterialsResult {
  listingId: string;
  company: string;
  resumePath: string;
  coverLetterPath: string;
}

export async function generateMaterials(listing: JobListing): Promise<MaterialsResult> {
  const profile = loadCandidateProfile();
  const store = getJobStore();
  const companyDir = getCompanyDir(listing.company);

  logger.info(`Generating materials for ${listing.company} — ${listing.title}`);

  // Generate resume
  const resumeContent = await generateTailoredResume(profile, listing);
  const resumePath = path.join(companyDir, 'resume.md');
  fs.writeFileSync(resumePath, resumeContent);
  logger.info(`Resume saved: ${resumePath}`);

  // Generate cover letter
  const coverLetterContent = await generateCoverLetter(profile, listing, '');
  const coverLetterPath = path.join(companyDir, 'cover-letter.md');
  fs.writeFileSync(coverLetterPath, coverLetterContent);
  logger.info(`Cover letter saved: ${coverLetterPath}`);

  // Update application record
  const app = store.getApplicationByListingId(listing.id);
  if (app) {
    store.setMaterialsPaths(app.id, resumePath, coverLetterPath);
  }

  return {
    listingId: listing.id,
    company: listing.company,
    resumePath,
    coverLetterPath,
  };
}

export async function generateMaterialsForHighScorers(): Promise<MaterialsResult[]> {
  const store = getJobStore();
  const threshold = settings.jobs.autoGenerateThreshold;
  const listings = store.getListingsAboveScore(threshold);
  const results: MaterialsResult[] = [];

  logger.info(`Found ${listings.length} listings scoring ${threshold}+ for materials generation`);

  for (const listing of listings) {
    const app = store.getApplicationByListingId(listing.id);
    // Skip if materials already generated
    if (app && app.resumePath) {
      logger.debug(`Materials already exist for ${listing.company}`);
      continue;
    }

    try {
      const result = await generateMaterials(listing);
      results.push(result);
    } catch (err) {
      logger.error(`Failed to generate materials for ${listing.company}: ${err}`);
    }
  }

  logger.info(`Generated materials for ${results.length} applications`);
  return results;
}
