/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  FileCode2,
  SlidersHorizontal,
  Plus,
  Trash2,
  AlertCircle,
  Clock,
  HelpCircle,
} from 'lucide-react';
import { Pledge, YearlyPlanRow, MilestoneItem, FuturePlanItem, CustomSection } from '../types/pledge';
import { pledgeToMarkdown, markdownToPledge } from '../utils/markdownParser';

interface Props {
  pledge: Pledge | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (pledge: Pledge, reason: string, rawMarkdown?: string) => Promise<boolean>;
}

export const PledgeEditModal: React.FC<Props> = ({ pledge, isOpen, onClose, onSave }) => {
  if (!isOpen || !pledge) return null;

  const [editMode, setEditMode] = useState<'form' | 'markdown'>('form');
  const [formData, setFormData] = useState<Pledge>(() => JSON.parse(JSON.stringify(pledge)));
  const [markdownText, setMarkdownText] = useState<string>(() => pledgeToMarkdown(pledge));
  const [commitReason, setCommitReason] = useState<string>('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [autoSavedTime, setAutoSavedTime] = useState<string>('');

  // Synchronize initial data when pledge changes
  useEffect(() => {
    if (pledge) {
      const cloned = JSON.parse(JSON.stringify(pledge));
      setFormData(cloned);
      setMarkdownText(pledgeToMarkdown(cloned));
      setCommitReason('');
      setErrors([]);
    }
  }, [pledge]);

  // Mode change handler: synchronize between form and markdown
  const handleSwitchMode = (mode: 'form' | 'markdown') => {
    if (mode === 'markdown' && editMode === 'form') {
      // Sync form into markdown
      const md = pledgeToMarkdown(formData);
      setMarkdownText(md);
      setEditMode('markdown');
    } else if (mode === 'form' && editMode === 'markdown') {
      // Parse markdown into form
      const { pledge: parsed, errors: parseErrors } = markdownToPledge(markdownText, formData);
      if (parseErrors.length > 0) {
        setErrors(parseErrors);
        return;
      }
      setFormData(parsed);
      setErrors([]);
      setEditMode('form');
    }
  };

  // Draft auto-save to localStorage
  useEffect(() => {
    const key = `draft_pledge_${formData.code}`;
    const timer = setTimeout(() => {
      localStorage.setItem(key, JSON.stringify(formData));
      setAutoSavedTime(new Date().toLocaleTimeString('ko-KR'));
    }, 1500);
    return () => clearTimeout(timer);
  }, [formData]);

  const handleSave = async () => {
    setErrors([]);
    if (!commitReason.trim()) {
      setErrors(['변경 사유(이력 메모)를 반드시 입력해야 합니다.']);
      return;
    }

    try {
      setIsSaving(true);
      let targetPledge = formData;
      let rawMd: string | undefined = undefined;

      if (editMode === 'markdown') {
        const { pledge: parsed, errors: parseErrors } = markdownToPledge(markdownText, formData);
        if (parseErrors.length > 0) {
          setErrors(parseErrors);
          setIsSaving(false);
          return;
        }
        targetPledge = parsed;
        rawMd = markdownText;
      }

      const success = await onSave(targetPledge, commitReason.trim(), rawMd);
      if (success) {
        localStorage.removeItem(`draft_pledge_${formData.code}`);
        onClose();
      }
    } catch (err: any) {
      setErrors([err.message || '저장 중 오류가 발생했습니다.']);
    } finally {
      setIsSaving(false);
    }
  };

  // Helpers to manipulate lists in form mode
  const handleAddMilestone = () => {
    const newM: MilestoneItem = {
      id: `m-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10).replace(/-/g, '. ') + '.',
      title: '새 추진실적 등록',
    };
    setFormData({ ...formData, milestones: [...formData.milestones, newM] });
  };

  const handleAddYearlyPlan = () => {
    const newY: YearlyPlanRow = {
      yearRange: '2027년',
      plan: '신규 추진계획',
      performance: '',
      progressRate: '0%',
      progressType: 'planned',
    };
    setFormData({ ...formData, yearlyPlans: [...formData.yearlyPlans, newY] });
  };

  const handleAddCustomSection = () => {
    const newS: CustomSection = {
      id: `cs-${Date.now()}`,
      title: '특이사항 메모',
      content: '추가할 내용을 입력하세요.',
    };
    setFormData({ ...formData, customSections: [...(formData.customSections || []), newS] });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-600 text-white">
                {formData.code}
              </span>
              <h2 className="text-base font-bold text-slate-900">공약사항 직접 수정</h2>
              <span className="text-xs text-slate-500">
                (현재 기준버전: v{formData.version})
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              서식 폼과 마크다운 편집기 중 편한 방식으로 문서를 갱신하세요.
            </p>
          </div>

          {/* Mode Switcher & Close */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => handleSwitchMode('form')}
                className={`px-3 py-1 rounded-md transition font-medium flex items-center gap-1 ${
                  editMode === 'form' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                <SlidersHorizontal size={12} />
                <span>쉬운 서식 폼</span>
              </button>
              <button
                type="button"
                onClick={() => handleSwitchMode('markdown')}
                className={`px-3 py-1 rounded-md transition font-medium flex items-center gap-1 ${
                  editMode === 'markdown' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                <FileCode2 size={12} />
                <span>마크다운 직접편집</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Error notification banner */}
        {errors.length > 0 && (
          <div className="px-6 py-3 bg-rose-50 border-b border-rose-200 text-xs text-rose-800 flex items-start gap-2">
            <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
            <div>
              {errors.map((err, i) => (
                <div key={i}>{err}</div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs">
          {editMode === 'form' ? (
            /* FORM MODE */
            <div className="space-y-6">
              {/* Basic Meta Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">공약명 (사업명)</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">추진단계</label>
                  <select
                    value={formData.stage}
                    onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="구상">구상</option>
                    <option value="사전타당성">사전타당성</option>
                    <option value="예비타당성">예비타당성</option>
                    <option value="기본계획">기본계획</option>
                    <option value="기본설계">기본설계</option>
                    <option value="실시설계">실시설계</option>
                    <option value="착공">착공</option>
                    <option value="준공">준공</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">일정 상태</label>
                  <select
                    value={formData.scheduleStatus}
                    onChange={(e) => setFormData({ ...formData, scheduleStatus: e.target.value as any })}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="정상추진">정상추진</option>
                    <option value="지연">지연 (유찰/공정지연)</option>
                    <option value="검토">검토 (관계기관협의)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">사업기간</label>
                  <input
                    type="text"
                    value={formData.period}
                    onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">완료시기</label>
                  <select
                    value={formData.completionTiming}
                    onChange={(e) => setFormData({ ...formData, completionTiming: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="임기내">임기내</option>
                    <option value="임기후">임기후</option>
                  </select>
                </div>
              </div>

              {/* Purpose */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">1. 사업목적</label>
                <textarea
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  rows={2}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Goals */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">최종 목표 (완공/개통)</label>
                  <input
                    type="text"
                    value={formData.finalGoal}
                    onChange={(e) => setFormData({ ...formData, finalGoal: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">임기 내 목표 (착공/설계)</label>
                  <input
                    type="text"
                    value={formData.termGoal}
                    onChange={(e) => setFormData({ ...formData, termGoal: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Overview & Total Budget */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">사업구간</label>
                  <input
                    type="text"
                    value={formData.overview.section}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        overview: { ...formData.overview, section: e.target.value },
                      })
                    }
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">사업량</label>
                  <input
                    type="text"
                    value={formData.overview.scope}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        overview: { ...formData.overview, scope: e.target.value },
                      })
                    }
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">총사업비 (원문 텍스트)</label>
                  <input
                    type="text"
                    value={formData.overview.totalBudgetText}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        overview: { ...formData.overview, totalBudgetText: e.target.value },
                      })
                    }
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Yearly plans */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-semibold text-slate-700">5. 연도별 추진계획 및 실적</label>
                  <button
                    type="button"
                    onClick={handleAddYearlyPlan}
                    className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    <Plus size={12} /> 행 추가
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.yearlyPlans.map((yp, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <input
                        type="text"
                        value={yp.yearRange}
                        onChange={(e) => {
                          const updated = [...formData.yearlyPlans];
                          updated[idx].yearRange = e.target.value;
                          setFormData({ ...formData, yearlyPlans: updated });
                        }}
                        className="w-24 p-1.5 bg-white border border-slate-200 rounded text-xs"
                        placeholder="연도"
                      />
                      <input
                        type="text"
                        value={yp.plan}
                        onChange={(e) => {
                          const updated = [...formData.yearlyPlans];
                          updated[idx].plan = e.target.value;
                          setFormData({ ...formData, yearlyPlans: updated });
                        }}
                        className="flex-1 p-1.5 bg-white border border-slate-200 rounded text-xs"
                        placeholder="추진계획"
                      />
                      <input
                        type="text"
                        value={yp.performance}
                        onChange={(e) => {
                          const updated = [...formData.yearlyPlans];
                          updated[idx].performance = e.target.value;
                          setFormData({ ...formData, yearlyPlans: updated });
                        }}
                        className="flex-1 p-1.5 bg-white border border-slate-200 rounded text-xs"
                        placeholder="실적"
                      />
                      <input
                        type="text"
                        value={yp.progressRate}
                        onChange={(e) => {
                          const updated = [...formData.yearlyPlans];
                          updated[idx].progressRate = e.target.value;
                          setFormData({ ...formData, yearlyPlans: updated });
                        }}
                        className="w-16 p-1.5 bg-white border border-slate-200 rounded text-xs text-center"
                        placeholder="%"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = formData.yearlyPlans.filter((_, i) => i !== idx);
                          setFormData({ ...formData, yearlyPlans: updated });
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Milestones */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-semibold text-slate-700">6. 날짜별 추진실적 (마일스톤)</label>
                  <button
                    type="button"
                    onClick={handleAddMilestone}
                    className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    <Plus size={12} /> 실적 추가
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.milestones.map((m, idx) => (
                    <div key={m.id || idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <input
                        type="text"
                        value={m.date}
                        onChange={(e) => {
                          const updated = [...formData.milestones];
                          updated[idx].date = e.target.value;
                          setFormData({ ...formData, milestones: updated });
                        }}
                        className="w-28 p-1.5 bg-white border border-slate-200 rounded text-xs font-mono"
                        placeholder="2026. 08. 30."
                      />
                      <input
                        type="text"
                        value={m.title}
                        onChange={(e) => {
                          const updated = [...formData.milestones];
                          updated[idx].title = e.target.value;
                          setFormData({ ...formData, milestones: updated });
                        }}
                        className="flex-1 p-1.5 bg-white border border-slate-200 rounded text-xs"
                        placeholder="추진실적 내용"
                      />
                      <label className="flex items-center gap-1 text-[11px] text-slate-600 shrink-0">
                        <input
                          type="checkbox"
                          checked={Boolean(m.isCompleted)}
                          onChange={(e) => {
                            const updated = [...formData.milestones];
                            updated[idx].isCompleted = e.target.checked;
                            setFormData({ ...formData, milestones: updated });
                          }}
                          className="rounded"
                        />
                        <span>완료</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = formData.milestones.filter((_, i) => i !== idx);
                          setFormData({ ...formData, milestones: updated });
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Sections Preservation */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-semibold text-slate-700">
                    사용자 추가 섹션 (특이사항/업무메모 - PDF 병합 시 영구 보존)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddCustomSection}
                    className="flex items-center gap-1 text-[11px] text-purple-600 hover:text-purple-800 font-semibold"
                  >
                    <Plus size={12} /> 사용자 섹션 추가
                  </button>
                </div>
                <div className="space-y-3">
                  {(formData.customSections || []).map((cs, idx) => (
                    <div key={cs.id} className="p-3 bg-purple-50/40 rounded-lg border border-purple-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <input
                          type="text"
                          value={cs.title}
                          onChange={(e) => {
                            const updated = [...(formData.customSections || [])];
                            updated[idx].title = e.target.value;
                            setFormData({ ...formData, customSections: updated });
                          }}
                          className="w-1/2 p-1.5 bg-white border border-purple-200 rounded text-xs font-bold"
                          placeholder="섹션 제목"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (formData.customSections || []).filter((_, i) => i !== idx);
                            setFormData({ ...formData, customSections: updated });
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <textarea
                        value={cs.content}
                        onChange={(e) => {
                          const updated = [...(formData.customSections || [])];
                          updated[idx].content = e.target.value;
                          setFormData({ ...formData, customSections: updated });
                        }}
                        rows={2}
                        className="w-full p-2 bg-white border border-purple-200 rounded text-xs"
                        placeholder="내용을 입력하세요..."
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* MARKDOWN DIRECT EDIT MODE */
            <div className="space-y-2">
              <div className="text-slate-500 text-[11px] flex items-center justify-between">
                <span>YAML Front-Matter(---)와 Markdown 표 규격을 직접 수정할 수 있습니다.</span>
                <span className="font-mono text-slate-400">{markdownText.length} 자</span>
              </div>
              <textarea
                value={markdownText}
                onChange={(e) => setMarkdownText(e.target.value)}
                rows={22}
                className="w-full p-4 font-mono text-xs leading-relaxed bg-slate-900 text-slate-100 rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Commit Reason & Concurrency Check Input */}
          <div className="pt-4 border-t border-slate-200 space-y-2">
            <label className="font-bold text-slate-800 flex items-center gap-1">
              <span>수정 사유 (이력 로그에 영구 기록됩니다)</span>
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={commitReason}
              onChange={(e) => setCommitReason(e.target.value)}
              placeholder="예: 2·5공구 수의계약 대상자 확정에 따른 일정 및 실적 최신화"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <div className="text-slate-400 text-[11px]">
            {autoSavedTime ? `초안 자동저장됨 (${autoSavedTime})` : '자동 저장 활성화'}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg font-semibold text-slate-700 hover:bg-slate-200 transition"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 rounded-lg font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white shadow-xs transition flex items-center gap-1.5"
            >
              <Save size={14} />
              <span>{isSaving ? '저장 중...' : '새 버전으로 저장 (v' + (formData.version + 1) + ')'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
