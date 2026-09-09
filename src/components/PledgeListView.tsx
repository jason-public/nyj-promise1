/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  LayoutGrid,
  Table as TableIcon,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  Edit3,
} from 'lucide-react';
import { Pledge, UserRole } from '../types/pledge';

interface Props {
  pledges: Pledge[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectPledge: (code: string) => void;
  onEditPledge: (pledge: Pledge) => void;
  userRole: UserRole;
}

export const PledgeListView: React.FC<Props> = ({
  pledges,
  searchQuery,
  onSearchChange,
  onSelectPledge,
  onEditPledge,
  userRole,
}) => {
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [timingFilter, setTimingFilter] = useState<string>('all');
  const [onlyReviewNeeded, setOnlyReviewNeeded] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [sortBy, setSortBy] = useState<'code' | 'title' | 'budget' | 'stage'>('code');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Filtered and sorted pledges
  const filteredPledges = useMemo(() => {
    return pledges
      .filter((p) => {
        if (onlyReviewNeeded && !p.needsReview) return false;
        if (stageFilter !== 'all' && p.stage !== stageFilter) return false;
        if (statusFilter !== 'all' && p.scheduleStatus !== statusFilter) return false;
        if (timingFilter !== 'all' && p.completionTiming !== timingFilter) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchCode = p.code.toLowerCase().includes(q);
          const matchTitle = p.title.toLowerCase().includes(q);
          const matchDept = p.department.toLowerCase().includes(q);
          const matchPurpose = p.purpose.toLowerCase().includes(q);
          const matchTag = p.tags.some((t) => t.toLowerCase().includes(q));
          if (!matchCode && !matchTitle && !matchDept && !matchPurpose && !matchTag) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortBy === 'code') {
          cmp = a.code.localeCompare(b.code, undefined, { numeric: true });
        } else if (sortBy === 'title') {
          cmp = a.title.localeCompare(b.title);
        } else if (sortBy === 'budget') {
          cmp = (a.budgetInfo.normalizedKrwBillion || 0) - (b.budgetInfo.normalizedKrwBillion || 0);
        } else if (sortBy === 'stage') {
          cmp = a.stage.localeCompare(b.stage);
        }
        return sortAsc ? cmp : -cmp;
      });
  }, [pledges, searchQuery, stageFilter, statusFilter, timingFilter, onlyReviewNeeded, sortBy, sortAsc]);

  const handleSort = (field: 'code' | 'title' | 'budget' | 'stage') => {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(true);
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Title & View mode switch */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">공약사항 목록 및 관리</h2>
          <p className="text-xs text-slate-500">
            총 {pledges.length}건 중 검색·필터 결과 {filteredPledges.length}건
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Review items quick filter toggle */}
          <button
            onClick={() => setOnlyReviewNeeded(!onlyReviewNeeded)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
              onlyReviewNeeded
                ? 'bg-amber-100 border-amber-300 text-amber-900'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle size={13} className={onlyReviewNeeded ? 'text-amber-700' : 'text-slate-400'} />
            <span>검토필요 항목만 ({pledges.filter((p) => p.needsReview).length})</span>
          </button>

          {/* Table vs Card view switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
              title="표 형식 보기"
            >
              <TableIcon size={14} />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-md transition ${
                viewMode === 'cards' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
              title="카드 형식 보기"
            >
              <LayoutGrid size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500 font-medium">
          <Filter size={14} />
          <span>필터:</span>
        </div>

        {/* Stage Filter */}
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">전체 추진단계</option>
          <option value="구상">구상</option>
          <option value="사전타당성">사전타당성</option>
          <option value="예비타당성">예비타당성</option>
          <option value="기본계획">기본계획</option>
          <option value="기본설계">기본설계</option>
          <option value="실시설계">실시설계</option>
          <option value="착공">착공</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">전체 추진상태</option>
          <option value="정상추진">정상추진</option>
          <option value="지연">지연 (유찰/공정지연)</option>
          <option value="검토">검토 (관계기관협의)</option>
        </select>

        {/* Completion Timing Filter */}
        <select
          value={timingFilter}
          onChange={(e) => setTimingFilter(e.target.value)}
          className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">전체 완료시기</option>
          <option value="임기내">임기내 (2026~2028)</option>
          <option value="임기후">임기후 (2029~2032)</option>
        </select>

        {/* Reset Filter */}
        {(stageFilter !== 'all' || statusFilter !== 'all' || timingFilter !== 'all' || onlyReviewNeeded || searchQuery) && (
          <button
            onClick={() => {
              setStageFilter('all');
              setStatusFilter('all');
              setTimingFilter('all');
              setOnlyReviewNeeded(false);
              onSearchChange('');
            }}
            className="text-slate-500 hover:text-slate-800 underline ml-auto"
          >
            필터 초기화
          </button>
        )}
      </div>

      {/* Main Content Area */}
      {filteredPledges.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200 text-slate-500">
          <p className="text-sm font-medium text-slate-700">검색 및 필터 조건에 부합하는 공약사항이 없습니다.</p>
          <p className="text-xs text-slate-400 mt-1">검색어를 지우거나 필터를 초기화해 보세요.</p>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                <th
                  onClick={() => handleSort('code')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>관리번호</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('title')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition min-w-[220px]"
                >
                  <div className="flex items-center gap-1">
                    <span>공약명 (사업명)</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="py-3 px-4 whitespace-nowrap">주관부서 / 사업량</th>
                <th
                  onClick={() => handleSort('stage')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>추진단계</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="py-3 px-4 whitespace-nowrap">일정상태</th>
                <th
                  onClick={() => handleSort('budget')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>총사업비 (정규화)</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="py-3 px-4 whitespace-nowrap">완료시기</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">관리 작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPledges.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-blue-50/40 transition group cursor-pointer"
                  onClick={() => onSelectPledge(p.code)}
                >
                  <td className="py-3 px-4 font-mono font-bold text-blue-700 whitespace-nowrap">
                    <span className="bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                      [{p.code}]
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-900">
                    <div className="flex items-center gap-1.5">
                      <span className="group-hover:text-blue-600 transition font-bold">{p.title}</span>
                      {p.needsReview && (
                        <span
                          title={p.reviewReasons.join(', ')}
                          className="px-1.5 py-0.2 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] rounded shrink-0 flex items-center gap-0.5"
                        >
                          <AlertTriangle size={10} /> 검토필요
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{p.purpose}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                    <div className="font-medium text-slate-800">{p.department}</div>
                    <div className="text-[11px] text-slate-400 truncate max-w-[140px]">
                      {p.overview.scope || p.overview.section}
                    </div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium text-[11px]">
                      {p.stage}
                    </span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        p.scheduleStatus === '지연'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : p.scheduleStatus === '검토'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {p.scheduleStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="font-bold text-slate-900">
                      {p.budgetInfo.isUndetermined ? (
                        <span className="text-amber-700 font-normal">미정(대안검토)</span>
                      ) : p.budgetInfo.normalizedKrwBillion > 0 ? (
                        `${p.budgetInfo.normalizedKrwBillion.toLocaleString()}억 원`
                      ) : (
                        <span className="text-slate-400 font-normal">미산정</span>
                      )}
                    </div>
                    {p.budgetInfo.sharedBudgetId && (
                      <div className="text-[10px] text-blue-600 font-medium">공유예산 항목</div>
                    )}
                    {p.budgetInfo.localBurdenBillion ? (
                      <div className="text-[10px] text-slate-500">
                        시비 {p.budgetInfo.localBurdenBillion}억원
                      </div>
                    ) : null}
                  </td>
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                    <span className="text-[11px]">{p.completionTiming}</span>
                    <div className="text-[10px] text-slate-400">{p.period}</div>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onSelectPledge(p.code)}
                        className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                      >
                        열람
                      </button>
                      {userRole !== 'viewer' && (
                        <button
                          onClick={() => onEditPledge(p)}
                          className="px-2.5 py-1 text-xs font-semibold rounded bg-blue-50 hover:bg-blue-100 text-blue-700 transition flex items-center gap-1"
                        >
                          <Edit3 size={11} />
                          <span>수정</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPledges.map((p) => (
            <div
              key={p.id}
              onClick={() => onSelectPledge(p.code)}
              className="group bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:shadow-md transition cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      [{p.code}]
                    </span>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {p.stage}
                    </span>
                  </div>

                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
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

                <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition leading-snug">
                  {p.title}
                </h3>

                <p className="text-xs text-slate-500 line-clamp-2 mt-2 leading-relaxed">
                  {p.purpose}
                </p>

                {p.needsReview && (
                  <div className="mt-2.5 p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 flex items-start gap-1.5">
                    <AlertTriangle size={12} className="shrink-0 mt-0.5 text-amber-600" />
                    <span>{p.reviewReasons.join(' / ')}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 truncate">{p.department}</span>
                <span className="font-bold text-slate-900">
                  {p.budgetInfo.isUndetermined
                    ? '미정(대안)'
                    : p.budgetInfo.normalizedKrwBillion > 0
                      ? `${p.budgetInfo.normalizedKrwBillion.toLocaleString()}억`
                      : '미산정'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
