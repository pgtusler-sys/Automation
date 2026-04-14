import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { settings } from '../../config/settings';
import { CandidateProfile, JobListing, ScoreBreakdown } from '../shared/types';
import { getJobStore, contentHash } from './job-store';
import { buildSearchQueries, buildSerpApiParams, SearchQuery } from './search-queries';
import { buildScoringPrompt } from './prompt-templates-jobs';
import { loadCandidateProfile } from './profile-loader';
import { logger } from '../shared/logger';
import { sleep } from '../shared/utils';

const client = new Anthropic({ apiKey: settings.anthropic.apiKey });
const SEARCH_RESULTS_DIR = path.join(__dirname, '../../search-results');

interface RawJobResult {
  company: string;
  title: string;
  url: string;
  location: string;
  salaryRange: string | null;
  postedDate: string | null;
  description: string;
  source: string;
  preScored?: {
    scoreBreakdown: ScoreBreakdown;
    totalScore: number;
    notes: string;
  };
}

// ── SerpAPI Search ──

async function searchSerpApi(query: string): Promise<RawJobResult[]> {
  if (!settings.jobs.serpApiKey) return [];

  const params = buildSerpApiParams(query);
  const url = new URL('https://serpapi.com/search.json');
  url.searchParams.set('api_key', settings.jobs.serpApiKey);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  url.searchParams.set('q', query);

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      logger.error(`SerpAPI error: ${response.status} ${response.statusText}`);
      return [];
    }

    const data: any = await response.json();
    const jobs = data.jobs_results || [];

    return jobs.map((job: any) => ({
      company: job.company_name || 'Unknown',
      title: job.title || '',
      url: job.related_links?.[0]?.link || job.share_link || '',
      location: job.location || '',
      salaryRange: job.detected_extensions?.salary || null,
      postedDate: job.detected_extensions?.posted_at || null,
      description: job.description || '',
      source: 'serpapi',
    }));
  } catch (err) {
    logger.error(`SerpAPI search failed for "${query}": ${err}`);
    return [];
  }
}

// ── Fallback: Local JSON Files ──

function loadLocalSearchResults(): RawJobResult[] {
  if (!fs.existsSync(SEARCH_RESULTS_DIR)) return [];

  const files = fs.readdirSync(SEARCH_RESULTS_DIR).filter((f) => f.endsWith('.json'));
  const results: RawJobResult[] = [];

  for (const file of files) {
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(SEARCH_RESULTS_DIR, file), 'utf-8'));
      const items = raw.results || raw;
      if (!Array.isArray(items)) continue;

      for (const item of items) {
        const hasScores = item.scoreBreakdown && typeof item.totalScore === 'number';
        results.push({
          company: item.company || 'Unknown',
          title: item.title || '',
          url: item.url || '',
          location: item.location || '',
          salaryRange: item.salaryRange || item.salary_range || null,
          postedDate: item.postedDate || item.posted_date || null,
          description: item.description || '',
          source: `file:${file}`,
          preScored: hasScores
            ? {
                scoreBreakdown: {
                  roleFit: item.scoreBreakdown.roleFit || 0,
                  salaryFit: item.scoreBreakdown.salaryFit || 0,
                  locationFit: item.scoreBreakdown.locationFit || 0,
                  companyFit: item.scoreBreakdown.companyFit || 0,
                },
                totalScore: item.totalScore,
                notes: item.notes || '',
              }
            : undefined,
        });
      }
    } catch (err) {
      logger.warn(`Failed to parse search results file ${file}: ${err}`);
    }
  }

  return results;
}

// ── Scoring ──

async function scoreJob(
  job: RawJobResult,
  profile: CandidateProfile
): Promise<{ score: ScoreBreakdown; notes: string }> {
  const prompt = buildScoringPrompt(
    {
      company: job.company,
      title: job.title,
      location: job.location,
      description: job.description.slice(0, 2000),
      salaryRange: job.salaryRange,
    },
    profile
  );

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content.find((b) => b.type === 'text')?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn(`Failed to parse scoring response for ${job.company} - ${job.title}`);
      return { score: { roleFit: 10, salaryFit: 15, locationFit: 10, companyFit: 10 }, notes: 'Scoring parse failed' };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      score: {
        roleFit: Math.min(25, Math.max(0, parsed.roleFit || 0)),
        salaryFit: Math.min(25, Math.max(0, parsed.salaryFit || 0)),
        locationFit: Math.min(25, Math.max(0, parsed.locationFit || 0)),
        companyFit: Math.min(25, Math.max(0, parsed.companyFit || 0)),
      },
      notes: parsed.notes || '',
    };
  } catch (err) {
    logger.error(`Scoring failed for ${job.company}: ${err}`);
    return { score: { roleFit: 10, salaryFit: 15, locationFit: 10, companyFit: 10 }, notes: 'Scoring error' };
  }
}

// ── Main Search Function ──

export async function searchAndScoreJobs(): Promise<{
  total: number;
  new: number;
  listings: JobListing[];
}> {
  const profile = loadCandidateProfile();
  const store = getJobStore();
  const queries = buildSearchQueries(profile);

  logger.info(`Running ${queries.length} search queries`);

  let allRaw: RawJobResult[] = [];

  // Try SerpAPI first
  if (settings.jobs.serpApiKey) {
    for (const q of queries) {
      const results = await searchSerpApi(q.query);
      allRaw.push(...results);
      if (results.length > 0) {
        logger.info(`SerpAPI "${q.query}": ${results.length} results`);
      }
      await sleep(500); // rate limit
    }
  }

  // Fallback: load local JSON files
  if (allRaw.length === 0) {
    logger.info('No SerpAPI results — loading local search-results/ files');
    allRaw = loadLocalSearchResults();
  }

  logger.info(`Total raw results: ${allRaw.length}`);

  // Dedup by content hash
  const seen = new Set<string>();
  const unique: RawJobResult[] = [];
  for (const job of allRaw) {
    const hash = contentHash(job.company, job.title, job.url);
    if (seen.has(hash)) continue;
    seen.add(hash);
    unique.push(job);
  }

  logger.info(`Unique results after dedup: ${unique.length}`);

  // Score and store
  const newListings: JobListing[] = [];
  for (const job of unique) {
    const hash = contentHash(job.company, job.title, job.url);

    // Skip if already in DB
    if (store.getListingByHash(hash)) {
      continue;
    }

    // Use pre-existing scores from local JSON if available, otherwise score via API
    let score: ScoreBreakdown;
    let notes: string;
    if (job.preScored) {
      score = job.preScored.scoreBreakdown;
      notes = job.preScored.notes;
      logger.debug(`Using pre-scored data for ${job.company} — ${job.title}: ${job.preScored.totalScore}`);
    } else {
      const scored = await scoreJob(job, profile);
      score = scored.score;
      notes = scored.notes;
    }
    const totalScore = score.roleFit + score.salaryFit + score.locationFit + score.companyFit;

    const listing = store.insertListing({
      company: job.company,
      title: job.title,
      url: job.url,
      location: job.location,
      salaryRange: job.salaryRange,
      postedDate: job.postedDate,
      description: job.description,
      scoreBreakdown: score,
      totalScore,
      notes,
      source: job.source,
      contentHash: hash,
      discoveredAt: new Date().toISOString(),
    });

    if (listing) {
      newListings.push(listing);

      // Auto-create application record for jobs above threshold
      if (totalScore >= settings.jobs.scoreThreshold) {
        store.createApplication(listing.id);
      }
    }
  }

  // Save search results JSON
  const today = new Date().toISOString().split('T')[0];
  if (!fs.existsSync(SEARCH_RESULTS_DIR)) {
    fs.mkdirSync(SEARCH_RESULTS_DIR, { recursive: true });
  }
  fs.writeFileSync(
    path.join(SEARCH_RESULTS_DIR, `${today}-pipeline-run.json`),
    JSON.stringify(
      {
        searchDate: today,
        searchQuery: `pipeline run — ${queries.length} queries`,
        totalResults: unique.length,
        results: newListings.map((l) => ({
          company: l.company,
          title: l.title,
          url: l.url,
          location: l.location,
          salaryRange: l.salaryRange,
          postedDate: l.postedDate,
          description: l.description.slice(0, 300),
          scoreBreakdown: l.scoreBreakdown,
          totalScore: l.totalScore,
          notes: l.notes,
        })),
      },
      null,
      2
    )
  );

  // Record the search run
  store.recordSearchRun(
    queries.map((q) => q.query).join('; '),
    settings.jobs.serpApiKey ? 'serpapi' : 'local',
    unique.length,
    newListings.length
  );

  logger.info(`Search complete: ${newListings.length} new listings from ${unique.length} unique results`);
  return { total: unique.length, new: newListings.length, listings: newListings };
}
