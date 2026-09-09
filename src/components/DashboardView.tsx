/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Coins,
  Building2,
  Calendar,
  Layers,
  ArrowUpRight,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Info,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { Pledge, SharedBudget } from '../types/pledge';
import { ThreeTransitMap } from './ThreeTransitMap';

interface Props {
  pledges: Pledge[];
  sharedBudgets: SharedBudget[];
  onSelectPledge: (code: string) => void;
  onOpenPdfUpload: () => void;
}

export const DashboardView: React.FC<Props> = ({
  pledges,
  sharedBudgets,
  onSelectPledge,
  onOpenPdfUpload,
}) => {
  const [showBudgetBreakdown, setShowBudgetBreakdown] = useState<boolean>(false);

  // Statistics calculation adhering strictly to business rules
  const totalCount = pledges.length;
  const termAchievedCount = pledges.filter((p) => p.termGoalAchieved).length;
  const finalAchievedCount = pledges.filter((p) => p.finalGoalAchieved).length;
  const reviewNeededCount = pledges.filter((p) => p.needsReview).length;

  // Deduplicated budget calculation
  // 1) Add shared budget items once
  let totalDeduplicatedBillion = 0;
  sharedBudgets.forEach((sb) => {
    totalDeduplicatedBillion += sb.totalBudgetBillion;
  });

  // 2) Add individual pledges not covered by shared budget and not marked undetermined
  let localBurdenBillion = 0;
  pledges.forEach((p) => {
    if (!p.budgetInfo.isUndetermined && !p.budgetInfo.sharedBudgetId) {
      totalDeduplicatedBillion += p.budgetInfo.normalizedKrwBillion;
    }
    if (p.budgetInfo.localBurdenBillion) {
      localBurdenBillion += p.budgetInfo.localBurdenBillion;
    }
  });

  // Stage counts
  const stageOrder = ['구상', '사전타당성', '예비타당성', '기본계획', '기본설계', '실시설계', '착공', '준공'];
  const stageCounts: Record<string, number> = {};
  stageOrder.forEach((s) => (stageCounts[s] = 0));
  pledges.forEach((p) => {
    stageCounts[p.stage] = (stageCounts[p.stage] || 0) + 1;
  });

  // Schedule status counts
  const scheduleCounts = {
    normal: pledges.filter((p) => p.scheduleStatus === '정상추진').length,
    delayed: pledges.filter((p) => p.scheduleStatus === '지연').length,
    review: pledges.filter((p) => p.scheduleStatus === '검토').length,
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Three.js Interactive 3D Transit Visualization at Top */}
      <ThreeTransitMap onSelectPledge={onSelectPledge} />

      {/* 2. Top Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Pledges */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">전체 관리 공약</span>
            <Building2 size={16} className="text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{totalCount}</span>
            <span className="text-xs font-medium text-slate-500">개 사업</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span>남양주시 제8기 철도교통망 공약</span>
          </div>
        </div>

        {/* Card 2: Term Goal vs Final Goal */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">임기 내 목표 달성</span>
            <Calendar size={16} className="text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{termAchievedCount}</span>
            <span className="text-xs text-slate-400">/ {totalCount}건 완료</span>
            <span className="text-[11px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded ml-auto">
              추진중 {totalCount - termAchievedCount}건
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 leading-tight">
            ※ 착공·예타통과 등 임기 내 목표와 완공(최종)을 엄격히 구분하여 관리합니다.
          </div>
        </div>

        {/* Card 3: Final Goal Achieved */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">최종 준공·개통 달성</span>
            <CheckCircle size={16} className="text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{finalAchievedCount}</span>
            <span className="text-xs text-slate-400">/ {totalCount}건 완공</span>
            <span className="text-[11px] font-medium text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded ml-auto">
              중장기 사업
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 leading-tight">
            철도 광역교통 특성상 최종 준공은 2030~2032년에 완공 목표를 둡니다.
          </div>
        </div>

        {/* Card 4: Deduplicated Budget */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">중복제거 총사업비</span>
            <Coins size={16} className="text-teal-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900">
              {(totalDeduplicatedBillion / 10000).toFixed(2)}
            </span>
            <span className="text-sm font-semibold text-slate-700">조 원</span>
            <span className="text-[10px] text-slate-500 ml-1">
              ({totalDeduplicatedBillion.toLocaleString()}억원)
            </span>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">남양주 시비 확정 분담:</span>
            <span className="font-bold text-blue-700">{localBurdenBillion.toFixed(1)}억 원</span>
          </div>

          <button
            onClick={() => setShowBudgetBreakdown(!showBudgetBreakdown)}
            className="w-full mt-2 flex items-center justify-center gap-1 text-[11px] text-blue-700 font-medium hover:underline pt-1"
          >
            <span>예산 합산 기준 & 공유 항목</span>
            {showBudgetBreakdown ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>

      {/* Expandable Budget Integrity Explanation Panel */}
      {showBudgetBreakdown && (
        <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 text-xs text-slate-700 animate-in fade-in duration-200">
          <div className="flex items-start gap-2 mb-3">
            <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-blue-900 text-sm">
                공약위키 예산 무결성 관리 기준 (중복 합산 방지 & 미산정 처리)
              </div>
              <p className="text-slate-600 mt-1">
                공공 철도사업은 단일 노선에 여러 세부 공약이 연결되어 있어 단순 합산 시 심각한 중복 왜곡이 발생합니다.
                공약위키는 다음과 같은 엄격한 규칙으로 계산합니다:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <div className="bg-white p-3 rounded-lg border border-blue-200/80">
              <div className="font-semibold text-blue-800 mb-1 flex items-center justify-between">
                <span>1. 공유 예산 1회 합산</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-mono">
                  2조 9,334억
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                [4-01 9호선 조기착공]과 [4-02 945역사 출입구 증설]은 동일한 ‘강동하남남양주선 광역철도’ 기본계획 예산을 공유하므로 1회만 합산합니다.
              </p>
            </div>

            <div className="bg-white p-3 rounded-lg border border-blue-200/80">
              <div className="font-semibold text-blue-800 mb-1 flex items-center justify-between">
                <span>2. 미정 예산 & 검토 대안</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                  합산 제외
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                [4-06 경춘선-수인분당선]은 대안별 검토 금액(춘천 직결 531억 vs 마석 직결 281억)이 제시되어 총액 합산에서 제외하고 비고로 관리합니다.
              </p>
            </div>

            <div className="bg-white p-3 rounded-lg border border-blue-200/80">
              <div className="font-semibold text-blue-800 mb-1 flex items-center justify-between">
                <span>3. 국가철도망 미산정 주석</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                  미산정 명시
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                [4-04 8호선 의정부 연장], [4-05 3호선 덕소 연장]은 국가철도망 구축계획 건의 단계로 총사업비가 확정되지 않아 0원으로 왜곡하지 않고 ‘미산정’으로 표기합니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Progress Tracking: Stages & Schedule Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Pipeline Stage Visualizer */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">추진 단계별 파이프라인</h3>
              <p className="text-xs text-slate-500">구상 단계부터 준공까지의 공약 분포 현황</p>
            </div>
            <span className="text-xs font-medium text-slate-500">총 {totalCount}건 공약</span>
          </div>

          {/* Stepper progress bars */}
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {stageOrder.map((stg) => {
              const count = stageCounts[stg] || 0;
              const hasPledges = count > 0;
              return (
                <div
                  key={stg}
                  className={`p-2.5 rounded-lg border text-center transition ${
                    hasPledges
                      ? 'bg-blue-50/80 border-blue-300 text-blue-900 shadow-2xs'
                      : 'bg-slate-50/50 border-slate-100 text-slate-400'
                  }`}
                >
                  <div className="text-[11px] font-semibold truncate">{stg}</div>
                  <div
                    className={`text-lg font-bold mt-1 ${
                      hasPledges ? 'text-blue-700' : 'text-slate-300'
                    }`}
                  >
                    {count}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {hasPledges ? `${Math.round((count / totalCount) * 100)}%` : '-'}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
              <span>현재 기본계획 수립 및 설계 추진 공약이 집중 분포(4건)되어 있습니다.</span>
            </span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">실시계획 승인 후 착공 전환 예정</span>
          </div>
        </div>

        {/* Right Col: Schedule Health & Risk Status */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900">일정 추진 건전도</h3>
              <TrendingUp size={16} className="text-slate-400" />
            </div>
            <p className="text-xs text-slate-500 mb-4">공정 계획 대비 추진 상태 모니터링</p>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <span className="flex items-center gap-1.5 text-emerald-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> 정상추진
                  </span>
                  <span className="text-slate-700">
                    {scheduleCounts.normal}건 ({Math.round((scheduleCounts.normal / totalCount) * 100)}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${(scheduleCounts.normal / totalCount) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <span className="flex items-center gap-1.5 text-rose-700">
                    <span className="w-2 h-2 rounded-full bg-rose-500" /> 지연우려 (턴키 유찰 등)
                  </span>
                  <span className="text-slate-700">
                    {scheduleCounts.delayed}건 ({Math.round((scheduleCounts.delayed / totalCount) * 100)}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full"
                    style={{ width: `${(scheduleCounts.delayed / totalCount) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <span className="flex items-center gap-1.5 text-amber-700">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> 관계기관 협의·검토
                  </span>
                  <span className="text-slate-700">
                    {scheduleCounts.review}건 ({Math.round((scheduleCounts.review / totalCount) * 100)}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${(scheduleCounts.review / totalCount) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={onOpenPdfUpload}
              className="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 transition flex items-center justify-center gap-1.5"
            >
              <span>PDF 재업로드로 일정 최신화</span>
              <ArrowUpRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Critical Issues & Actionable Risk Monitoring */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <AlertTriangle size={17} className="text-amber-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">주요 쟁점사항(문제점) 및 해소방안 모니터링</h3>
              <p className="text-[11px] text-slate-500">원문 보고서에서 식별된 주요 현안과 부서 조치 방향</p>
            </div>
          </div>
          <span className="text-xs text-slate-500">실시간 협업 대상</span>
        </div>

        <div className="divide-y divide-slate-100">
          {/* Issue 1: 9호선 2·5공구 턴키 유찰 */}
          <div className="p-4 hover:bg-slate-50/60 transition flex flex-col md:flex-row items-start justify-between gap-3">
            <div className="space-y-1 max-w-3xl">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-100 text-blue-800">
                  4-01 / 4-02
                </span>
                <span className="text-xs font-bold text-slate-900">9호선 연장 (강동하남남양주선)</span>
                <span className="text-[10px] font-medium text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                  턴키 유찰
                </span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                <strong>쟁점</strong>: 경기도 시행 2·5공구 턴키(설계시공일괄) 입찰이 연이어 단독 응찰로 유찰됨에 따라 2026년 상반기 전 공구 착공 목표에 차질 우려.
              </p>
              <p className="text-xs text-blue-800 leading-relaxed">
                <strong>해소방안</strong>: 경기도 및 국토부와 신속 협의하여 수의계약 전환 및 우선시공분(Fast-Track) 도입 검토, 총사업비 증액 현실화 반영.
              </p>
            </div>
            <button
              onClick={() => onSelectPledge('4-01')}
              className="shrink-0 text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 mt-1 md:mt-0"
            >
              <span>위키 문서 확인</span>
              <ArrowUpRight size={13} />
            </button>
          </div>

          {/* Issue 2: 8호선 별내선 중앙역 제외 후 별도 추진 */}
          <div className="p-4 hover:bg-slate-50/60 transition flex flex-col md:flex-row items-start justify-between gap-3">
            <div className="space-y-1 max-w-3xl">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-rose-100 text-rose-800">
                  4-03
                </span>
                <span className="text-xs font-bold text-slate-900">8호선 별내선 (별내별가람 연장)</span>
                <span className="text-[10px] font-medium text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                  예타 대응
                </span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                <strong>쟁점</strong>: 선행 예타 조사 시 (가칭)중앙역 포함으로 경제성(B/C)이 낮아 타결 곤란.
              </p>
              <p className="text-xs text-blue-800 leading-relaxed">
                <strong>해소방안</strong>: 중앙역을 본선 예타에서 제외하고 본선 우선 통과 추진 후 중앙역 별도 신설 방안 투트랙 강구.
              </p>
            </div>
            <button
              onClick={() => onSelectPledge('4-03')}
              className="shrink-0 text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 mt-1 md:mt-0"
            >
              <span>위키 문서 확인</span>
              <ArrowUpRight size={13} />
            </button>
          </div>

          {/* Issue 3: 경춘선-수인분당선 선로용량 부족 */}
          <div className="p-4 hover:bg-slate-50/60 transition flex flex-col md:flex-row items-start justify-between gap-3">
            <div className="space-y-1 max-w-3xl">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-teal-100 text-teal-800">
                  4-06
                </span>
                <span className="text-xs font-bold text-slate-900">경춘선·수인분당선 직결 운행</span>
                <span className="text-[10px] font-medium text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                  선로용량 한계
                </span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                <strong>쟁점</strong>: 청량리~망우 및 왕십리 구간 선로용량 포화로 직결 열차 투입 불가 판정.
              </p>
              <p className="text-xs text-blue-800 leading-relaxed">
                <strong>해소방안</strong>: 국토부 ‘왕십리~청량리 단선전철 신설’ 국가사업과 연계 추진하여 2029년 이후 단계적 직결 관철.
              </p>
            </div>
            <button
              onClick={() => onSelectPledge('4-06')}
              className="shrink-0 text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 mt-1 md:mt-0"
            >
              <span>위키 문서 확인</span>
              <ArrowUpRight size={13} />
            </button>
          </div>

          {/* Issue 4: GTX-B 화도 답내리 차량기지 민원 */}
          <div className="p-4 hover:bg-slate-50/60 transition flex flex-col md:flex-row items-start justify-between gap-3">
            <div className="space-y-1 max-w-3xl">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-100 text-indigo-800">
                  4-07-1
                </span>
                <span className="text-xs font-bold text-slate-900">GTX-B 노선 조기 착공</span>
                <span className="text-[10px] font-medium text-red-700 bg-red-50 px-1.5 py-0.2 rounded border border-red-200">
                  차량기지 민원
                </span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                <strong>쟁점</strong>: 화도읍 답내리 차량기지 인근 10호 주민 이주대책 요구 및 진입도로(시도8호선) 확장 민원 대두.
              </p>
              <p className="text-xs text-blue-800 leading-relaxed">
                <strong>해소방안</strong>: 민자사업시행자(SG레일) 및 국토부 협의체 가동, 실시계획 승인 시 이주택지 및 차음벽 시설 반영 조치.
              </p>
            </div>
            <button
              onClick={() => onSelectPledge('4-07-1')}
              className="shrink-0 text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 mt-1 md:mt-0"
            >
              <span>위키 문서 확인</span>
              <ArrowUpRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Quick Pledge Directory Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900">전체 공약 바로가기</h3>
          <span className="text-xs text-slate-500">카드를 누르면 공약 상세 위키로 이동합니다</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pledges.map((p) => (
            <div
              key={p.id}
              onClick={() => onSelectPledge(p.code)}
              className="group bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:shadow-md transition cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    [{p.code}]
                  </span>
                  <span
                    className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                      p.scheduleStatus === '지연'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : p.scheduleStatus === '검토'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {p.scheduleStatus}
                  </span>
                </div>

                <h4 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition leading-snug">
                  {p.title}
                </h4>

                <p className="text-xs text-slate-500 line-clamp-2 mt-1.5 leading-relaxed">
                  {p.purpose}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="truncate">{p.department}</span>
                <span className="font-semibold text-slate-700">
                  {p.budgetInfo.isUndetermined
                    ? '미정(대안검토)'
                    : p.budgetInfo.normalizedKrwBillion > 0
                      ? `${p.budgetInfo.normalizedKrwBillion.toLocaleString()}억`
                      : '미산정'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
