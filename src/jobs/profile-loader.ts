import fs from 'fs';
import path from 'path';
import { CandidateProfile } from '../shared/types';
import { logger } from '../shared/logger';

const CLAUDE_MD_PATH = path.join(__dirname, '../../CLAUDE.md');

export function loadCandidateProfile(): CandidateProfile {
  logger.info('Loading candidate profile from CLAUDE.md');
  const raw = fs.readFileSync(CLAUDE_MD_PATH, 'utf-8');
  return parseCandidateProfile(raw);
}

function extractAfter(text: string, label: string): string {
  const regex = new RegExp(`\\*\\*${label}:\\*\\*\\s*(.+)`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : '';
}

function extractListItems(text: string, sectionHeader: string): string[] {
  const headerRegex = new RegExp(`###\\s*${sectionHeader}`, 'i');
  const headerMatch = text.match(headerRegex);
  if (!headerMatch) return [];

  const start = text.indexOf(headerMatch[0]) + headerMatch[0].length;
  const nextSection = text.indexOf('\n### ', start);
  const nextH2 = text.indexOf('\n## ', start);
  const end = Math.min(
    nextSection > -1 ? nextSection : text.length,
    nextH2 > -1 ? nextH2 : text.length
  );
  const block = text.slice(start, end);

  return block
    .split('\n')
    .filter((line) => line.trim().startsWith('-'))
    .map((line) => line.replace(/^[\s-]+/, '').trim())
    .filter(Boolean);
}

function extractBulletList(text: string, sectionHeader: string): string[] {
  const headerRegex = new RegExp(`### ${sectionHeader}`, 'i');
  const headerMatch = text.match(headerRegex);
  if (!headerMatch) return [];

  const start = text.indexOf(headerMatch[0]) + headerMatch[0].length;
  const nextSection = text.indexOf('\n### ', start);
  const nextH2 = text.indexOf('\n## ', start);
  const end = Math.min(
    nextSection > -1 ? nextSection : text.length,
    nextH2 > -1 ? nextH2 : text.length
  );
  const block = text.slice(start, end);

  return block
    .split('\n')
    .filter((line) => line.trim().startsWith('-'))
    .map((line) => line.replace(/^[\s-]+/, '').trim())
    .filter(Boolean);
}

export function parseCandidateProfile(raw: string): CandidateProfile {
  const name = extractAfter(raw, 'Name');
  const location = extractAfter(raw, 'Location');
  const email = extractAfter(raw, 'Email');
  const phone = extractAfter(raw, 'Phone');
  const linkedin = extractAfter(raw, 'LinkedIn');

  // Extract professional summary — paragraph after "### Professional Summary"
  let summary = '';
  const summaryMatch = raw.match(/### Professional Summary\s*\n\n([\s\S]*?)(?=\n### |\n## )/i);
  if (summaryMatch) {
    summary = summaryMatch[1].trim();
  }

  const targetRoles = extractListItems(raw, 'Target Roles');
  const skills = extractListItems(raw, 'Key Skills & Keywords');
  const experienceHighlights = extractListItems(raw, 'Experience Highlights');

  // Parse preferences
  const salaryStr = extractAfter(raw, 'Salary');
  const salaryMatch = salaryStr.match(/\$?([\d,]+)/);
  const salaryMin = salaryMatch ? parseInt(salaryMatch[1].replace(',', ''), 10) : 110000;

  const locationPreference = extractAfter(raw, 'Location') || 'Remote-first preferred';
  const companySize = extractAfter(raw, 'Company size');

  const industriesStr = extractAfter(raw, 'Industries of interest');
  const industries = industriesStr
    ? industriesStr.split(',').map((s) => s.trim())
    : [];

  const dealBreakersStr = extractAfter(raw, 'Deal-breakers');
  const dealBreakers = dealBreakersStr
    ? dealBreakersStr.split(',').map((s) => s.trim())
    : [];

  // Education
  const educationStr = extractAfter(raw, 'B\\.S');
  const education = educationStr
    ? `B.S. ${educationStr}`
    : extractListItems(raw, 'Education').join('; ') || '';

  return {
    name,
    location,
    email,
    phone,
    linkedin,
    summary,
    targetRoles,
    salaryMin,
    locationPreference,
    companySize,
    industries,
    dealBreakers,
    skills,
    education,
    experienceHighlights,
  };
}
