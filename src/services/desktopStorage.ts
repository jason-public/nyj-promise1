/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Pledge,
  PledgeVersion,
  DiscussionItem,
  SharedBudget,
  DashboardStats,
  PledgeMergeDiff,
  UserRole,
} from '../types/pledge';
import { INITIAL_PLEDGES, INITIAL_SHARED_BUDGETS } from '../data/initialPledges';
import { pledgeToMarkdown, markdownToPledge } from '../utils/markdownParser';

const STORAGE_KEYS = {
  PLEDGES: 'pledge_wiki_desktop_pledges',
  HISTORY: 'pledge_wiki_desktop_history',
  DISCUSSIONS: 'pledge_wiki_desktop_discussions',
  SHARED_BUDGETS: 'pledge_wiki_desktop_shared_budgets',
  LAST_SAVED: 'pledge_wiki_desktop_last_saved',
};

// Safe storage adapter to guard against SecurityError, restricted iframes, private browsing, and missing localStorage
class SafeStorage {
  private static memStore: Record<string, string> = {};

  public static getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val !== null) return val;
      }
    } catch {
      // localStorage restricted or unavailable
    }
    return this.memStore[key] || null;
  }

  public static setItem(key: string, value: string): void {
    this.memStore[key] = value;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // localStorage restricted or quota exceeded
    }
  }

  public static removeItem(key: string): void {
    delete this.memStore[key];
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // ignore
    }
  }
}

export interface LocalBackupPayload {
  version: string;
  exportedAt: string;
  pledges: Pledge[];
  history: PledgeVersion[];
  discussions: DiscussionItem[];
  sharedBudgets: SharedBudget[];
}

export class DesktopStorageService {
  private static isInitialized = false;

  /**
   * Initialize local storage with default seed data if not already present
   */
  public static init(): void {
    if (this.isInitialized) return;

    try {
      const existing = SafeStorage.getItem(STORAGE_KEYS.PLEDGES);
      if (!existing) {
        // First run in desktop mode: seed initial pledges
        this.savePledges(INITIAL_PLEDGES);
        this.saveSharedBudgets(INITIAL_SHARED_BUDGETS);

        // Seed initial v1 history for all pledges
        const initialHistory: PledgeVersion[] = INITIAL_PLEDGES.map((p) => ({
          id: `ver-${p.code}-v1`,
          pledgeId: p.id,
          version: 1,
          createdAt: p.updatedAt || '2026-08-30 09:00:00',
          author: p.updatedBy || '관리자(샘플.pdf 추출)',
          role: 'admin',
          reason: '샘플.pdf 추출 기준 초기 공약사항 등록',
          method: 'PDF_UPDATE',
          snapshotMarkdown: pledgeToMarkdown(p),
          snapshotPledge: p,
          diffSummary: '최초 등록',
        }));
        this.saveHistory(initialHistory);

        // Seed initial discussions
        const initialDiscussions: DiscussionItem[] = [
          {
            id: 'disc-1',
            pledgeCode: '4-01',
            author: '교통정책과',
            role: 'editor',
            content: 'LH 광역교통개선대책 사업비 분담 협의 중이며 정거장 위치는 기본계획 승인 시 확정 예정입니다.',
            createdAt: '2026-08-30 14:00',
            isInternalMemo: false,
          },
          {
            id: 'disc-2',
            pledgeCode: '4-03',
            author: '철도기획팀',
            role: 'admin',
            content: '재정구간(1~4공구)과 민자구간(5~8공구) 공정률 관리 철저 요망 (2·5공구 유찰 후 수의계약 진행 추이 점검).',
            createdAt: '2026-08-31 10:30',
            isInternalMemo: true,
          },
        ];
        this.saveDiscussions(initialDiscussions);
      }
      this.isInitialized = true;
    } catch (e) {
      console.warn('Desktop storage initialization warning:', e);
    }
  }

  // --- Core Getters ---

  public static getPledges(): Pledge[] {
    this.init();
    try {
      const json = SafeStorage.getItem(STORAGE_KEYS.PLEDGES);
      if (!json) return INITIAL_PLEDGES;
      return JSON.parse(json);
    } catch {
      return INITIAL_PLEDGES;
    }
  }

  public static getPledge(code: string): Pledge | null {
    const list = this.getPledges();
    return list.find((p) => p.code === code || p.id === code) || null;
  }

  public static getSharedBudgets(): SharedBudget[] {
    this.init();
    try {
      const json = SafeStorage.getItem(STORAGE_KEYS.SHARED_BUDGETS);
      if (!json) return INITIAL_SHARED_BUDGETS;
      return JSON.parse(json);
    } catch {
      return INITIAL_SHARED_BUDGETS;
    }
  }

  public static getHistory(pledgeCode: string): PledgeVersion[] {
    this.init();
    try {
      const json = SafeStorage.getItem(STORAGE_KEYS.HISTORY);
      const all: PledgeVersion[] = json ? JSON.parse(json) : [];
      const target = this.getPledge(pledgeCode);
      if (!target) return [];
      return all
        .filter((h) => h.pledgeId === target.id || h.snapshotPledge?.code === pledgeCode)
        .sort((a, b) => b.version - a.version);
    } catch {
      return [];
    }
  }

  public static getAllHistory(): (PledgeVersion & { pledgeTitle?: string; pledgeCode?: string })[] {
    this.init();
    try {
      const json = SafeStorage.getItem(STORAGE_KEYS.HISTORY);
      const all: PledgeVersion[] = json ? JSON.parse(json) : [];
      const pledges = this.getPledges();
      const pledgeMap = new Map<string, Pledge>();
      pledges.forEach((p) => pledgeMap.set(p.id, p));

      return all
        .map((h) => {
          const p = pledgeMap.get(h.pledgeId) || h.snapshotPledge;
          return {
            ...h,
            pledgeTitle: p?.title || '공약',
            pledgeCode: p?.code || '알수없음',
          };
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch {
      return [];
    }
  }

  public static getDiscussions(pledgeCode: string): DiscussionItem[] {
    this.init();
    try {
      const json = SafeStorage.getItem(STORAGE_KEYS.DISCUSSIONS);
      const all: DiscussionItem[] = json ? JSON.parse(json) : [];
      return all
        .filter((d) => d.pledgeCode === pledgeCode)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch {
      return [];
    }
  }

  // --- CRUD Operations ---

  public static savePledge(
    updatedPledge: Pledge,
    reason: string,
    author: string,
    role: UserRole,
  ): Pledge {
    this.init();
    const pledges = this.getPledges();
    const index = pledges.findIndex((p) => p.code === updatedPledge.code);

    const newVersion = (updatedPledge.version || 1) + 1;
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const savedPledge: Pledge = {
      ...updatedPledge,
      version: newVersion,
      updatedAt: now,
      updatedBy: author,
    };

    if (index >= 0) {
      pledges[index] = savedPledge;
    } else {
      pledges.push(savedPledge);
    }

    this.savePledges(pledges);

    // Record revision in history
    const historyList = this.getRawHistory();
    historyList.unshift({
      id: `ver-${savedPledge.code}-v${newVersion}-${Date.now()}`,
      pledgeId: savedPledge.id,
      version: newVersion,
      createdAt: now,
      author,
      role,
      reason: reason || '공약사항 수정',
      method: 'MANUAL_EDIT',
      snapshotMarkdown: pledgeToMarkdown(savedPledge),
      snapshotPledge: savedPledge,
      diffSummary: reason,
    });
    this.saveHistory(historyList);

    this.recordLastSaved();
    return savedPledge;
  }

  public static createPledge(
    newPledge: Pledge,
    reason: string,
    author: string,
    role: UserRole,
  ): Pledge {
    this.init();
    const pledges = this.getPledges();
    const existingIndex = pledges.findIndex((p) => p.code === newPledge.code);
    if (existingIndex >= 0) {
      throw new Error(`이미 존재하는 관리번호(${newPledge.code})입니다.`);
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const created: Pledge = {
      ...newPledge,
      version: 1,
      updatedAt: now,
      updatedBy: author,
    };

    pledges.push(created);
    this.savePledges(pledges);

    const historyList = this.getRawHistory();
    historyList.unshift({
      id: `ver-${created.code}-v1-${Date.now()}`,
      pledgeId: created.id,
      version: 1,
      createdAt: now,
      author,
      role,
      reason: reason || '신규 공약사항 등록',
      method: 'MANUAL_EDIT',
      snapshotMarkdown: pledgeToMarkdown(created),
      snapshotPledge: created,
      diffSummary: '신규 등록',
    });
    this.saveHistory(historyList);

    this.recordLastSaved();
    return created;
  }

  public static restoreVersion(
    code: string,
    targetVersion: number,
    author: string,
    role: UserRole,
  ): Pledge {
    this.init();
    const pledge = this.getPledge(code);
    if (!pledge) throw new Error('공약을 찾을 수 없습니다.');

    const history = this.getHistory(code);
    const targetItem = history.find((h) => h.version === targetVersion);
    if (!targetItem) throw new Error(`버전 v${targetVersion}을 찾을 수 없습니다.`);

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const newVersion = pledge.version + 1;

    const restored: Pledge = {
      ...targetItem.snapshotPledge,
      version: newVersion,
      updatedAt: now,
      updatedBy: author,
    };

    const pledges = this.getPledges();
    const idx = pledges.findIndex((p) => p.code === code);
    if (idx >= 0) {
      pledges[idx] = restored;
      this.savePledges(pledges);
    }

    const allHistory = this.getRawHistory();
    allHistory.unshift({
      id: `ver-${restored.code}-v${newVersion}-${Date.now()}`,
      pledgeId: restored.id,
      version: newVersion,
      createdAt: now,
      author,
      role,
      reason: `버전 v${targetVersion} 시점의 내용으로 안전 복원`,
      method: 'VERSION_RESTORE',
      snapshotMarkdown: pledgeToMarkdown(restored),
      snapshotPledge: restored,
      diffSummary: `v${targetVersion}으로 복원`,
    });
    this.saveHistory(allHistory);

    this.recordLastSaved();
    return restored;
  }

  public static applyMerge(
    diffResults: PledgeMergeDiff[],
    pdfFileName: string,
    author: string,
    role: UserRole,
  ): Pledge[] {
    this.init();
    const pledges = this.getPledges();
    const updatedList: Pledge[] = [];
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    for (const diff of diffResults) {
      if (!diff.selectedForMerge) continue;

      const current = pledges.find((p) => p.code === diff.pledgeCode);
      if (!current) continue;

      const newVersion = current.version + 1;
      const mergedPledge: Pledge = { ...current };

      // Apply field-level decisions
      for (const fd of diff.fieldDiffs) {
        if (fd.decision === 'use_incoming') {
          // Update the selected field
          if (fd.fieldPath === 'period') mergedPledge.period = fd.incomingValue;
          else if (fd.fieldPath === 'stage') mergedPledge.stage = fd.incomingValue;
          else if (fd.fieldPath === 'scheduleStatus') mergedPledge.scheduleStatus = fd.incomingValue;
          else if (fd.fieldPath === 'finalGoal') mergedPledge.finalGoal = fd.incomingValue;
          else if (fd.fieldPath === 'termGoal') mergedPledge.termGoal = fd.incomingValue;
          else if (fd.fieldPath === 'leadAgency') mergedPledge.leadAgency = fd.incomingValue;
          else if (fd.fieldPath === 'department') mergedPledge.department = fd.incomingValue;
          else if (fd.fieldPath === 'overview.section') mergedPledge.overview.section = fd.incomingValue;
          else if (fd.fieldPath === 'overview.scope') mergedPledge.overview.scope = fd.incomingValue;
          else if (fd.fieldPath === 'overview.totalBudgetText') mergedPledge.overview.totalBudgetText = fd.incomingValue;
          else if (fd.fieldPath === 'yearlyPlans') mergedPledge.yearlyPlans = fd.incomingValue;
          else if (fd.fieldPath === 'milestones') mergedPledge.milestones = fd.incomingValue;
          else if (fd.fieldPath === 'futurePlans') mergedPledge.futurePlans = fd.incomingValue;
        }
      }

      mergedPledge.version = newVersion;
      mergedPledge.updatedAt = now;
      mergedPledge.updatedBy = `${author} (PDF 3방향 병합: ${pdfFileName})`;

      const idx = pledges.findIndex((p) => p.code === mergedPledge.code);
      if (idx >= 0) pledges[idx] = mergedPledge;
      updatedList.push(mergedPledge);

      // Record in history
      const allHistory = this.getRawHistory();
      allHistory.unshift({
        id: `ver-${mergedPledge.code}-v${newVersion}-${Date.now()}`,
        pledgeId: mergedPledge.id,
        version: newVersion,
        createdAt: now,
        author,
        role,
        reason: `PDF 재업로드 3방향 병합 갱신 (${pdfFileName})`,
        method: 'PDF_UPDATE',
        snapshotMarkdown: pledgeToMarkdown(mergedPledge),
        snapshotPledge: mergedPledge,
        diffSummary: `PDF 병합 (갱신 ${diff.autoUpdateCount}건 반영)`,
      });
      this.saveHistory(allHistory);
    }

    this.savePledges(pledges);
    this.recordLastSaved();
    return updatedList;
  }

  public static addDiscussion(
    pledgeCode: string,
    author: string,
    role: UserRole,
    content: string,
    isInternalMemo: boolean,
  ): DiscussionItem {
    this.init();
    const newItem: DiscussionItem = {
      id: `disc-${Date.now()}`,
      pledgeCode,
      author,
      role,
      content,
      isInternalMemo,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    };

    const discussions = this.getRawDiscussions();
    discussions.unshift(newItem);
    this.saveDiscussions(discussions);
    this.recordLastSaved();
    return newItem;
  }

  // --- Statistics Calculation (Offline / Desktop) ---

  public static getDashboardStats(): DashboardStats {
    const pledges = this.getPledges();
    const sharedBudgets = this.getSharedBudgets();

    let deduplicatedTotalBillion = 0;
    sharedBudgets.forEach((sb) => {
      deduplicatedTotalBillion += sb.totalBudgetBillion;
    });

    let localBurdenBillion = 0;
    const stageCounts: Record<string, number> = {};

    pledges.forEach((p) => {
      if (!p.budgetInfo.isUndetermined && !p.budgetInfo.sharedBudgetId) {
        deduplicatedTotalBillion += p.budgetInfo.normalizedKrwBillion;
      }
      if (p.budgetInfo.localBurdenBillion) {
        localBurdenBillion += p.budgetInfo.localBurdenBillion;
      }
      stageCounts[p.stage] = (stageCounts[p.stage] || 0) + 1;
    });

    return {
      totalCount: pledges.length,
      termAchievedCount: pledges.filter((p) => p.termGoalAchieved).length,
      finalAchievedCount: pledges.filter((p) => p.finalGoalAchieved).length,
      reviewNeededCount: pledges.filter((p) => p.needsReview).length,
      totalBudgetBillion: Math.round(deduplicatedTotalBillion * 10) / 10,
      stageCounts,
      deduplicationRuleApplied: true,
    };
  }

  // --- Desktop File Export / Import Helpers ---

  /**
   * Export all local data to a single JSON backup file on user's desktop
   */
  public static exportToJsonFile(): void {
    const payload: LocalBackupPayload = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      pledges: this.getPledges(),
      history: this.getRawHistory(),
      discussions: this.getRawDiscussions(),
      sharedBudgets: this.getSharedBudgets(),
    };

    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const filename = `공약위키_데스크톱백업_${new Date().toISOString().slice(0, 10)}.json`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Import data from a local JSON backup file
   */
  public static importFromJsonString(jsonString: string): { success: boolean; count: number; error?: string } {
    try {
      const payload: LocalBackupPayload = JSON.parse(jsonString);
      if (!payload.pledges || !Array.isArray(payload.pledges)) {
        return { success: false, count: 0, error: '유효한 공약위키 백업 파일 형식이 아닙니다.' };
      }

      this.savePledges(payload.pledges);
      if (Array.isArray(payload.history)) this.saveHistory(payload.history);
      if (Array.isArray(payload.discussions)) this.saveDiscussions(payload.discussions);
      if (Array.isArray(payload.sharedBudgets)) this.saveSharedBudgets(payload.sharedBudgets);

      this.recordLastSaved();
      return { success: true, count: payload.pledges.length };
    } catch (err: any) {
      return { success: false, count: 0, error: err.message || 'JSON 파싱 오류' };
    }
  }

  /**
   * Import single Markdown file into desktop storage
   */
  public static importMarkdown(markdownText: string, author: string, role: UserRole): Pledge {
    const { pledge, errors } = markdownToPledge(markdownText);
    if (errors.length > 0) {
      throw new Error(errors.join('\n'));
    }

    const pledges = this.getPledges();
    const existingIndex = pledges.findIndex((p) => p.code === pledge.code);
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    if (existingIndex >= 0) {
      const newVersion = pledges[existingIndex].version + 1;
      const updated: Pledge = {
        ...pledge,
        version: newVersion,
        updatedAt: now,
        updatedBy: author,
      };
      pledges[existingIndex] = updated;
      this.savePledges(pledges);

      const allHistory = this.getRawHistory();
      allHistory.unshift({
        id: `ver-${updated.code}-v${newVersion}-${Date.now()}`,
        pledgeId: updated.id,
        version: newVersion,
        createdAt: now,
        author,
        role,
        reason: '마크다운 파일에서 가져오기',
        method: 'MARKDOWN_IMPORT',
        snapshotMarkdown: markdownText,
        snapshotPledge: updated,
        diffSummary: '마크다운 파일 가져오기',
      });
      this.saveHistory(allHistory);
      this.recordLastSaved();
      return updated;
    } else {
      const created: Pledge = {
        ...pledge,
        version: 1,
        updatedAt: now,
        updatedBy: author,
      };
      pledges.push(created);
      this.savePledges(pledges);

      const allHistory = this.getRawHistory();
      allHistory.unshift({
        id: `ver-${created.code}-v1-${Date.now()}`,
        pledgeId: created.id,
        version: 1,
        createdAt: now,
        author,
        role,
        reason: '마크다운 파일에서 신규 등록',
        method: 'MARKDOWN_IMPORT',
        snapshotMarkdown: markdownText,
        snapshotPledge: created,
        diffSummary: '마크다운 신규 등록',
      });
      this.saveHistory(allHistory);
      this.recordLastSaved();
      return created;
    }
  }

  /**
   * Reset local storage back to sample.pdf baseline data
   */
  public static resetToDefault(): void {
    SafeStorage.removeItem(STORAGE_KEYS.PLEDGES);
    SafeStorage.removeItem(STORAGE_KEYS.HISTORY);
    SafeStorage.removeItem(STORAGE_KEYS.DISCUSSIONS);
    SafeStorage.removeItem(STORAGE_KEYS.SHARED_BUDGETS);
    this.isInitialized = false;
    this.init();
    this.recordLastSaved();
  }

  public static getLastSavedTime(): string {
    return SafeStorage.getItem(STORAGE_KEYS.LAST_SAVED) || '';
  }

  // --- Internal Storage Helpers ---

  private static savePledges(pledges: Pledge[]): void {
    SafeStorage.setItem(STORAGE_KEYS.PLEDGES, JSON.stringify(pledges));
  }

  private static saveSharedBudgets(budgets: SharedBudget[]): void {
    SafeStorage.setItem(STORAGE_KEYS.SHARED_BUDGETS, JSON.stringify(budgets));
  }

  private static getRawHistory(): PledgeVersion[] {
    try {
      const json = SafeStorage.getItem(STORAGE_KEYS.HISTORY);
      return json ? JSON.parse(json) : [];
    } catch {
      return [];
    }
  }

  private static saveHistory(history: PledgeVersion[]): void {
    SafeStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  }

  private static getRawDiscussions(): DiscussionItem[] {
    try {
      const json = SafeStorage.getItem(STORAGE_KEYS.DISCUSSIONS);
      return json ? JSON.parse(json) : [];
    } catch {
      return [];
    }
  }

  private static saveDiscussions(discussions: DiscussionItem[]): void {
    SafeStorage.setItem(STORAGE_KEYS.DISCUSSIONS, JSON.stringify(discussions));
  }

  private static recordLastSaved(): void {
    const time = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    SafeStorage.setItem(STORAGE_KEYS.LAST_SAVED, time);
  }
}
