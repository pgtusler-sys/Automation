import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { JobListing, JobApplication, JobSearchRun, ApplicationStatus, ApplyMethod, ScoreBreakdown } from '../shared/types';
import { logger } from '../shared/logger';

const DB_PATH = path.join(__dirname, '../../data/jobs.db');

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) return db;

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  db = new Database(DB_PATH);

  db.exec(`
    CREATE TABLE IF NOT EXISTS job_listings (
      id TEXT PRIMARY KEY,
      company TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      location TEXT NOT NULL DEFAULT '',
      salary_range TEXT,
      posted_date TEXT,
      description TEXT NOT NULL DEFAULT '',
      role_fit INTEGER NOT NULL DEFAULT 0,
      salary_fit INTEGER NOT NULL DEFAULT 0,
      location_fit INTEGER NOT NULL DEFAULT 0,
      company_fit INTEGER NOT NULL DEFAULT 0,
      total_score INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT '',
      content_hash TEXT NOT NULL UNIQUE,
      discovered_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS job_applications (
      id TEXT PRIMARY KEY,
      listing_id TEXT NOT NULL REFERENCES job_listings(id),
      status TEXT NOT NULL DEFAULT 'identified',
      applied_at TEXT,
      apply_method TEXT,
      follow_up_date TEXT,
      resume_path TEXT,
      cover_letter_path TEXT,
      screenshot_paths TEXT,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS search_runs (
      id TEXT PRIMARY KEY,
      search_query TEXT NOT NULL,
      source TEXT NOT NULL,
      total_results INTEGER NOT NULL DEFAULT 0,
      new_results INTEGER NOT NULL DEFAULT 0,
      ran_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_listings_score ON job_listings(total_score DESC);
    CREATE INDEX IF NOT EXISTS idx_listings_hash ON job_listings(content_hash);
    CREATE INDEX IF NOT EXISTS idx_applications_status ON job_applications(status);
    CREATE INDEX IF NOT EXISTS idx_applications_listing ON job_applications(listing_id);
  `);

  return db;
}

export function contentHash(company: string, title: string, url: string): string {
  const normalized = `${company.toLowerCase().trim()}|${title.toLowerCase().trim()}|${url.toLowerCase().trim()}`;
  return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}

function rowToListing(row: any): JobListing {
  return {
    id: row.id,
    company: row.company,
    title: row.title,
    url: row.url,
    location: row.location,
    salaryRange: row.salary_range,
    postedDate: row.posted_date,
    description: row.description,
    scoreBreakdown: {
      roleFit: row.role_fit,
      salaryFit: row.salary_fit,
      locationFit: row.location_fit,
      companyFit: row.company_fit,
    },
    totalScore: row.total_score,
    notes: row.notes,
    source: row.source,
    contentHash: row.content_hash,
    discoveredAt: row.discovered_at,
  };
}

function rowToApplication(row: any): JobApplication {
  return {
    id: row.id,
    listingId: row.listing_id,
    status: row.status as ApplicationStatus,
    appliedAt: row.applied_at,
    applyMethod: row.apply_method as ApplyMethod | null,
    followUpDate: row.follow_up_date,
    resumePath: row.resume_path,
    coverLetterPath: row.cover_letter_path,
    screenshotPaths: row.screenshot_paths,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getJobStore() {
  return {
    // ── Listings ──

    insertListing(listing: Omit<JobListing, 'id'>): JobListing | null {
      const d = getDb();
      const id = crypto.randomUUID();
      try {
        d.prepare(
          `INSERT INTO job_listings (id, company, title, url, location, salary_range, posted_date,
            description, role_fit, salary_fit, location_fit, company_fit, total_score, notes, source,
            content_hash, discovered_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          id, listing.company, listing.title, listing.url, listing.location,
          listing.salaryRange, listing.postedDate, listing.description,
          listing.scoreBreakdown.roleFit, listing.scoreBreakdown.salaryFit,
          listing.scoreBreakdown.locationFit, listing.scoreBreakdown.companyFit,
          listing.totalScore, listing.notes, listing.source, listing.contentHash,
          listing.discoveredAt
        );
        return { id, ...listing };
      } catch (err: any) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          logger.debug(`Duplicate listing skipped: ${listing.company} - ${listing.title}`);
          return null;
        }
        throw err;
      }
    },

    getListingByHash(hash: string): JobListing | null {
      const d = getDb();
      const row = d.prepare('SELECT * FROM job_listings WHERE content_hash = ?').get(hash);
      return row ? rowToListing(row) : null;
    },

    getListingsAboveScore(minScore: number): JobListing[] {
      const d = getDb();
      return d
        .prepare('SELECT * FROM job_listings WHERE total_score >= ? ORDER BY total_score DESC')
        .all(minScore)
        .map(rowToListing);
    },

    getAllListings(): JobListing[] {
      const d = getDb();
      return d
        .prepare('SELECT * FROM job_listings ORDER BY total_score DESC')
        .all()
        .map(rowToListing);
    },

    // ── Applications ──

    createApplication(listingId: string): JobApplication {
      const d = getDb();
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      d.prepare(
        `INSERT INTO job_applications (id, listing_id, status, notes, created_at, updated_at)
         VALUES (?, ?, 'identified', '', ?, ?)`
      ).run(id, listingId, now, now);

      return {
        id,
        listingId,
        status: 'identified',
        appliedAt: null,
        applyMethod: null,
        followUpDate: null,
        resumePath: null,
        coverLetterPath: null,
        screenshotPaths: null,
        notes: '',
        createdAt: now,
        updatedAt: now,
      };
    },

    getApplicationByListingId(listingId: string): JobApplication | null {
      const d = getDb();
      const row = d.prepare('SELECT * FROM job_applications WHERE listing_id = ?').get(listingId);
      return row ? rowToApplication(row) : null;
    },

    getApplicationsByStatus(...statuses: ApplicationStatus[]): JobApplication[] {
      const d = getDb();
      const placeholders = statuses.map(() => '?').join(', ');
      return d
        .prepare(`SELECT * FROM job_applications WHERE status IN (${placeholders}) ORDER BY updated_at DESC`)
        .all(...statuses)
        .map(rowToApplication);
    },

    getAllApplications(): JobApplication[] {
      const d = getDb();
      return d
        .prepare('SELECT * FROM job_applications ORDER BY updated_at DESC')
        .all()
        .map(rowToApplication);
    },

    updateApplicationStatus(id: string, status: ApplicationStatus, notes?: string): void {
      const d = getDb();
      const now = new Date().toISOString();
      d.prepare(
        `UPDATE job_applications SET status = ?, updated_at = ?${notes !== undefined ? ', notes = ?' : ''} WHERE id = ?`
      ).run(...(notes !== undefined ? [status, now, notes, id] : [status, now, id]));
    },

    setMaterialsPaths(id: string, resumePath: string, coverLetterPath: string): void {
      const d = getDb();
      const now = new Date().toISOString();
      d.prepare(
        'UPDATE job_applications SET resume_path = ?, cover_letter_path = ?, status = ?, updated_at = ? WHERE id = ?'
      ).run(resumePath, coverLetterPath, 'applying', now, id);
    },

    markApplied(id: string, method: ApplyMethod, screenshotPaths?: string[]): void {
      const d = getDb();
      const now = new Date().toISOString();
      const followUp = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      d.prepare(
        `UPDATE job_applications SET status = 'applied', applied_at = ?, apply_method = ?,
         follow_up_date = ?, screenshot_paths = ?, updated_at = ? WHERE id = ?`
      ).run(now, method, followUp, screenshotPaths ? JSON.stringify(screenshotPaths) : null, now, id);
    },

    markNeedsManualApply(id: string, reason: string): void {
      const d = getDb();
      const now = new Date().toISOString();
      d.prepare(
        `UPDATE job_applications SET status = 'needs_manual_apply', notes = ?, updated_at = ? WHERE id = ?`
      ).run(reason, now, id);
    },

    getTodayAutoApplyCount(): number {
      const d = getDb();
      const today = new Date().toISOString().split('T')[0];
      const row = d.prepare(
        `SELECT COUNT(*) as count FROM job_applications
         WHERE apply_method = 'auto' AND applied_at LIKE ?`
      ).get(`${today}%`) as any;
      return row.count;
    },

    // ── Search Runs ──

    recordSearchRun(query: string, source: string, total: number, newCount: number): void {
      const d = getDb();
      const id = crypto.randomUUID();
      d.prepare(
        `INSERT INTO search_runs (id, search_query, source, total_results, new_results, ran_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(id, query, source, total, newCount, new Date().toISOString());
    },

    getRecentSearchRuns(limit = 10): JobSearchRun[] {
      const d = getDb();
      return d
        .prepare('SELECT * FROM search_runs ORDER BY ran_at DESC LIMIT ?')
        .all(limit)
        .map((row: any) => ({
          id: row.id,
          searchQuery: row.search_query,
          source: row.source,
          totalResults: row.total_results,
          newResults: row.new_results,
          ranAt: row.ran_at,
        }));
    },

    // ── Stats ──

    getStats(): {
      totalListings: number;
      totalApplications: number;
      applied: number;
      autoApplied: number;
      needsManual: number;
      avgScore: number;
    } {
      const d = getDb();
      const totalListings = (d.prepare('SELECT COUNT(*) as c FROM job_listings').get() as any).c;
      const totalApplications = (d.prepare('SELECT COUNT(*) as c FROM job_applications').get() as any).c;
      const applied = (d.prepare("SELECT COUNT(*) as c FROM job_applications WHERE status = 'applied'").get() as any).c;
      const autoApplied = (d.prepare("SELECT COUNT(*) as c FROM job_applications WHERE apply_method = 'auto'").get() as any).c;
      const needsManual = (d.prepare("SELECT COUNT(*) as c FROM job_applications WHERE status = 'needs_manual_apply'").get() as any).c;
      const avgScore = (d.prepare('SELECT AVG(total_score) as avg FROM job_listings').get() as any).avg || 0;

      return { totalListings, totalApplications, applied, autoApplied, needsManual, avgScore: Math.round(avgScore) };
    },
  };
}
