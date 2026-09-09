/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'viewer' | 'editor' | 'admin';

export type PledgeCategory = '공약사업' | '장기(지역)사업' | '현안(지역)사업';
export type NewOrContinuing = '신규' | '계속';
export type CompletionTiming = '임기내' | '임기후';
export type ScheduleStatus =
  | '정상추진'
  | '지연우려'
  | '검토필요'
  | '일정초과'
  | '지연'
  | '검토';

export type BusinessStage =
  | '국가계획 반영 건의'
  | '사전타당성조사'
  | '예비타당성조사'
  | '기본계획'
  | '기본·실시설계'
  | '공사착공 및 추진'
  | '준공 및 개통'
  | '정책건의 및 협의'
  | '구상'
  | '사전타당성'
  | '예비타당성'
  | '기본설계'
  | '실시설계'
  | '착공'
  | '준공'
  | string;

export interface SupportNeeded {
  needed: boolean;
  types: ('제도' | '재정' | '권한' | '행정')[];
}

export interface Contacts {
  department: string;
  section: string;
  director: string;
  teamLeader: string;
  officer: string;
}

export interface InvestmentPlanRow {
  category: string; // '계', '국비', '도비', '시비', '기타'
  total: number; // 단위: 백만원
  preInvestment: number;
  y2026: number;
  y2027: number;
  y2028: number;
  y2029: number;
  y2030: number;
  postTerm: number;
}

export interface BudgetInfo {
  totalBudgetMillion: number; // 백만원 단위
  normalizedKrwBillion: number; // 억원 단위 (예: 29334억원)
  rawText: string; // 원문 텍스트 (예: '2조 9,334억 원')
  rawUnit: string; // '백만원', '억원'
  isUndetermined: boolean; // 사업비 미정 여부 (4-06)
  isUnapportioned: boolean; // 부담주체별 사업비 미산정 여부 (4-04, 4-05)
  sharedBudgetId?: string | null; // 공유 예산 ID (4-01, 4-02 -> 'shared_line9')
  sharedBudgetNote?: string;
  localBurdenMillion?: number; // 남양주시/지자체 부담금 백만원 단위
  localBurdenBillion?: number; // 억원 단위 (GTX-B 238.57억원)
  alternatives?: { name: string; amountText: string; amountBillion: number }[]; // 4-06 춘천 531억, 마석 281억
  investmentPlan: InvestmentPlanRow[];
  notes?: string; // 예: "※ 기타: 광역교통 개선대책 분담금(LH)"
}

export interface YearlyPlanRow {
  yearRange: string; // e.g., '2026년', '2027년', '2028년~2030년', '향후'
  plan: string;
  performance: string; // 실적
  progressRate: string; // '20%', '40%', '100%', '-'
  progressType: 'actual' | 'planned' | 'needs_confirmation';
}

export interface MilestoneItem {
  id: string;
  date: string; // '2020. 12. 30.', '2026. 8.(현재)'
  title: string;
  details?: string;
  isCompleted?: boolean;
}

export interface FuturePlanItem {
  id: string;
  year: string;
  content: string;
}

export interface ReferenceItem {
  id: string;
  title: string;
  type: 'map' | 'diagram' | 'table' | 'layout';
  caption: string;
  page: number;
  previewUrl?: string;
}

export interface ExtraTable {
  title: string;
  headers: string[];
  rows: string[][];
  notes?: string;
}

export interface CustomSection {
  id: string;
  title: string;
  content: string;
}

export interface DiscussionItem {
  id: string;
  pledgeCode?: string;
  author: string;
  role: UserRole;
  content: string;
  createdAt: string;
  isInternalMemo?: boolean;
}

export interface PledgeSourcePdf {
  pdfVersion: string;
  fileName: string;
  pageRange: string; // '1–3'
  startPage: number;
  endPage: number;
  fileHash?: string;
}

export interface Pledge {
  id: string; // Internal stable ID, e.g., 'p-4-01'
  code: string; // 관리번호, e.g., '4-01', '4-07-1'
  title: string; // 공약명
  category: PledgeCategory;
  isNew: NewOrContinuing;
  completionTiming: CompletionTiming;
  period: string; // '2020~2031'
  statusText: string; // 추진상황 원문
  stage: BusinessStage;
  scheduleStatus: ScheduleStatus;
  leadAgency: string; // 사업주체
  department: string; // 주관부서 문자열
  contacts: Contacts;
  supportNeeded: SupportNeeded;
  purpose: string; // 사업목적
  overview: {
    section: string; // 사업구간
    scope: string; // 사업량
    totalBudgetText: string;
  };
  budgetInfo: BudgetInfo;
  issuesAndSolutions: {
    issues: string[];
    solutions: string[];
    rawText: string;
  };
  finalGoal: string; // 최종 목표
  termGoal: string; // 임기내 목표
  finalGoalAchieved: boolean;
  termGoalAchieved: boolean;
  yearlyPlans: YearlyPlanRow[];
  currentProgressRate: number | null; // 확인된 실제 추진율 (0~100) or null
  milestones: MilestoneItem[];
  futurePlans: FuturePlanItem[];
  references: ReferenceItem[];
  extraTables?: ExtraTable[];
  customSections: CustomSection[];
  tags: string[];
  needsReview: boolean;
  reviewReasons: string[];
  sourcePdf: PledgeSourcePdf;
  version: number;
  updatedAt: string;
  updatedBy: string;
  lastMergeBaseJson?: string; // Stored snapshot of the PDF extraction used for 3-way merge
}

export interface PledgeVersion {
  id: string;
  pledgeId: string;
  version: number;
  createdAt: string;
  author: string;
  role: UserRole;
  reason: string;
  method: 'MANUAL_EDIT' | 'PDF_UPDATE' | 'VERSION_RESTORE' | 'MARKDOWN_IMPORT';
  snapshotMarkdown: string;
  snapshotPledge: Pledge;
  diffSummary?: string;
}

export interface SharedBudget {
  id: string;
  name: string;
  totalBudgetMillion: number;
  totalBudgetBillion: number;
  participatingPledgeCodes: string[];
  description: string;
}

export interface DashboardStats {
  totalCount: number;
  termAchievedCount: number;
  finalAchievedCount: number;
  reviewNeededCount: number;
  totalBudgetBillion: number;
  stageCounts: Record<string, number>;
  deduplicationRuleApplied: boolean;
}

export type MergeFieldStatus =
  | 'UNCHANGED' // All three match
  | 'AUTO_UPDATE' // User didn't touch, incoming PDF changed
  | 'USER_KEPT' // User modified, incoming PDF didn't change
  | 'CONFLICT' // Both modified differently
  | 'CUSTOM_PRESERVED'; // User added section/note

export interface FieldDiffItem {
  fieldPath: string;
  fieldLabel: string;
  baseValue: any;
  currentValue: any;
  incomingValue: any;
  status: MergeFieldStatus;
  chosenValue: any;
  decision: 'keep_current' | 'use_incoming' | 'custom';
}

export interface PledgeMergeDiff {
  pledgeCode: string;
  pledgeTitle: string;
  isNewPledge: boolean;
  needsReview: boolean;
  conflictsCount: number;
  autoUpdateCount: number;
  fieldDiffs: FieldDiffItem[];
  selectedForMerge: boolean;
}
