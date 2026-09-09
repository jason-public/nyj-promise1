/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import { Pledge, PledgeVersion, SharedBudget, DiscussionItem, UserRole } from '../src/types/pledge';
import { INITIAL_PLEDGES, INITIAL_SHARED_BUDGETS } from '../src/data/initialPledges';
import { pledgeToMarkdown } from '../src/utils/markdownParser';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'pledge_wiki.db');
const db = new DatabaseSync(DB_PATH);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS pledges (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    version INTEGER NOT NULL,
    markdown TEXT NOT NULL,
    pledge_json TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    updated_by TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS pledge_history (
    id TEXT PRIMARY KEY,
    pledge_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    author TEXT NOT NULL,
    role TEXT NOT NULL,
    reason TEXT NOT NULL,
    method TEXT NOT NULL,
    markdown TEXT NOT NULL,
    diff_summary TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS pdf_uploads (
    id TEXT PRIMARY KEY,
    file_name TEXT NOT NULL,
    file_hash TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    version_label TEXT NOT NULL,
    uploaded_at TEXT NOT NULL,
    extracted_count INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS discussions (
    id TEXT PRIMARY KEY,
    pledge_id TEXT NOT NULL,
    author TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    is_internal_memo INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS shared_budgets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    total_million REAL NOT NULL,
    total_billion REAL NOT NULL,
    participating_codes TEXT NOT NULL,
    description TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Seed initial data if empty
const countQuery = db.prepare('SELECT COUNT(*) as count FROM pledges');
const result = countQuery.get() as { count: number };

if (result.count === 0) {
  console.log('Seeding initial 7 pledges and shared budgets into SQLite database...');

  const insertPledge = db.prepare(`
    INSERT INTO pledges (id, code, title, version, markdown, pledge_json, updated_at, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertHistory = db.prepare(`
    INSERT INTO pledge_history (id, pledge_id, version, author, role, reason, method, markdown, diff_summary, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  INITIAL_PLEDGES.forEach((p) => {
    const md = pledgeToMarkdown(p);
    const jsonStr = JSON.stringify(p);
    insertPledge.run(p.id, p.code, p.title, p.version, md, jsonStr, p.updatedAt, p.updatedBy);

    insertHistory.run(
      `hist-${p.id}-v1`,
      p.id,
      p.version,
      p.updatedBy,
      'admin',
      '샘플 PDF (22쪽) 초기 데이터 추출 및 기준본 등록',
      'PDF_UPDATE',
      md,
      '최초 등록: 22쪽 원본 자료 기반 공약사항 생성',
      p.updatedAt,
    );
  });

  const insertShared = db.prepare(`
    INSERT INTO shared_budgets (id, name, total_million, total_billion, participating_codes, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  INITIAL_SHARED_BUDGETS.forEach((sb) => {
    insertShared.run(
      sb.id,
      sb.name,
      sb.totalBudgetMillion,
      sb.totalBudgetBillion,
      JSON.stringify(sb.participatingPledgeCodes),
      sb.description,
    );
  });

  const insertUpload = db.prepare(`
    INSERT INTO pdf_uploads (id, file_name, file_hash, file_size, version_label, uploaded_at, extracted_count)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertUpload.run(
    'upload-sample-pdf-v1',
    '샘플.pdf',
    'sha256-e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    4512900,
    'v1.0 (샘플)',
    '2026-08-30 09:00:00',
    7,
  );

  console.log('Database seeded successfully!');
}

export const PledgeDb = {
  getAll(): Pledge[] {
    const stmt = db.prepare('SELECT pledge_json FROM pledges ORDER BY code ASC');
    const rows = stmt.all() as { pledge_json: string }[];
    return rows.map((r) => JSON.parse(r.pledge_json));
  },

  getByCodeOrId(codeOrId: string): Pledge | null {
    const stmt = db.prepare('SELECT pledge_json FROM pledges WHERE id = ? OR code = ? LIMIT 1');
    const row = stmt.get(codeOrId, codeOrId) as { pledge_json: string } | undefined;
    return row ? JSON.parse(row.pledge_json) : null;
  },

  getMarkdown(codeOrId: string): string | null {
    const stmt = db.prepare('SELECT markdown FROM pledges WHERE id = ? OR code = ? LIMIT 1');
    const row = stmt.get(codeOrId, codeOrId) as { markdown: string } | undefined;
    return row ? row.markdown : null;
  },

  savePledge(
    pledge: Pledge,
    author: string,
    role: UserRole,
    reason: string,
    method: 'MANUAL_EDIT' | 'PDF_UPDATE' | 'VERSION_RESTORE' | 'MARKDOWN_IMPORT',
    expectedVersion?: number,
  ): { success: boolean; pledge?: Pledge; error?: string } {
    // Check existing
    const existingStmt = db.prepare('SELECT version, pledge_json FROM pledges WHERE id = ?');
    const existing = existingStmt.get(pledge.id) as { version: number; pledge_json: string } | undefined;

    if (existing) {
      if (expectedVersion !== undefined && existing.version !== expectedVersion) {
        return {
          success: false,
          error: `동시 편집 충돌: 현재 문서 버전(v${existing.version})이 수정하려는 버전(v${expectedVersion})과 다릅니다. 최신 내용을 다시 확인해주세요.`,
        };
      }
      pledge.version = existing.version + 1;
    } else {
      pledge.version = 1;
    }

    pledge.updatedAt = new Date().toISOString().replace('T', ' ').slice(0, 19);
    pledge.updatedBy = `${author} (${role})`;

    const markdown = pledgeToMarkdown(pledge);
    const jsonStr = JSON.stringify(pledge);

    if (existing) {
      const updateStmt = db.prepare(`
        UPDATE pledges
        SET code = ?, title = ?, version = ?, markdown = ?, pledge_json = ?, updated_at = ?, updated_by = ?
        WHERE id = ?
      `);
      updateStmt.run(pledge.code, pledge.title, pledge.version, markdown, jsonStr, pledge.updatedAt, pledge.updatedBy, pledge.id);
    } else {
      const insertStmt = db.prepare(`
        INSERT INTO pledges (id, code, title, version, markdown, pledge_json, updated_at, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insertStmt.run(pledge.id, pledge.code, pledge.title, pledge.version, markdown, jsonStr, pledge.updatedAt, pledge.updatedBy);
    }

    // Save history revision
    const historyStmt = db.prepare(`
      INSERT INTO pledge_history (id, pledge_id, version, author, role, reason, method, markdown, diff_summary, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    historyStmt.run(
      `hist-${pledge.id}-v${pledge.version}-${Date.now()}`,
      pledge.id,
      pledge.version,
      author,
      role,
      reason || (method === 'PDF_UPDATE' ? 'PDF 재업로드 3방향 병합 반영' : '공약사항 수정'),
      method,
      markdown,
      reason,
      pledge.updatedAt,
    );

    return { success: true, pledge };
  },

  getHistory(pledgeId: string): PledgeVersion[] {
    const stmt = db.prepare(`
      SELECT id, pledge_id as pledgeId, version, author, role, reason, method, markdown as snapshotMarkdown, diff_summary as diffSummary, created_at as createdAt
      FROM pledge_history
      WHERE pledge_id = ?
      ORDER BY version DESC
    `);
    const rows = stmt.all(pledgeId) as any[];
    return rows;
  },

  restoreVersion(
    codeOrId: string,
    targetVersion: number,
    author: string,
    role: UserRole,
  ): { success: boolean; pledge?: Pledge; error?: string } {
    const current = this.getByCodeOrId(codeOrId);
    if (!current) return { success: false, error: '해당 공약을 찾을 수 없습니다.' };

    const histStmt = db.prepare('SELECT markdown FROM pledge_history WHERE pledge_id = ? AND version = ? LIMIT 1');
    const histRow = histStmt.get(current.id, targetVersion) as { markdown: string } | undefined;
    if (!histRow) return { success: false, error: `버전 v${targetVersion}의 이력을 찾을 수 없습니다.` };

    // Reconstruct pledge from target markdown
    const { markdownToPledge } = require('../src/utils/markdownParser');
    const { pledge: restoredPledge } = markdownToPledge(histRow.markdown, current);

    restoredPledge.id = current.id;
    restoredPledge.code = current.code;

    return this.savePledge(
      restoredPledge,
      author,
      role,
      `이전 버전 v${targetVersion} 복원`,
      'VERSION_RESTORE',
      current.version,
    );
  },

  getDiscussions(pledgeId: string): DiscussionItem[] {
    const stmt = db.prepare('SELECT * FROM discussions WHERE pledge_id = ? ORDER BY created_at ASC');
    const rows = stmt.all(pledgeId) as any[];
    return rows.map((r) => ({
      id: r.id,
      author: r.author,
      role: r.role as UserRole,
      content: r.content,
      createdAt: r.created_at,
      isInternalMemo: Boolean(r.is_internal_memo),
    }));
  },

  addDiscussion(
    pledgeId: string,
    author: string,
    role: UserRole,
    content: string,
    isInternalMemo: boolean = false,
  ): DiscussionItem {
    const item: DiscussionItem = {
      id: `disc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      author,
      role,
      content,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      isInternalMemo,
    };
    const stmt = db.prepare(`
      INSERT INTO discussions (id, pledge_id, author, role, content, is_internal_memo, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(item.id, pledgeId, item.author, item.role, item.content, item.isInternalMemo ? 1 : 0, item.createdAt);
    return item;
  },

  getSharedBudgets(): SharedBudget[] {
    const stmt = db.prepare('SELECT * FROM shared_budgets');
    const rows = stmt.all() as any[];
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      totalBudgetMillion: r.total_million,
      totalBudgetBillion: r.total_billion,
      participatingPledgeCodes: JSON.parse(r.participating_codes),
      description: r.description,
    }));
  },

  getPdfUploads() {
    const stmt = db.prepare('SELECT * FROM pdf_uploads ORDER BY uploaded_at DESC');
    return stmt.all();
  },

  recordPdfUpload(fileName: string, fileHash: string, fileSize: number, versionLabel: string, extractedCount: number) {
    const existing = db.prepare('SELECT * FROM pdf_uploads WHERE file_hash = ?').get(fileHash) as any;
    if (existing) {
      return { isDuplicate: true, record: existing };
    }
    const id = `upload-${Date.now()}`;
    const uploadedAt = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const stmt = db.prepare(`
      INSERT INTO pdf_uploads (id, file_name, file_hash, file_size, version_label, uploaded_at, extracted_count)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, fileName, fileHash, fileSize, versionLabel, uploadedAt, extractedCount);
    return { isDuplicate: false, record: { id, fileName, fileHash, uploadedAt, extractedCount } };
  },

  /**
   * Accurate dashboard statistics calculation according to Section 3:
   * - Deduplicated total budget with shared items (Line 9 counted once)
   * - Separation of local municipality burden (남양주시 분담금) vs national total
   * - Distinction between 'termGoalAchieved' vs 'finalGoalAchieved'
   * - Undetermined budgets (4-06) not included in total
   * - Non-apportioned budgets (4-04, 4-05) properly marked
   */
  getDashboardStats() {
    const pledges = this.getAll();
    const sharedBudgets = this.getSharedBudgets();

    const totalPledges = pledges.length;
    const termGoalAchievedCount = pledges.filter((p) => p.termGoalAchieved).length;
    const finalGoalAchievedCount = pledges.filter((p) => p.finalGoalAchieved).length;
    const needsReviewCount = pledges.filter((p) => p.needsReview).length;

    // Deduplicated total budget calculation (억원 단위)
    // 1. First add shared budgets (e.g. Line 9: 2933.4억원)
    let deduplicatedTotalBillion = 0;
    const handledSharedIds = new Set<string>();

    sharedBudgets.forEach((sb) => {
      deduplicatedTotalBillion += sb.totalBudgetBillion;
      handledSharedIds.add(sb.id);
    });

    let localBurdenBillion = 0;
    let undeterminedCount = 0;
    let unapportionedCount = 0;

    pledges.forEach((p) => {
      if (p.budgetInfo.isUndetermined) {
        undeterminedCount++;
      } else if (p.budgetInfo.sharedBudgetId && handledSharedIds.has(p.budgetInfo.sharedBudgetId)) {
        // Already accounted for via shared budgets
      } else {
        deduplicatedTotalBillion += p.budgetInfo.normalizedKrwBillion;
      }

      if (p.budgetInfo.isUnapportioned) {
        unapportionedCount++;
      }

      if (p.budgetInfo.localBurdenBillion) {
        localBurdenBillion += p.budgetInfo.localBurdenBillion;
      }
    });

    // Business stage breakdown
    const stageBreakdown: Record<string, number> = {};
    pledges.forEach((p) => {
      stageBreakdown[p.stage] = (stageBreakdown[p.stage] || 0) + 1;
    });

    // Schedule status breakdown
    const scheduleBreakdown: Record<string, number> = {};
    pledges.forEach((p) => {
      scheduleBreakdown[p.scheduleStatus] = (scheduleBreakdown[p.scheduleStatus] || 0) + 1;
    });

    return {
      totalPledges,
      termGoalAchievedCount,
      finalGoalAchievedCount,
      needsReviewCount,
      deduplicatedTotalBillion: Math.round(deduplicatedTotalBillion * 10) / 10,
      localBurdenBillion: Math.round(localBurdenBillion * 10) / 10,
      undeterminedCount,
      unapportionedCount,
      sharedBudgetsCount: sharedBudgets.length,
      stageBreakdown,
      scheduleBreakdown,
    };
  },
};
