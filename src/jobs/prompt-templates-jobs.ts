import { CandidateProfile, JobListing, ScoreBreakdown } from '../shared/types';

export function buildScoringPrompt(
  jobData: { company: string; title: string; location: string; description: string; salaryRange: string | null },
  profile: CandidateProfile
): string {
  return `You are a job matching expert. Score how well this job listing matches the candidate profile.

CANDIDATE PROFILE:
- Target roles: ${profile.targetRoles.join(', ')}
- Key skills: ${profile.skills.join(', ')}
- Salary minimum: $${profile.salaryMin.toLocaleString()}
- Location preference: ${profile.locationPreference}
- Preferred industries: ${profile.industries.join(', ')}
- Experience: ${profile.experienceHighlights.slice(0, 3).join('; ')}

JOB LISTING:
- Company: ${jobData.company}
- Title: ${jobData.title}
- Location: ${jobData.location}
- Salary: ${jobData.salaryRange || 'Not posted'}
- Description: ${jobData.description}

Score the job on 4 dimensions (0-25 each, total 0-100):

1. Role Fit (0-25): How well do the title and responsibilities match the candidate's target roles and skills?
2. Salary Fit (0-25): 25 if range meets $${profile.salaryMin.toLocaleString()}+ threshold; 15 if salary not posted (neutral); 0-10 if below threshold
3. Location Fit (0-25): 25 for remote; 20 for ${profile.location.split(',')[0]} hybrid; 10 for other CA; 5 for other US on-site
4. Company Fit (0-25): Industry alignment, company stage, growth signals

Respond in EXACTLY this JSON format, no additional text:
{"roleFit": <number>, "salaryFit": <number>, "locationFit": <number>, "companyFit": <number>, "notes": "<brief explanation>"}`;
}

export function buildResumeTailoringPrompt(
  profile: CandidateProfile,
  masterResume: string,
  job: { company: string; title: string; description: string }
): string {
  return `You are an expert resume writer. Tailor this master resume for the specific job below.

CANDIDATE PROFILE:
- Name: ${profile.name}
- Location: ${profile.location}
- Phone: ${profile.phone}
- Email: ${profile.email}
- LinkedIn: ${profile.linkedin}
- Education: ${profile.education}

MASTER RESUME:
${masterResume}

TARGET JOB:
- Company: ${job.company}
- Title: ${job.title}
- Description: ${job.description}

INSTRUCTIONS:
1. Rewrite the Professional Summary to speak directly to this role's core needs
2. Reorder Skills to lead with the most relevant; mirror the JD's exact keyword phrasing where truthful
3. Reorder Experience bullets to lead with the most relevant achievements; adjust language to mirror JD keywords
4. Emphasize quantified outcomes that align with what this role values
5. Keep to 1-2 pages maximum
6. Do NOT fabricate experience, skills, or metrics

OUTPUT FORMAT — clean, ATS-friendly markdown:

# ${profile.name}
${profile.location} | ${profile.phone} | ${profile.email} | ${profile.linkedin}

## Professional Summary
[2-3 sentences tailored to this specific role]

## Skills
[Comma-separated list, most relevant first]

## Experience

### [Job Title] — [Company Name]
[Start Date] – [End Date] | [Location]
- [Action verb] + [what you did] + [quantified result]

## Education
[Degree, School]

Output ONLY the tailored resume in markdown. No commentary.`;
}

export function buildCoverLetterPrompt(
  profile: CandidateProfile,
  job: { company: string; title: string; description: string; url: string },
  resumeGaps: string
): string {
  return `You are an expert cover letter writer. Write a compelling, personalized cover letter.

CANDIDATE:
- Name: ${profile.name}
- Summary: ${profile.summary}
- Key experience: ${profile.experienceHighlights.join('; ')}
- Skills: ${profile.skills.slice(0, 10).join(', ')}

TARGET JOB:
- Company: ${job.company}
- Title: ${job.title}
- URL: ${job.url}
- Description: ${job.description}

${resumeGaps ? `GAPS TO ADDRESS:\n${resumeGaps}\n` : ''}

STRUCTURE (3-4 paragraphs, under 400 words total):

Opening (2-3 sentences):
- Lead with a hook — why this specific company/role interests the candidate
- Name the role title

Body paragraph 1 (3-5 sentences):
- Strongest qualification match, with a specific achievement and metric
- Connect it directly to what the role needs

Body paragraph 2 (3-5 sentences):
- A second key strength showing breadth
- Address any gap by reframing adjacent experience

Closing (2-3 sentences):
- Forward-looking: what the candidate would bring in the first 90 days
- Clear call to action

STYLE:
- Confident but not arrogant; enthusiastic but not sycophantic
- Never use: "I'm excited to apply," "I believe I would be a great fit," or generic filler
- Do not repeat the resume verbatim
- Under 400 words
- Professional, direct, and personable

Output ONLY the cover letter text. No headers or commentary. Address to "Dear Hiring Team" unless a hiring manager name is visible in the description.`;
}

export function buildScreeningAnswerPrompt(
  profile: CandidateProfile,
  question: string
): string {
  return `Answer this job application screening question based on the candidate profile below. Be concise, honest, and professional.

CANDIDATE PROFILE:
- Name: ${profile.name}
- Location: ${profile.location}
- Summary: ${profile.summary}
- Skills: ${profile.skills.join(', ')}
- Experience: ${profile.experienceHighlights.join('; ')}
- Education: ${profile.education}
- Salary expectation: $${profile.salaryMin.toLocaleString()}+

QUESTION: ${question}

Answer concisely. If the question asks for a number, give just the number. If it asks yes/no, lead with yes or no then briefly explain. Do not fabricate qualifications the candidate does not have.`;
}
