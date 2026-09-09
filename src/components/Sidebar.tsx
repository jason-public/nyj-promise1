/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  LayoutDashboard,
  ListOrdered,
  FileSpreadsheet,
  History,
  Sparkles,
  Train,
  AlertTriangle,
  CheckCircle2,
  Database,
  FileCode2,
} from 'lucide-react';
import { Pledge } from '../types/pledge';

export type ActiveNavTab = 'dashboard' | 'list' | 'map' | 'pdf' | 'history';

interface Props {
  activeTab: ActiveNavTab;
  onSelectTab: (tab: ActiveNavTab) => void;
  pledges: Pledge[];
  selectedPledgeCode?: string;
  onSelectPledge: (code: string) => void;
}

export const Sidebar: React.FC<Props> = ({
  activeTab,
  onSelectTab,
  pledges,
  selectedPledgeCode,
  onSelectPledge,
}) => {
  const needsReviewTotal = pledges.filter((p) => p.needsReview).length;

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 min-h-[calc(100vh-53px)]">
      {/* Primary Navigation Menu */}
      <div className="p-3">
        <div className="text-[11px] font-semibold text-slate-400 px-3 py-1.5 uppercase tracking-wider">
          시스템 메뉴
        </div>
        <nav className="space-y-1 mt-1">
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition text-left ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <LayoutDashboard size={16} />
            <span>종합 대시보드</span>
          </button>

          <button
            onClick={() => onSelectTab('list')}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition text-left ${
              activeTab === 'list'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ListOrdered size={16} />
              <span>공약 목록·관리</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {pledges.length}
            </span>
          </button>

          <button
            onClick={() => onSelectTab('map')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition text-left ${
              activeTab === 'map'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Train size={16} />
            <span>3D 철도망 뷰어</span>
          </button>

          <button
            onClick={() => onSelectTab('pdf')}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition text-left ${
              activeTab === 'pdf'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet size={16} />
              <span>PDF 3방향 갱신</span>
            </div>
            {needsReviewTotal > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <AlertTriangle size={10} /> {needsReviewTotal}
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectTab('history')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition text-left ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <History size={16} />
            <span>변경 이력 감사</span>
          </button>
        </nav>
      </div>

      {/* Direct Pledge Jump List */}
      <div className="px-3 py-2 flex-1 overflow-y-auto border-t border-slate-800/80">
        <div className="flex items-center justify-between px-3 py-1.5">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            철도교통 공약 목록
          </span>
          <span className="text-[10px] text-slate-400">{pledges.length}건</span>
        </div>

        <div className="space-y-1 mt-1">
          {pledges.map((p) => {
            const isSelected = selectedPledgeCode === p.code;
            return (
              <button
                key={p.id}
                onClick={() => onSelectPledge(p.code)}
                className={`w-full group text-left px-2.5 py-2 rounded-lg text-xs transition flex items-start gap-2 ${
                  isSelected
                    ? 'bg-blue-900/60 border border-blue-500/40 text-blue-200'
                    : 'hover:bg-slate-800/70 text-slate-300'
                }`}
              >
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-mono rounded shrink-0 ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-300 group-hover:bg-slate-700'
                  }`}
                >
                  {p.code}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium leading-tight">{p.title}</div>
                  <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400">
                    <span className="truncate">{p.stage}</span>
                    <span>•</span>
                    <span
                      className={
                        p.scheduleStatus === '지연'
                          ? 'text-rose-400'
                          : p.scheduleStatus === '검토'
                            ? 'text-amber-400'
                            : 'text-slate-400'
                      }
                    >
                      {p.scheduleStatus}
                    </span>
                  </div>
                </div>

                {p.needsReview && (
                  <span
                    title="검토 필요 항목이 있습니다."
                    className="shrink-0 text-amber-400 mt-0.5"
                  >
                    <AlertTriangle size={12} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* System Integrity & Storage Architecture Box */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 text-[11px] text-slate-400 space-y-2">
        <div className="flex items-center gap-1.5 text-slate-300 font-semibold text-xs">
          <Database size={13} className="text-emerald-400" />
          <span>단일 영구 저장소 (SQLite)</span>
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed">
          모든 공약은 YAML front-matter와 마크다운으로 단일 기준본을 이루며, 재시작 후에도 안전하게 유지됩니다.
        </p>
        <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <FileCode2 size={11} /> Round-trip MD
          </span>
          <span>•</span>
          <span>3-Way Merge 보호</span>
        </div>
      </div>
    </aside>
  );
};
