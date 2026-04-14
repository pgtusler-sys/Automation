import { CandidateProfile } from '../shared/types';

export interface SearchQuery {
  query: string;
  source: string;
}

const JOB_BOARDS = ['LinkedIn', 'Indeed', 'Glassdoor', 'BuiltIn', 'Wellfound'] as const;

export function buildSearchQueries(profile: CandidateProfile): SearchQuery[] {
  const queries: SearchQuery[] = [];

  const locations = ['remote'];
  if (profile.location) {
    const city = profile.location.split(',')[0].trim();
    locations.push(city);
  }

  for (const role of profile.targetRoles) {
    for (const loc of locations) {
      // SerpAPI Google Jobs queries
      queries.push({
        query: `${role} ${loc}`,
        source: 'serpapi',
      });
    }
  }

  return queries;
}

export function buildSerpApiParams(query: string): Record<string, string> {
  return {
    engine: 'google_jobs',
    q: query,
    hl: 'en',
    gl: 'us',
    chips: 'date_posted:week',
  };
}

export function buildRemoteOkUrl(): string {
  return 'https://remoteok.com/api';
}

export function getSearchSummary(queries: SearchQuery[]): string {
  const bySource = queries.reduce(
    (acc, q) => {
      acc[q.source] = (acc[q.source] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return Object.entries(bySource)
    .map(([source, count]) => `${source}: ${count} queries`)
    .join(', ');
}
