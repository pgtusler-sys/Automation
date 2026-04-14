import { parseCandidateProfile } from '../src/jobs/profile-loader';
import { buildSearchQueries } from '../src/jobs/search-queries';
import { buildScoringPrompt } from '../src/jobs/prompt-templates-jobs';
import { detectATS } from '../src/jobs/ats-detector';

const MOCK_CLAUDE_MD = `
## Job Search — Candidate Profile

### Personal Information

- **Name:** Perry Tusler
- **Location:** Los Angeles, CA (open to remote)
- **Email:** pgtusler@gmail.com
- **Phone:** 608-332-9579
- **LinkedIn:** www.linkedin.com/in/Perry-Tusler

### Professional Summary

Revenue operations-minded sales professional with 10+ years across SaaS, mortgage, and B2B teams.

### Target Roles

- Revenue Operations (RevOps) Manager / Director
- Marketing Operations Manager / Director
- Sales Operations Manager

### Preferences

- **Salary:** $110,000+ base
- **Location:** Remote-first preferred
- **Company size:** Series A+ startups through mid-market
- **Industries of interest:** SaaS, fintech, martech, healthtech, edtech
- **Deal-breakers:** Fully on-site outside LA, below $100K base

### Key Skills & Keywords

- Salesforce administration & architecture
- HubSpot (Marketing Hub, Sales Hub, Operations Hub)
- Marketing automation (Marketo, Pardot, HubSpot)

### Education

- **B.S. Business Administration** — University of Wisconsin–Milwaukee

### Experience Highlights

- Generated $1.205M in ARR opportunities
- Exceeded quota in 15 of 18 months
`;

describe('parseCandidateProfile', () => {
  const profile = parseCandidateProfile(MOCK_CLAUDE_MD);

  it('should extract name', () => {
    expect(profile.name).toBe('Perry Tusler');
  });

  it('should extract email', () => {
    expect(profile.email).toBe('pgtusler@gmail.com');
  });

  it('should extract phone', () => {
    expect(profile.phone).toBe('608-332-9579');
  });

  it('should extract linkedin', () => {
    expect(profile.linkedin).toBe('www.linkedin.com/in/Perry-Tusler');
  });

  it('should extract target roles', () => {
    expect(profile.targetRoles).toHaveLength(3);
    expect(profile.targetRoles[0]).toContain('Revenue Operations');
  });

  it('should extract salary minimum', () => {
    expect(profile.salaryMin).toBe(110000);
  });

  it('should extract skills', () => {
    expect(profile.skills.length).toBeGreaterThan(0);
    expect(profile.skills[0]).toContain('Salesforce');
  });

  it('should extract experience highlights', () => {
    expect(profile.experienceHighlights.length).toBeGreaterThan(0);
    expect(profile.experienceHighlights[0]).toContain('$1.205M');
  });

  it('should extract industries', () => {
    expect(profile.industries).toContain('SaaS');
  });
});

describe('buildSearchQueries', () => {
  const profile = parseCandidateProfile(MOCK_CLAUDE_MD);
  const queries = buildSearchQueries(profile);

  it('should generate queries for each role x location combo', () => {
    // 3 roles x 2 locations (remote + LA) = 6 queries
    expect(queries.length).toBe(6);
  });

  it('should include remote queries', () => {
    const remoteQueries = queries.filter((q) => q.query.includes('remote'));
    expect(remoteQueries.length).toBe(3);
  });

  it('should set source to serpapi', () => {
    expect(queries.every((q) => q.source === 'serpapi')).toBe(true);
  });
});

describe('buildScoringPrompt', () => {
  const profile = parseCandidateProfile(MOCK_CLAUDE_MD);

  it('should include job and profile details', () => {
    const prompt = buildScoringPrompt(
      {
        company: 'Acme Corp',
        title: 'RevOps Manager',
        location: 'Remote',
        description: 'We need a RevOps manager...',
        salaryRange: '$120K-$150K',
      },
      profile
    );

    expect(prompt).toContain('Acme Corp');
    expect(prompt).toContain('RevOps Manager');
    expect(prompt).toContain('Revenue Operations');
    expect(prompt).toContain('$120K-$150K');
    expect(prompt).toContain('JSON format');
  });
});

describe('detectATS', () => {
  it('should detect Greenhouse', () => {
    expect(detectATS('https://boards.greenhouse.io/acme/jobs/123').ats).toBe('greenhouse');
    expect(detectATS('https://job-boards.greenhouse.io/company').ats).toBe('greenhouse');
  });

  it('should detect Ashby', () => {
    expect(detectATS('https://jobs.ashbyhq.com/acme/position').ats).toBe('ashby');
  });

  it('should detect Lever', () => {
    expect(detectATS('https://jobs.lever.co/acme/abc-123').ats).toBe('lever');
  });

  it('should detect Workday', () => {
    expect(detectATS('https://acme.myworkdayjobs.com/en-US/careers').ats).toBe('workday');
  });

  it('should return generic for unknown URLs', () => {
    expect(detectATS('https://acme.com/careers/revops-manager').ats).toBe('generic');
    expect(detectATS('https://indeed.com/viewjob?jk=123').ats).toBe('generic');
  });
});
