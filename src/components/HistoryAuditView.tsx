/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  ArrowRight,
  User,
  Clock,
  FileSpreadsheet,
  Edit3,
  RotateCcw,
} from 'lucide-react';
import { Pledge, PledgeVersion } from '../types/pledge';
import { DesktopStorageService } from '../services/desktopStorage';

interface Props {
  pledges: Pledge[];
  onSelectPledge: (code: string) => void;
  onOpenHistoryForPledge: (pledge: Pledge) => void;
}

export const HistoryAuditView: React.FC<Props> = ({
  pledges,
  onSelectPledge,
  onOpenHistoryForPledge,
}) => {
  const [allHistory, setAllHistory] = useState<(PledgeVersion & { pledgeTitle?: string; pledgeCode?: string })[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    // Load history for all pledges
    const fetchAll = async () => {
      setLoading(true);
      try {
        // Load instantly from local desktop storage
        const localAll = DesktopStorageService.getAllHistory();
        if (localAll.length > 0) {
          setAllHistory(localAll);
        }

        // Try syncing from server if available
        const combined: any[] = [];
        for (const p of pledges) {
          try {
            const res = await fetch(`/api/pledges/${p.code}/history`);
            if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) break;
            const data = await res.json();
            if (data.success && Array.isArray(data.history)) {
              data.history.forEach((h: any) => {
                combined.push({
                  ...h,
                  pledgeTitle: p.title,
                  pledgeCode: p.code,
                });
              });
            }
          } catch {
            // Server offline, stick with localAll
            break;
          }
        }
        if (combined.length > 0) {
          combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setAllHistory(combined);
        }
      } finally {
        setLoading(false);
      }
    };

    if (pledges.length > 0) {
      fetchAll();
    }
  }, [pledges]);

  const filtered = allHistory.filter((item) => {
    if (filterMethod !== 'all' && item.method !== filterMethod) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchCode = item.pledgeCode?.toLowerCase().includes(q);
      const matchTitle = item.pledgeTitle?.toLowerCase().includes(q);
      const matchAuthor = item.author.toLowerCase().includes(q);
      const matchReason = item.reason.toLowerCase().includes(q);
      if (!matchCode && !matchTitle && !matchAuthor && !matchReason) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <History size={18} className="text-blue-600" />
            <span>시스템 전체 변경 이력 감사 (Audit Log)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            모든 공약의 생성, 직접 수정, PDF 재업로드 3방향 병합, 이전 버전 복원 기록이 영구 보존됩니다.
          </p>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          총 {allHistory.length}건의 리비전 기록
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500 font-medium">
          <Filter size={14} />
          <span>필터:</span>
        </div>

        <select
          value={filterMethod}
          onChange={(e) => setFilterMethod(e.target.value)}
          className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">전체 작업 유형</option>
          <option value="PDF_UPDATE">PDF 재업로드 갱신</option>
          <option value="MANUAL_EDIT">직접 수정 (서식/마크다운)</option>
          <option value="VERSION_RESTORE">이전 버전 복원</option>
          <option value="MARKDOWN_IMPORT">마크다운 가져오기</option>
        </select>

        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="공약명, 관리번호, 작성자, 사유 검색..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">전체 이력을 집계 중입니다...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">조건에 부합하는 이력이 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3 px-4 w-28 whitespace-nowrap">작업 시각</th>
                  <th className="py-3 px-4 w-24 whitespace-nowrap">공약 관리번호</th>
                  <th className="py-3 px-4 min-w-[180px]">공약명</th>
                  <th className="py-3 px-4 w-20 text-center whitespace-nowrap">버전</th>
                  <th className="py-3 px-4 w-28 whitespace-nowrap">작업 유형</th>
                  <th className="py-3 px-4 min-w-[240px]">변경 사유 / 작업 요약</th>
                  <th className="py-3 px-4 w-32 whitespace-nowrap">작성자 (권한)</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">비교</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item, idx) => {
                  const targetPledge = pledges.find((p) => p.code === item.pledgeCode);
                  return (
                    <tr key={item.id || idx} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                        {item.createdAt.slice(0, 16)}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-blue-700 whitespace-nowrap">
                        <button
                          onClick={() => item.pledgeCode && onSelectPledge(item.pledgeCode)}
                          className="hover:underline"
                        >
                          [{item.pledgeCode}]
                        </button>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 truncate max-w-xs">
                        {item.pledgeTitle}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-700 whitespace-nowrap">
                        v{item.version}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-medium inline-flex items-center gap-1 ${
                            item.method === 'PDF_UPDATE'
                              ? 'bg-teal-50 text-teal-800 border border-teal-200'
                              : item.method === 'VERSION_RESTORE'
                                ? 'bg-purple-50 text-purple-800 border border-purple-200'
                                : 'bg-blue-50 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {item.method === 'PDF_UPDATE' ? (
                            <FileSpreadsheet size={11} />
                          ) : item.method === 'VERSION_RESTORE' ? (
                            <RotateCcw size={11} />
                          ) : (
                            <Edit3 size={11} />
                          )}
                          <span>
                            {item.method === 'PDF_UPDATE'
                              ? 'PDF 갱신'
                              : item.method === 'VERSION_RESTORE'
                                ? '버전 복원'
                                : '직접 수정'}
                          </span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 leading-relaxed">
                        {item.reason}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                        <div className="font-medium text-slate-800">{item.author}</div>
                        <div className="text-[10px] text-slate-400">({item.role})</div>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {targetPledge && (
                          <button
                            onClick={() => onOpenHistoryForPledge(targetPledge)}
                            className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                          >
                            이력 보기
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
