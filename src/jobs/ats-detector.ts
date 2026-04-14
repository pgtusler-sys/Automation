import { ATSType } from '../shared/types';

export interface ATSDetection {
  ats: ATSType;
  applyUrl: string;
}

const ATS_PATTERNS: { pattern: RegExp; ats: ATSType }[] = [
  { pattern: /greenhouse\.io/i, ats: 'greenhouse' },
  { pattern: /boards\.greenhouse/i, ats: 'greenhouse' },
  { pattern: /jobs\.ashbyhq\.com/i, ats: 'ashby' },
  { pattern: /jobs\.lever\.co/i, ats: 'lever' },
  { pattern: /\.myworkdayjobs\.com/i, ats: 'workday' },
  { pattern: /workday\.com\/.*\/job/i, ats: 'workday' },
];

export function detectATS(url: string): ATSDetection {
  for (const { pattern, ats } of ATS_PATTERNS) {
    if (pattern.test(url)) {
      return { ats, applyUrl: url };
    }
  }
  return { ats: 'generic', applyUrl: url };
}
