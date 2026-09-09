/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ArrowLeft,
  Edit3,
  History,
  FileCode2,
  FileText,
  AlertTriangle,
  Building,
  Calendar,
  Coins,
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageSquare,
  Lock,
  Phone,
  Bookmark,
  Send,
  Printer,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';
import { Pledge, DiscussionItem, UserRole } from '../types/pledge';

interface Props {
  pledge: Pledge;
  allPledges: Pledge[];
  userRole: UserRole;
  isPublicMode: boolean;
  discussions: DiscussionItem[];
  onBack: () => void;
  onEdit: (pledge: Pledge) => void;
  onViewHistory: (pledge: Pledge) => void;
  onViewMarkdown: (pledge: Pledge) => void;
  onSelectPledge: (code: string) => void;
  onAddDiscussion: (content: string, isInternalMemo: boolean) => Promise<void>;
}

export const PledgeDetailView: React.FC<Props> = ({
  pledge,
  allPledges,
  userRole,
  isPublicMode,
  discussions,
  onBack,
  onEdit,
  onViewHistory,
  onViewMarkdown,
  onSelectPledge,
  onAddDiscussion,
}) => {
  const [activeTab, setActiveTab] = useState<'wiki' | 'discussions'>('wiki');
  const [newComment, setNewComment] = useState<string>('');
  const [isInternalMemo, setIsInternalMemo] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Find backlinks: other pledges that mention this pledge's code
  const backlinks = allPledges.filter(
    (p) => p.code !== pledge.code && (
      p.purpose.includes(pledge.code) ||
      p.overview.section.includes(pledge.code) ||
      p.issuesAndSolutions.rawText.includes(pledge.code) ||
      p.tags.includes(pledge.code)
    )
  );

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onAddDiscussion(newComment.trim(), isInternalMemo);
      setNewComment('');
      setIsInternalMemo(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to parse progress rate number (e.g. '20%' -> 20)
  const parseProgressNumber = (rate: string): number | null => {
    if (!rate || rate === '-') return null;
    const match = rate.match(/\d+/);
    if (!match) return null;
    const num = parseInt(match[0], 10);
    return isNaN(num) ? null : Math.min(100, Math.max(0, num));
  };
  const renderWikiText = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\[\[[A-Za-z0-9\-_.]+(?:\|[^\]]+)?\]\])/g);

    return parts.map((part, index) => {
      const match = part.match(/^\[\[([A-Za-z0-9\-_.]+)(?:\|([^\]]+))?\]\]$/);
      if (match) {
        const targetCode = match[1];
        const label = match[2] || targetCode;
        return (
          <button
            key={index}
            onClick={() => onSelectPledge(targetCode)}
            className="inline-flex items-center gap-0.5 text-blue-600 hover:text-blue-800 font-semibold underline decoration-blue-300 underline-offset-2 mx-0.5 transition"
          >
            <span>{label}</span>
            <ExternalLink size={10} />
          </button>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Breadcrumb & Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <button
            onClick={onBack}
            className="flex items-center gap-1 font-semibold text-slate-700 hover:text-blue-600 transition"
          >
            <ArrowLeft size={14} />
            <span>목록으로 돌아가기</span>
          </button>
          <span>/</span>
          <span className="font-mono font-medium text-slate-400">[{pledge.code}]</span>
          <span>/</span>
          <span className="font-medium text-slate-800 truncate max-w-[200px] sm:max-w-md">
            {pledge.title}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onViewMarkdown(pledge)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            title="YAML Front-Matter 및 Markdown 원문 보기"
          >
            <FileCode2 size={13} />
            <span>마크다운 원문</span>
          </button>

          <button
            onClick={() => onViewHistory(pledge)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            title="버전 변경 이력 및 비교"
          >
            <History size={13} />
            <span>이력 (v{pledge.version})</span>
          </button>

          {userRole !== 'viewer' && (
            <button
              onClick={() => onEdit(pledge)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition"
            >
              <Edit3 size={13} />
              <span>직접 수정</span>
            </button>
          )}

          <button
            onClick={() => window.print()}
            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
            title="인쇄 미리보기"
          >
            <Printer size={15} />
          </button>
        </div>
      </div>

      {/* Review Alert Notice if flagged */}
      {pledge.needsReview && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-3 shadow-2xs">
          <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-sm text-amber-950">검토 필요 항목이 지정된 문서입니다</div>
            <p className="text-amber-800 leading-relaxed">
              사유: {pledge.reviewReasons.join(' / ')}
            </p>
            <p className="text-[11px] text-amber-700">
              ※ 담당 부서 및 관계기관과의 협의 결과에 따라 ‘직접 수정’ 또는 ‘PDF 재업로드’로 최신 상태를 확정해 주시기 바랍니다.
            </p>
          </div>
        </div>
      )}

      {/* Main 2-Column Wiki Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left 3 Columns: Main Wiki Article Content */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Article Header */}
          <div className="p-6 border-b border-slate-200 bg-slate-50/50">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-600 text-white">
                {pledge.code}
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800">
                {pledge.category}
              </span>
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                {pledge.stage}
              </span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  pledge.scheduleStatus === '지연'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : pledge.scheduleStatus === '검토'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {pledge.scheduleStatus}
              </span>

              <span className="text-[11px] text-slate-500 ml-auto flex items-center gap-1">
                <Clock size={12} />
                <span>문서버전 v{pledge.version} ({pledge.updatedAt} 갱신 by {pledge.updatedBy})</span>
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
              {pledge.title}
            </h1>

            {/* Sub-tabs: Official Wiki Article vs Discussions/Memos */}
            <div className="flex items-center gap-4 mt-6 border-b border-slate-200 -mb-6">
              <button
                onClick={() => setActiveTab('wiki')}
                className={`pb-2.5 text-xs font-bold transition border-b-2 flex items-center gap-1.5 ${
                  activeTab === 'wiki'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText size={14} />
                <span>공약 본문 (오픈위키)</span>
              </button>

              <button
                onClick={() => setActiveTab('discussions')}
                className={`pb-2.5 text-xs font-bold transition border-b-2 flex items-center gap-1.5 ${
                  activeTab === 'discussions'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <MessageSquare size={14} />
                <span>협업 토론 & 업무 메모 ({discussions.length})</span>
              </button>
            </div>
          </div>

          {/* TAB 1: Wiki Article Content */}
          {activeTab === 'wiki' ? (
            <div className="p-6 space-y-8 text-xs text-slate-800">
              {/* Table of contents preview */}
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200/80">
                <div className="font-semibold text-slate-700 text-xs mb-2">목차 (Table of Contents)</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-[11px] text-slate-600">
                  <a href="#sec-purpose" className="hover:text-blue-600 hover:underline">1. 사업목적</a>
                  <a href="#sec-overview" className="hover:text-blue-600 hover:underline">2. 사업개요</a>
                  <a href="#sec-budget" className="hover:text-blue-600 hover:underline">3. 재원투자 계획</a>
                  <a href="#sec-goals" className="hover:text-blue-600 hover:underline">4. 사업목표</a>
                  <a href="#sec-yearly" className="hover:text-blue-600 hover:underline">5. 연도별 추진계획</a>
                  <a href="#sec-milestones" className="hover:text-blue-600 hover:underline">6. 추진실적 타임라인</a>
                  <a href="#sec-issues" className="hover:text-blue-600 hover:underline">7. 쟁점사항 및 해소방안</a>
                  <a href="#sec-future" className="hover:text-blue-600 hover:underline">8. 향후계획</a>
                  <a href="#sec-references" className="hover:text-blue-600 hover:underline">9. 참고자료</a>
                </div>
              </div>

              {/* 1. 사업목적 */}
              <section id="sec-purpose" className="space-y-2">
                <h2 className="text-sm font-bold text-slate-900 border-l-4 border-blue-600 pl-2.5">
                  1. 사업목적
                </h2>
                <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200/60 leading-relaxed text-slate-700">
                  {renderWikiText(pledge.purpose)}
                </div>
              </section>

              {/* 2. 사업개요 */}
              <section id="sec-overview" className="space-y-2">
                <h2 className="text-sm font-bold text-slate-900 border-l-4 border-blue-600 pl-2.5">
                  2. 사업개요
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200/60">
                    <span className="text-[11px] text-slate-500 font-semibold block mb-0.5">사업구간</span>
                    <span className="font-medium text-slate-800">{pledge.overview.section}</span>
                  </div>
                  <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200/60">
                    <span className="text-[11px] text-slate-500 font-semibold block mb-0.5">사업량</span>
                    <span className="font-medium text-slate-800">{pledge.overview.scope}</span>
                  </div>
                  <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200/60">
                    <span className="text-[11px] text-slate-500 font-semibold block mb-0.5">총사업비 (원문)</span>
                    <span className="font-bold text-blue-700">{pledge.overview.totalBudgetText}</span>
                  </div>
                </div>
              </section>

              {/* 3. 재원투자 계획 */}
              <section id="sec-budget" className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900 border-l-4 border-blue-600 pl-2.5">
                    3. 재원투자 계획
                  </h2>
                  <span className="text-[11px] text-slate-500 font-mono">
                    (단위: {pledge.budgetInfo.rawUnit || '백만원'} / 정규화: {pledge.budgetInfo.normalizedKrwBillion}억원)
                  </span>
                </div>

                {/* Shared budget note banner if applicable */}
                {pledge.budgetInfo.sharedBudgetId && (
                  <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-start gap-2">
                    <Coins size={15} className="text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">공유 예산 안내: </span>
                      <span>{pledge.budgetInfo.sharedBudgetNote}</span>
                    </div>
                  </div>
                )}

                {/* Table of investment plan */}
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200">
                        <th className="py-2.5 px-3 whitespace-nowrap">구분</th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap">총액</th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap">기투자</th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap">2026년</th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap">2027년</th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap">2028년</th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap">2029년</th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap">2030년</th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap">향후</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pledge.budgetInfo.investmentPlan.map((row, idx) => (
                        <tr
                          key={idx}
                          className={row.category === '계' ? 'bg-slate-50 font-bold text-slate-900' : 'hover:bg-slate-50/40'}
                        >
                          <td className="py-2 px-3">{row.category}</td>
                          <td className="py-2 px-3 text-right font-mono">{row.total.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-mono">{row.preInvestment.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-mono">{row.y2026.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-mono">{row.y2027.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-mono">{row.y2028.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-mono">{row.y2029.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-mono">{row.y2030.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-mono">{row.postTerm.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {pledge.budgetInfo.notes && (
                  <p className="text-[11px] text-slate-500 italic mt-1 leading-relaxed">
                    ※ {pledge.budgetInfo.notes}
                  </p>
                )}

                {/* Alternatives (e.g. 4-06) */}
                {pledge.budgetInfo.alternatives && pledge.budgetInfo.alternatives.length > 0 && (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 mt-2 space-y-1.5">
                    <div className="font-semibold text-xs text-slate-800">
                      검토 대안별 사업비 (중복 왜곡 방지를 위해 합산에서 분리)
                    </div>
                    {pledge.budgetInfo.alternatives.map((alt, i) => (
                      <div key={i} className="text-xs text-slate-700 flex items-center justify-between">
                        <span>• {alt.name} ({alt.section})</span>
                        <span className="font-bold text-blue-700">{alt.amountText}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* 4. 사업목표 (최종 목표 vs 임기 내 목표) */}
              <section id="sec-goals" className="space-y-2">
                <h2 className="text-sm font-bold text-slate-900 border-l-4 border-blue-600 pl-2.5">
                  4. 사업목표 (최종 목표 vs 임기 내 목표)
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-blue-50/50 rounded-lg border border-blue-200/60">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold text-blue-900 uppercase">최종 목표 (완공/개통)</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">
                        {pledge.finalGoalAchieved ? '달성' : '추진중'}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-900">{pledge.finalGoal}</div>
                  </div>

                  <div className="p-3.5 bg-emerald-50/50 rounded-lg border border-emerald-200/60">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold text-emerald-900 uppercase">임기 내 목표 (착공/설계)</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                        {pledge.termGoalAchieved ? '달성' : '추진중'}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-900">{pledge.termGoal}</div>
                  </div>
                </div>
              </section>

              {/* 5. 연도별 추진계획 및 실적 */}
              <section id="sec-yearly" className="space-y-2">
                <h2 className="text-sm font-bold text-slate-900 border-l-4 border-blue-600 pl-2.5">
                  5. 연도별 추진계획 및 실적
                </h2>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200">
                        <th className="py-2.5 px-3 w-28 whitespace-nowrap">연도구분</th>
                        <th className="py-2.5 px-3 min-w-[200px]">추진계획</th>
                        <th className="py-2.5 px-3 min-w-[200px]">실적</th>
                        <th className="py-2.5 px-3 min-w-[150px] whitespace-nowrap">누적추진율</th>
                        <th className="py-2.5 px-3 text-center w-20 whitespace-nowrap">구분</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pledge.yearlyPlans.map((plan, idx) => {
                        const num = parseProgressNumber(plan.progressRate);
                        return (
                          <tr key={idx} className="hover:bg-slate-50/40">
                            <td className="py-2 px-3 font-semibold text-slate-800 whitespace-nowrap">
                              {plan.yearRange}
                            </td>
                            <td className="py-2 px-3 text-slate-700 leading-relaxed whitespace-pre-line">
                              {plan.plan}
                            </td>
                            <td className="py-2 px-3 text-slate-700 leading-relaxed whitespace-pre-line">
                              {plan.performance || '-'}
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap">
                              {num === null ? (
                                <span className="font-mono text-slate-400 block text-center">-</span>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-blue-700 w-10 text-right shrink-0">
                                    {plan.progressRate}
                                  </span>
                                  <div className="w-16 sm:w-20 bg-slate-200/90 rounded-full h-2 overflow-hidden shrink-0">
                                    <div
                                      className={`h-full rounded-full transition-all duration-300 ${
                                        num === 100
                                          ? 'bg-emerald-500'
                                          : num >= 50
                                            ? 'bg-blue-600'
                                            : num > 0
                                              ? 'bg-blue-500'
                                              : 'bg-slate-300'
                                      }`}
                                      style={{ width: `${num}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center whitespace-nowrap">
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                plan.progressType === 'actual'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {plan.progressType === 'actual' ? '실적' : '계획'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* 6. 날짜별 추진실적 타임라인 */}
              <section id="sec-milestones" className="space-y-2">
                <h2 className="text-sm font-bold text-slate-900 border-l-4 border-blue-600 pl-2.5">
                  6. 날짜별 추진실적 (공식 기록 타임라인)
                </h2>
                <div className="relative pl-6 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {pledge.milestones.map((m, idx) => (
                    <div key={m.id || idx} className="relative group">
                      <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-blue-600 border-2 border-white shadow-2xs" />
                      <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-200/70 hover:border-blue-300 transition">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-mono font-bold text-blue-700">{m.date}</span>
                          {m.isCompleted && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-medium">
                              공식 완료
                            </span>
                          )}
                        </div>
                        <div className="font-semibold text-slate-800 text-xs">{m.title}</div>
                        {m.details && (
                          <div className="text-[11px] text-slate-600 mt-1 leading-relaxed">{m.details}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 7. 쟁점사항 및 해소방안 */}
              <section id="sec-issues" className="space-y-3">
                <h2 className="text-sm font-bold text-slate-900 border-l-4 border-blue-600 pl-2.5">
                  7. 쟁점사항(문제점) 및 해소방안
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-200/80 space-y-2">
                    <div className="font-bold text-xs text-rose-900 flex items-center gap-1.5">
                      <AlertTriangle size={14} className="text-rose-600" />
                      <span>주요 쟁점사항(문제점)</span>
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-700">
                      {pledge.issuesAndSolutions.issues.map((iss, i) => (
                        <li key={i} className="flex items-start gap-1.5 leading-relaxed">
                          <span className="text-rose-500 font-bold shrink-0">•</span>
                          <span>{iss}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200/80 space-y-2">
                    <div className="font-bold text-xs text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      <span>해소 방안</span>
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-700">
                      {pledge.issuesAndSolutions.solutions.map((sol, i) => (
                        <li key={i} className="flex items-start gap-1.5 leading-relaxed">
                          <span className="text-emerald-500 font-bold shrink-0">•</span>
                          <span>{sol}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>

              {/* 8. 향후계획 */}
              <section id="sec-future" className="space-y-2">
                <h2 className="text-sm font-bold text-slate-900 border-l-4 border-blue-600 pl-2.5">
                  8. 향후계획
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {pledge.futurePlans.map((fp) => (
                    <div key={fp.id} className="p-3 bg-slate-50/70 rounded-lg border border-slate-200/60">
                      <div className="font-mono text-[11px] font-bold text-blue-700 mb-1">{fp.year}</div>
                      <div className="text-xs text-slate-800 leading-relaxed">{fp.content}</div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Special Extra Tables (e.g. GTX-B Section details) */}
              {pledge.extraTables && pledge.extraTables.length > 0 && (
                <section className="space-y-3">
                  {pledge.extraTables.map((et, i) => (
                    <div key={i} className="space-y-2">
                      <h3 className="text-sm font-bold text-slate-900 border-l-4 border-indigo-600 pl-2.5">
                        {et.title}
                      </h3>
                      <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                              {et.headers.map((h, hi) => (
                                <th key={hi} className="py-2.5 px-3 whitespace-nowrap">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {et.rows.map((row, ri) => (
                              <tr key={ri} className="hover:bg-slate-50/40">
                                {row.map((cell, ci) => (
                                  <td key={ci} className="py-2 px-3">
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {et.notes && <div className="text-[11px] text-slate-500 italic">※ {et.notes}</div>}
                    </div>
                  ))}
                </section>
              )}

              {/* 9. 참고자료 */}
              <section id="sec-references" className="space-y-2">
                <h2 className="text-sm font-bold text-slate-900 border-l-4 border-blue-600 pl-2.5">
                  9. 참고자료 (노선도 및 도면 자료)
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {pledge.references.map((ref) => (
                    <div
                      key={ref.id}
                      className="p-3.5 bg-slate-50 rounded-lg border border-slate-200/80 hover:border-blue-400 transition"
                    >
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-bold text-slate-800">{ref.title}</span>
                        <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded font-mono">
                          PDF {ref.page}쪽
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">{ref.caption}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* 10. 사용자 추가 섹션 (메모, 특이사항) */}
              {pledge.customSections && pledge.customSections.length > 0 && (
                <section className="space-y-3 pt-4 border-t border-slate-200">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                    <Bookmark size={15} className="text-purple-600" />
                    <span>사용자 추가 섹션 (3방향 병합 시 영구 보존됨)</span>
                  </div>
                  {pledge.customSections.map((cs) => (
                    <div key={cs.id} className="p-3.5 bg-purple-50/40 rounded-lg border border-purple-200/60">
                      <div className="font-bold text-xs text-purple-900 mb-1">{cs.title}</div>
                      <div className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                        {cs.content}
                      </div>
                    </div>
                  ))}
                </section>
              )}
            </div>
          ) : (
            /* TAB 2: Discussions & Internal Work Memos */
            <div className="p-6 space-y-6">
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-slate-700">
                <span className="font-bold text-blue-900">공동 협업 공간: </span>
                <span>
                  회의 내용, 관계기관 협의 메모, 실적 근거 메모를 자유롭게 공유하세요.
                  내부 업무 메모는 공개 열람 모드에서 마스킹 처리되어 안전합니다.
                </span>
              </div>

              {/* Comments list */}
              <div className="space-y-3">
                {discussions.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    등록된 토론이나 업무 메모가 없습니다. 첫 의견을 남겨보세요.
                  </div>
                ) : (
                  discussions.map((d) => {
                    const isMasked = isPublicMode && d.isInternalMemo;
                    return (
                      <div
                        key={d.id}
                        className={`p-3.5 rounded-xl border text-xs transition ${
                          d.isInternalMemo
                            ? 'bg-amber-50/40 border-amber-200/80'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{d.author}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                              {d.role}
                            </span>
                            {d.isInternalMemo && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-semibold flex items-center gap-1">
                                <Lock size={9} /> 내부 업무메모
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">{d.createdAt}</span>
                        </div>
                        <div className="text-slate-800 leading-relaxed whitespace-pre-line">
                          {isMasked ? '※ 내부 비공개 메모입니다 (공개 모드 보호)' : d.content}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add comment form */}
              {userRole !== 'viewer' ? (
                <form onSubmit={handleSubmitComment} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">새 업무 메모 또는 토론 작성</span>
                    <label className="flex items-center gap-1.5 text-xs text-amber-900 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isInternalMemo}
                        onChange={(e) => setIsInternalMemo(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-0"
                      />
                      <span>내부 전용 메모로 등록</span>
                    </label>
                  </div>

                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="회의 결과, 쟁점 협의 상황, 수치 산출 근거를 기록하세요..."
                    rows={3}
                    className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmitting || !newComment.trim()}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition flex items-center gap-1.5"
                    >
                      <Send size={12} />
                      <span>{isSubmitting ? '등록 중...' : '메모 등록'}</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-3 bg-slate-100 rounded-lg text-slate-500 text-xs text-center">
                  열람자(Viewer) 권한에서는 토론 및 메모를 작성할 수 없습니다.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right 1 Column: Meta Sidebar (Contacts, Links, Backlinks, PDF Source) */}
        <div className="space-y-4">
          {/* Box 1: Administrative Metadata */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3 text-xs">
            <h3 className="font-bold text-slate-900 text-xs pb-2 border-b border-slate-100 flex items-center gap-1.5">
              <Building size={14} className="text-blue-600" />
              <span>기본 정보 및 주관부서</span>
            </h3>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">사업 구분</span>
                <span className="font-semibold text-slate-800">{pledge.isNew} ({pledge.category})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">사업 기간</span>
                <span className="font-semibold text-slate-800">{pledge.period}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">완료 시기</span>
                <span className="font-semibold text-slate-800">{pledge.completionTiming}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">사업 주체</span>
                <span className="font-semibold text-slate-800 text-right">{pledge.leadAgency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">주관 부서</span>
                <span className="font-semibold text-slate-800 text-right">{pledge.department}</span>
              </div>

              {/* Support needed */}
              <div className="flex justify-between pt-1 border-t border-slate-100">
                <span className="text-slate-500">지원 필요사항</span>
                <span className="font-semibold text-slate-800">
                  {pledge.supportNeeded.needed
                    ? pledge.supportNeeded.types.join(', ')
                    : '해당없음'}
                </span>
              </div>
            </div>

            {/* Contacts */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-700 block mb-1.5 flex items-center gap-1">
                <Phone size={11} />
                <span>담당 공무원 연락망</span>
              </span>
              <div className="bg-slate-50 p-2.5 rounded-lg space-y-1 text-[11px] text-slate-600">
                <div className="flex justify-between">
                  <span>과장:</span>
                  <span className="font-medium text-slate-800">
                    {isPublicMode ? '비공개' : pledge.contacts.director}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>팀장:</span>
                  <span className="font-medium text-slate-800">
                    {isPublicMode ? '비공개' : pledge.contacts.teamLeader}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>담당자:</span>
                  <span className="font-medium text-slate-800">
                    {isPublicMode ? '비공개' : pledge.contacts.officer}
                  </span>
                </div>
                {isPublicMode && (
                  <div className="text-[10px] text-amber-700 pt-1">
                    ※ 공개 열람 모드로 개인 전화번호가 보호됩니다.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Box 2: Source PDF Baseline */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2 text-xs">
            <h3 className="font-bold text-slate-900 text-xs pb-2 border-b border-slate-100 flex items-center gap-1.5">
              <FileText size={14} className="text-emerald-600" />
              <span>근거 PDF 원본 정보</span>
            </h3>

            <div className="space-y-1 text-slate-600">
              <div className="flex justify-between">
                <span>파일 이름:</span>
                <span className="font-semibold text-slate-800 truncate max-w-[120px]">
                  {pledge.sourcePdf.fileName}
                </span>
              </div>
              <div className="flex justify-between">
                <span>수록 쪽수:</span>
                <span className="font-mono font-bold text-blue-700">
                  {pledge.sourcePdf.pageRange}쪽
                </span>
              </div>
              <div className="flex justify-between">
                <span>추출 버전:</span>
                <span className="text-slate-800">{pledge.sourcePdf.pdfVersion}</span>
              </div>
            </div>
          </div>

          {/* Box 3: Backlinks (역링크) */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2 text-xs">
            <h3 className="font-bold text-slate-900 text-xs pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>역링크 (이 공약을 참조하는 사업)</span>
              <span className="text-[10px] text-slate-400 font-normal">{backlinks.length}건</span>
            </h3>

            {backlinks.length === 0 ? (
              <p className="text-[11px] text-slate-400 py-1">이 공약을 직접 참조하는 다른 사업이 없습니다.</p>
            ) : (
              <div className="space-y-1.5">
                {backlinks.map((bl) => (
                  <button
                    key={bl.id}
                    onClick={() => onSelectPledge(bl.code)}
                    className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-blue-50 transition border border-slate-200/80 group"
                  >
                    <div className="flex items-center gap-1 font-mono text-blue-700 font-bold text-[11px]">
                      <span>[{bl.code}]</span>
                      <span className="text-slate-800 font-semibold group-hover:text-blue-600 transition truncate">
                        {bl.title}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
