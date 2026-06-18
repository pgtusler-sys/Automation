import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { DraftFeedback, StylePreference } from '../shared/types';

const DB_PATH = path.join(__dirname, '../../data/feedback.db');

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) return db;

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  db = new Database(DB_PATH);

  db.exec(`
    CREATE TABLE IF NOT EXISTS draft_feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email_id TEXT NOT NULL,
      draft_id TEXT NOT NULL UNIQUE,
      generated_text TEXT NOT NULL,
      final_text TEXT,
      action TEXT NOT NULL DEFAULT 'pending',
      edit_distance REAL,
      email_category TEXT,
      created_at TEXT NOT NULL,
      resolved_at TEXT
    );

    CREATE TABLE IF NOT EXISTS style_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rule TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'inferred',
      confidence REAL NOT NULL DEFAULT 0.5,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_feedback_action ON draft_feedback(action);
    CREATE INDEX IF NOT EXISTS idx_feedback_draft_id ON draft_feedback(draft_id);
  `);

  return db;
}

export function getFeedbackStore() {
  return {
    recordDraft(feedback: Omit<DraftFeedback, 'id'>): void {
      const d = getDb();
      d.prepare(
        `INSERT INTO draft_feedback (email_id, draft_id, generated_text, action, created_at)
         VALUES (?, ?, ?, 'pending', ?)`
      ).run(feedback.emailId, feedback.draftId, feedback.generatedText, feedback.createdAt);
    },

    getPendingFeedback(): DraftFeedback[] {
      const d = getDb();
      return d
        .prepare(`SELECT * FROM draft_feedback WHERE action = 'pending'`)
        .all() as DraftFeedback[];
    },

    getEditedFeedback(limit = 50): DraftFeedback[] {
      const d = getDb();
      return d
        .prepare(
          `SELECT * FROM draft_feedback WHERE action = 'sent_edited' ORDER BY resolved_at DESC LIMIT ?`
        )
        .all(limit) as DraftFeedback[];
    },

    updateFeedback(
      draftId: string,
      updates: Partial<DraftFeedback>
    ): void {
      const d = getDb();
      const fields: string[] = [];
      const values: any[] = [];

      if (updates.action !== undefined) {
        fields.push('action = ?');
        values.push(updates.action);
      }
      if (updates.finalText !== undefined) {
        fields.push('final_text = ?');
        values.push(updates.finalText);
      }
      if (updates.editDistance !== undefined) {
        fields.push('edit_distance = ?');
        values.push(updates.editDistance);
      }
      if (updates.resolvedAt !== undefined) {
        fields.push('resolved_at = ?');
        values.push(updates.resolvedAt);
      }
      if (updates.emailCategory !== undefined) {
        fields.push('email_category = ?');
        values.push(updates.emailCategory);
      }

      if (fields.length === 0) return;

      values.push(draftId);
      d.prepare(`UPDATE draft_feedback SET ${fields.join(', ')} WHERE draft_id = ?`).run(
        ...values
      );
    },

    getStylePreferences(): StylePreference[] {
      const d = getDb();
      return d
        .prepare(`SELECT * FROM style_preferences ORDER BY confidence DESC`)
        .all() as StylePreference[];
    },

    saveStylePreferences(preferences: StylePreference[]): void {
      const d = getDb();
      const insert = d.prepare(
        `INSERT INTO style_preferences (rule, source, confidence, created_at) VALUES (?, ?, ?, ?)`
      );

      const transaction = d.transaction((prefs: StylePreference[]) => {
        // Clear old inferred preferences
        d.prepare(`DELETE FROM style_preferences WHERE source = 'inferred'`).run();
        for (const pref of prefs) {
          insert.run(pref.rule, pref.source, pref.confidence, pref.createdAt);
        }
      });

      transaction(preferences);
    },

    getMetrics(): {
      total: number;
      sentAsIs: number;
      sentEdited: number;
      deleted: number;
      pending: number;
      avgEditDistance: number;
    } {
      const d = getDb();
      const total = (d.prepare(`SELECT COUNT(*) as c FROM draft_feedback`).get() as any).c;
      const sentAsIs = (
        d.prepare(`SELECT COUNT(*) as c FROM draft_feedback WHERE action = 'sent_as_is'`).get() as any
      ).c;
      const sentEdited = (
        d.prepare(`SELECT COUNT(*) as c FROM draft_feedback WHERE action = 'sent_edited'`).get() as any
      ).c;
      const deleted = (
        d.prepare(`SELECT COUNT(*) as c FROM draft_feedback WHERE action = 'deleted'`).get() as any
      ).c;
      const pending = (
        d.prepare(`SELECT COUNT(*) as c FROM draft_feedback WHERE action = 'pending'`).get() as any
      ).c;
      const avgEdit = (
        d
          .prepare(
            `SELECT AVG(edit_distance) as avg FROM draft_feedback WHERE edit_distance IS NOT NULL`
          )
          .get() as any
      ).avg;

      return {
        total,
        sentAsIs,
        sentEdited,
        deleted,
        pending,
        avgEditDistance: avgEdit || 0,
      };
    },
  };
}
