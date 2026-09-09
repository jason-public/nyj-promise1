/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Pledge } from '../types/pledge';
import { INITIAL_PLEDGES } from './initialPledges';

export interface SamplePdfPayload {
  id: string;
  name: string;
  description: string;
  fileName: string;
  fileHash: string;
  pledges: Pledge[];
}

// 1. Identical upload test payload (same hash and data as initial)
export const IDENTICAL_SAMPLE_PDF: SamplePdfPayload = {
  id: 'pdf-sample-v1',
  name: '샘플.pdf (동일 파일 재검토)',
  description: '원본 샘플 PDF와 동일한 파일(22쪽, 7개 공약). 재업로드 시 중복 생성을 방지하고 변경 없음을 확인합니다.',
  fileName: '샘플.pdf',
  fileHash: 'sha256-e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  pledges: INITIAL_PLEDGES,
};

// 2. Partial modified PDF payload (update to 4-01 and 4-03)
const modified401: Pledge = JSON.parse(JSON.stringify(INITIAL_PLEDGES[0]));
modified401.statusText = '유찰공구(2·5공구) 수의계약 전환 완료 및 전 공구 실시설계 착수';
modified401.scheduleStatus = '정상추진';
modified401.milestones.push({
  id: 'm-401-7',
  date: '2026. 10. 15.',
  title: '경기도 2·5공구 수의계약 대상자 확정 및 기본설계 심의 통과',
  isCompleted: true,
});
modified401.yearlyPlans[0].performance = '전 공구(1~6공구) 실시설계 추진';
modified401.yearlyPlans[0].progressRate = '30%';
modified401.currentProgressRate = 30;

const modified403: Pledge = JSON.parse(JSON.stringify(INITIAL_PLEDGES[2]));
modified403.statusText = '예비타당성조사 KDI 본조사 진행 중 (2027 상반기 완료 목표)';
modified403.milestones.push({
  id: 'm-403-9',
  date: '2026. 10. 20.',
  title: 'KDI 예비타당성조사 현장조사 착수 및 관계기관 합동회의',
});

export const PARTIAL_UPDATED_PDF: SamplePdfPayload = {
  id: 'pdf-update-2026-q4',
  name: '2026년_4분기_철도현황_보고서.pdf (일부 공약 수정본)',
  description: '4-01(9호선 2·5공구 수의계약 완료)과 4-03(8호선 별내선 현장조사 착수) 2건만 수록된 수정 PDF. 나머지 5개 공약이 삭제되지 않고 보존됩니다.',
  fileName: '2026년_4분기_철도현황_보고서.pdf',
  fileHash: 'sha256-a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
  pledges: [modified401, modified403],
};

// 3. New pledge payload (adds 4-08 to existing ones)
const newPledge408: Pledge = {
  id: 'p-4-08',
  code: '4-08',
  title: '왕숙 신도시 환승복합센터 및 연계 환승체계 구축',
  category: '공약사업',
  isNew: '신규',
  completionTiming: '임기내',
  period: '2025~2030',
  statusText: '기본구상 및 타당성조사 용역 추진 중',
  stage: '기본계획',
  scheduleStatus: '정상추진',
  leadAgency: '남양주시, 경기도, LH',
  department: '교통정책과 광역교통팀',
  contacts: {
    department: '교통정책과',
    section: '광역교통팀',
    director: '김학진(☎2420)',
    teamLeader: '이창훈(☎5210)',
    officer: '박서연(☎4321)',
  },
  supportNeeded: {
    needed: true,
    types: ['재정'],
  },
  purpose: '9호선, GTX-B, 경춘선 환승 편의 증진을 위한 왕숙역 복합환승체계 구축',
  overview: {
    section: '남양주시 진건읍 왕숙1지구 일원',
    scope: '지하2층~지상4층 복합환승센터 1개소 및 연계 버스 환승정류장',
    totalBudgetText: '1,500억 원',
  },
  budgetInfo: {
    totalBudgetMillion: 150000,
    normalizedKrwBillion: 150.0,
    rawText: '1,500억 원',
    rawUnit: '백만원',
    isUndetermined: false,
    isUnapportioned: false,
    localBurdenMillion: 30000,
    localBurdenBillion: 30.0,
    investmentPlan: [
      { category: '계', total: 150000, preInvestment: 0, y2026: 5000, y2027: 35000, y2028: 50000, y2029: 40000, y2030: 20000, postTerm: 0 },
      { category: '국비', total: 60000, preInvestment: 0, y2026: 2000, y2027: 14000, y2028: 20000, y2029: 16000, y2030: 8000, postTerm: 0 },
      { category: '도비', total: 30000, preInvestment: 0, y2026: 1000, y2027: 7000, y2028: 10000, y2029: 8000, y2030: 4000, postTerm: 0 },
      { category: '시비', total: 30000, preInvestment: 0, y2026: 1000, y2027: 7000, y2028: 10000, y2029: 8000, y2030: 4000, postTerm: 0 },
      { category: '기타(LH)', total: 30000, preInvestment: 0, y2026: 1000, y2027: 7000, y2028: 10000, y2029: 8000, y2030: 4000, postTerm: 0 },
    ],
  },
  issuesAndSolutions: {
    issues: ['철도 역사 준공 시점과 복합환승센터 개통 시기 일치 필요'],
    solutions: ['LH 및 철도공단과 합동 공정회의 정례화'],
    rawText: '역사 준공 및 환승센터 개통 시기 일치를 위한 합동 공정회의 정례화.',
  },
  finalGoal: '왕숙 복합환승센터 완공 및 적기 운영',
  termGoal: '기본계획 승인 및 설계 착수',
  finalGoalAchieved: false,
  termGoalAchieved: false,
  yearlyPlans: [
    { yearRange: '2026년', plan: '타당성 용역 및 기본계획 수립', performance: '용역 진행중', progressRate: '30%', progressType: 'actual' },
    { yearRange: '2027년', plan: '기본 및 실시설계', performance: '', progressRate: '60%', progressType: 'planned' },
    { yearRange: '2028년~2030년', plan: '공사 착공 및 준공', performance: '', progressRate: '100%', progressType: 'planned' },
  ],
  currentProgressRate: 30,
  milestones: [
    { id: 'm-408-1', date: '2025. 11. 10.', title: '왕숙 복합환승센터 기본구상 용역 착수' },
    { id: 'm-408-2', date: '2026. 6. 15.', title: '국토부 대도시권 복합환승센터 시범사업 공모 신청' },
  ],
  futurePlans: [
    { id: 'fp-408-1', year: '2027.', content: '기본 및 실시설계 착수' },
    { id: 'fp-408-2', year: '2028.', content: '공사 착공' },
  ],
  references: [],
  customSections: [],
  tags: ['왕숙신도시', '환승복합센터', '광역교통', '환승연계'],
  needsReview: false,
  reviewReasons: [],
  sourcePdf: {
    pdfVersion: 'v2.0 (추가분)',
    fileName: '2027_신규철도_공약사항.pdf',
    pageRange: '1–4',
    startPage: 1,
    endPage: 4,
  },
  version: 1,
  updatedAt: '2026-10-01 10:00:00',
  updatedBy: '시스템(PDF 초기가져오기)',
};

export const NEW_PLEDGE_PDF: SamplePdfPayload = {
  id: 'pdf-new-pledge-2027',
  name: '2027_신규철도_공약사항.pdf (신규 공약 추가본)',
  description: '새로운 공약 [4-08 왕숙 신도시 환승복합센터 구축] 1건이 포함된 신규 보고서. 기존 7개 공약을 유지하면서 신규 등록을 시연합니다.',
  fileName: '2027_신규철도_공약사항.pdf',
  fileHash: 'sha256-fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210',
  pledges: [newPledge408],
};

export const PRESET_SAMPLE_PDFS: SamplePdfPayload[] = [
  IDENTICAL_SAMPLE_PDF,
  PARTIAL_UPDATED_PDF,
  NEW_PLEDGE_PDF,
];
