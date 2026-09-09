/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, PlusCircle, AlertCircle } from 'lucide-react';
import { Pledge, UserRole } from '../types/pledge';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userRole: UserRole;
  onSaveNewPledge: (pledge: Pledge, reason: string) => Promise<boolean>;
}

export const NewPledgeModal: React.FC<Props> = ({ isOpen, onClose, userRole, onSaveNewPledge }) => {
  if (!isOpen) return null;

  const [code, setCode] = useState<string>('4-08');
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<string>('공약사업');
  const [isNew, setIsNew] = useState<string>('신규');
  const [stage, setStage] = useState<string>('기본계획');
  const [scheduleStatus, setScheduleStatus] = useState<string>('정상추진');
  const [period, setPeriod] = useState<string>('2026~2030');
  const [completionTiming, setCompletionTiming] = useState<string>('임기내');
  const [department, setDepartment] = useState<string>('교통정책과 철도기획팀');
  const [leadAgency, setLeadAgency] = useState<string>('남양주시');
  const [purpose, setPurpose] = useState<string>('');
  const [totalBudgetText, setTotalBudgetText] = useState<string>('1,000억 원');
  const [totalBudgetMillion, setTotalBudgetMillion] = useState<number>(100000);
  const [normalizedKrwBillion, setNormalizedKrwBillion] = useState<number>(100.0);
  const [finalGoal, setFinalGoal] = useState<string>('');
  const [termGoal, setTermGoal] = useState<string>('');
  const [commitReason, setCommitReason] = useState<string>('신규 공약사항 신설 등록');
  const [error, setError] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!code.trim() || !title.trim()) {
      setError('관리번호와 공약명은 필수 입력 항목입니다.');
      return;
    }

    const newPledge: Pledge = {
      id: `p-${code.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      code: code.trim(),
      title: title.trim(),
      category,
      isNew,
      completionTiming,
      period,
      statusText: '기본계획 수립 추진 중',
      stage,
      scheduleStatus: scheduleStatus as any,
      leadAgency,
      department,
      contacts: {
        department: department.split(' ')[0] || '교통정책과',
        section: department.split(' ')[1] || '철도기획팀',
        director: '과장',
        teamLeader: '팀장',
        officer: '주무관',
      },
      supportNeeded: {
        needed: true,
        types: ['재정', '행정'],
      },
      purpose,
      overview: {
        section: '남양주시 일원',
        scope: '신규 철도 및 연계망 구축',
        totalBudgetText,
      },
      budgetInfo: {
        totalBudgetMillion,
        normalizedKrwBillion,
        rawText: totalBudgetText,
        rawUnit: '백만원',
        isUndetermined: false,
        isUnapportioned: false,
        investmentPlan: [
          { category: '계', total: totalBudgetMillion, preInvestment: 0, y2026: 5000, y2027: 20000, y2028: 30000, y2029: 30000, y2030: 15000, postTerm: 0 },
        ],
      },
      issuesAndSolutions: {
        issues: ['관계부처 사전협의 및 재정확보 방안 필요'],
        solutions: ['국토부 및 경기도 협력체계 가동'],
        rawText: '사전협의 및 재정확보를 위한 관계기관 합동회의 추진.',
      },
      finalGoal: finalGoal || `${title} 완공 및 개통`,
      termGoal: termGoal || `${title} 기본계획 승인 및 착공 준비`,
      finalGoalAchieved: false,
      termGoalAchieved: false,
      yearlyPlans: [
        { yearRange: '2026년', plan: '타당성 조사 및 기본계획 수립', performance: '', progressRate: '10%', progressType: 'planned' },
      ],
      currentProgressRate: 10,
      milestones: [
        { id: `m-${Date.now()}`, date: new Date().toISOString().slice(0, 10).replace(/-/g, '. ') + '.', title: '공약 신규 등록 및 추진계획 수립' },
      ],
      futurePlans: [
        { id: `fp-${Date.now()}`, year: '2027.', content: '기본 및 실시설계 착수' },
      ],
      references: [],
      customSections: [],
      tags: ['신규공약', '철도교통'],
      needsReview: false,
      reviewReasons: [],
      sourcePdf: {
        pdfVersion: 'v1.0 (신규등록)',
        fileName: '신규_공약_기안문.pdf',
        pageRange: '1',
        startPage: 1,
        endPage: 1,
      },
      version: 1,
      updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      updatedBy: '관리자(신규등록)',
    };

    try {
      setIsSaving(true);
      const ok = await onSaveNewPledge(newPledge, commitReason);
      if (ok) {
        onClose();
      }
    } catch (err: any) {
      setError(err.message || '저장 오류');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <PlusCircle size={18} className="text-blue-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">새 공약사항 등록</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                신규 철도 및 연계 공약을 시스템 단일 기준본(SQLite & Markdown)에 추가합니다.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="px-6 py-2.5 bg-rose-50 text-rose-800 text-xs flex items-center gap-2 border-b border-rose-200">
            <AlertCircle size={14} className="text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                관리번호 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="예: 4-08"
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                공약명 (사업명) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 왕숙 신도시 환승복합센터 구축"
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">추진단계</label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
              >
                <option value="구상">구상</option>
                <option value="사전타당성">사전타당성</option>
                <option value="예비타당성">예비타당성</option>
                <option value="기본계획">기본계획</option>
                <option value="기본설계">기본설계</option>
                <option value="실시설계">실시설계</option>
                <option value="착공">착공</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">일정상태</label>
              <select
                value={scheduleStatus}
                onChange={(e) => setScheduleStatus(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
              >
                <option value="정상추진">정상추진</option>
                <option value="지연">지연</option>
                <option value="검토">검토</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">완료시기</label>
              <select
                value={completionTiming}
                onChange={(e) => setCompletionTiming(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
              >
                <option value="임기내">임기내</option>
                <option value="임기후">임기후</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">주관부서</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">사업주체</label>
              <input
                type="text"
                value={leadAgency}
                onChange={(e) => setLeadAgency(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">사업목적</label>
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="사업 추진의 목적과 기대 효과를 입력하세요."
              rows={2}
              className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">총사업비 텍스트 표기</label>
              <input
                type="text"
                value={totalBudgetText}
                onChange={(e) => setTotalBudgetText(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">정규화 금액 (억원 단위)</label>
              <input
                type="number"
                value={normalizedKrwBillion}
                onChange={(e) => {
                  const val = Number(e.target.value) || 0;
                  setNormalizedKrwBillion(val);
                  setTotalBudgetMillion(val * 100);
                }}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">최종 목표</label>
              <input
                type="text"
                value={finalGoal}
                onChange={(e) => setFinalGoal(e.target.value)}
                placeholder="예: 복합환승센터 완공"
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">임기 내 목표</label>
              <input
                type="text"
                value={termGoal}
                onChange={(e) => setTermGoal(e.target.value)}
                placeholder="예: 기본계획 수립 및 설계 착수"
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200">
            <label className="font-bold text-slate-800 block mb-1">등록 사유</label>
            <input
              type="text"
              value={commitReason}
              onChange={(e) => setCommitReason(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition shadow-xs"
            >
              {isSaving ? '저장 중...' : '새 공약 등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
