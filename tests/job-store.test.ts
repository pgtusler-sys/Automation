import Database from 'better-sqlite3';
import { contentHash } from '../src/jobs/job-store';

// We test contentHash standalone (doesn't need DB) and use an in-memory
// DB to verify the schema is correct.

describe('contentHash', () => {
  it('should produce consistent hashes', () => {
    const h1 = contentHash('Acme Corp', 'RevOps Manager', 'https://acme.com/jobs/1');
    const h2 = contentHash('Acme Corp', 'RevOps Manager', 'https://acme.com/jobs/1');
    expect(h1).toBe(h2);
  });

  it('should normalize case', () => {
    const h1 = contentHash('ACME CORP', 'RevOps Manager', 'https://acme.com/jobs/1');
    const h2 = contentHash('acme corp', 'revops manager', 'https://acme.com/jobs/1');
    expect(h1).toBe(h2);
  });

  it('should produce different hashes for different inputs', () => {
    const h1 = contentHash('Acme Corp', 'RevOps Manager', 'https://acme.com/jobs/1');
    const h2 = contentHash('Acme Corp', 'Sales Manager', 'https://acme.com/jobs/2');
    expect(h1).not.toBe(h2);
  });

  it('should return a 16-char hex string', () => {
    const h = contentHash('Test', 'Test', 'https://test.com');
    expect(h).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe('job_listings schema', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(`
      CREATE TABLE job_listings (
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
    `);
  });

  afterEach(() => {
    db.close();
  });

  it('should insert and retrieve a listing', () => {
    db.prepare(
      `INSERT INTO job_listings (id, company, title, url, description, content_hash, discovered_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run('test-1', 'Acme', 'RevOps', 'https://acme.com', 'desc', 'hash123', '2026-04-14');

    const row = db.prepare('SELECT * FROM job_listings WHERE id = ?').get('test-1') as any;
    expect(row.company).toBe('Acme');
    expect(row.total_score).toBe(0);
  });

  it('should enforce unique content_hash', () => {
    db.prepare(
      `INSERT INTO job_listings (id, company, title, url, content_hash, discovered_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run('1', 'Acme', 'RevOps', 'url', 'samehash', '2026-04-14');

    expect(() => {
      db.prepare(
        `INSERT INTO job_listings (id, company, title, url, content_hash, discovered_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run('2', 'Acme', 'RevOps', 'url', 'samehash', '2026-04-14');
    }).toThrow();
  });
});

describe('job_applications schema', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(`
      CREATE TABLE job_listings (
        id TEXT PRIMARY KEY,
        company TEXT NOT NULL,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        content_hash TEXT NOT NULL UNIQUE,
        discovered_at TEXT NOT NULL
      );
      CREATE TABLE job_applications (
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
    `);
  });

  afterEach(() => {
    db.close();
  });

  it('should insert an application linked to a listing', () => {
    db.prepare(
      `INSERT INTO job_listings (id, company, title, url, content_hash, discovered_at) VALUES (?, ?, ?, ?, ?, ?)`
    ).run('listing-1', 'Acme', 'RevOps', 'url', 'hash1', '2026-04-14');

    db.prepare(
      `INSERT INTO job_applications (id, listing_id, status, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`
    ).run('app-1', 'listing-1', 'identified', '', '2026-04-14', '2026-04-14');

    const row = db.prepare('SELECT * FROM job_applications WHERE id = ?').get('app-1') as any;
    expect(row.listing_id).toBe('listing-1');
    expect(row.status).toBe('identified');
  });

  it('should update status', () => {
    db.prepare(
      `INSERT INTO job_listings (id, company, title, url, content_hash, discovered_at) VALUES (?, ?, ?, ?, ?, ?)`
    ).run('listing-1', 'Acme', 'RevOps', 'url', 'hash1', '2026-04-14');

    db.prepare(
      `INSERT INTO job_applications (id, listing_id, status, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`
    ).run('app-1', 'listing-1', 'identified', '', '2026-04-14', '2026-04-14');

    db.prepare('UPDATE job_applications SET status = ?, applied_at = ? WHERE id = ?').run(
      'applied',
      '2026-04-14T10:00:00Z',
      'app-1'
    );

    const row = db.prepare('SELECT * FROM job_applications WHERE id = ?').get('app-1') as any;
    expect(row.status).toBe('applied');
    expect(row.applied_at).toBe('2026-04-14T10:00:00Z');
  });
});
