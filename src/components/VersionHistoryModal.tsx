/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  History,
  RotateCcw,
  CheckCircle2,
  FileText,
  Clock,
  User,
  ArrowRight,
  Download,
  AlertCircle,
} from 'lucide-react';
import { Pledge, PledgeVersion, UserRole } from '../types/pledge';
import { DesktopStorageService } from '../services/desktopStorage';

interface Props {
  pledge: Pledge | null;
  isOpen: boolean;
  onClose: () => void;
  userRole: UserRole;
  onRestoreVersion: (targetVersion: number) => Promise<boolean>;
}

export const VersionHistoryModal: React.FC<Props> = ({
  pledge,
  isOpen,
  onClose,
  userRole,
  onRestoreVersion,
}) => {
  if (!isOpen || !pledge) return null;

  const [historyList, setHistoryList] = useState<PledgeVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number>(pledge.version);
  const [compareVersion, setCompareVersion] = useState<number | null>(
    pledge.version > 1 ? pledge.version - 1 : null,
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [restoring, setRestoring] = useState<boolean>(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (pledge) {
      setLoading(true);
      fetch(`/api/pledges/${pledge.code}/history`)
        .then((res) => {
          if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) {
            throw new Error('API unavailable');
          }
          return res.json();
        })
        .then((data) => {
          if (data.success && Array.isArray(data.history) && data.history.length > 0) {
            setHistoryList(data.history);
          } else {
            const localHistory = DesktopStorageService.getHistory(pledge.code);
            setHistoryList(localHistory);
          }
          setSelectedVersion(pledge.version);
          setCompareVersion(pledge.version > 1 ? pledge.version - 1 : null);
        })
        .catch(() => {
          const localHistory = DesktopStorageService.getHistory(pledge.code);
          setHistoryList(localHistory);
          setSelectedVersion(pledge.version);
          setCompareVersion(pledge.version > 1 ? pledge.version - 1 : null);
        })
        .finally(() => setLoading(false));
    }
  }, [pledge]);

  const handleRestore = async (v: number) => {
    if (!window.confirm(`정말로 버전 v${v}의 내용으로 복원하시겠습니까? 현재 기준 최신 버전(v${pledge.version + 1})으로 새로 등록됩니다.`)) {
      return;
    }
    try {
      setRestoring(true);
      setMsg(null);
      const ok = await onRestoreVersion(v);
      if (ok) {
        setMsg({ type: 'success', text: `버전 v${v}로 성공적으로 복원되었습니다.` });
        setTimeout(() => onClose(), 1200);
      } else {
        setMsg({ type: 'error', text: '버전 복원에 실패했습니다.' });
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || '복원 오류' });
    } finally {
      setRestoring(false);
    }
  };

  const selectedItem = historyList.find((h) => h.version === selectedVersion);
  const compareItem = historyList.find((h) => h.version === compareVersion);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <History size={18} className="text-blue-600" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-600 text-white">
                  {pledge.code}
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  변경 이력 및 버전 비교 ({pledge.title})
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                누가, 언제, 어떤 방법(직접수정/PDF병합)으로 수정했는지 전 과정을 투명하게 보존합니다.
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

        {/* Message Banner */}
        {msg && (
          <div
            className={`px-6 py-2.5 text-xs flex items-center gap-2 ${
              msg.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
            }`}
          >
            {msg.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            <span>{msg.text}</span>
          </div>
        )}

        {/* Body 2-Column: Timeline vs Diff Viewer */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200">
          {/* Left: Revisions Timeline List */}
          <div className="p-4 overflow-y-auto max-h-[70vh] space-y-2 bg-slate-50/50">
            <div className="text-xs font-bold text-slate-700 mb-2">리비전 타임라인 ({historyList.length}건)</div>

            {loading ? (
              <div className="text-xs text-slate-400 p-4 text-center">이력을 불러오는 중...</div>
            ) : historyList.length === 0 ? (
              <div className="text-xs text-slate-400 p-4 text-center">등록된 이력이 없습니다.</div>
            ) : (
              historyList.map((h) => {
                const isSelected = selectedVersion === h.version;
                const isCurrent = pledge.version === h.version;
                return (
                  <div
                    key={h.id}
                    onClick={() => setSelectedVersion(h.version)}
                    className={`p-3 rounded-lg border text-xs cursor-pointer transition ${
                      isSelected
                        ? 'bg-blue-50 border-blue-500 shadow-2xs'
                        : 'bg-white hover:bg-slate-100/80 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-blue-700">v{h.version}</span>
                        {isCurrent && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-semibold">
                            현재본
                          </span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                          {h.method === 'PDF_UPDATE'
                            ? 'PDF 갱신'
                            : h.method === 'VERSION_RESTORE'
                              ? '버전 복원'
                              : '직접 수정'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">{h.createdAt.slice(5, 16)}</span>
                    </div>

                    <div className="text-slate-800 font-medium line-clamp-2 mt-1">
                      {h.reason || '공약사항 수정'}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-1.5 border-t border-slate-100">
                      <span className="flex items-center gap-1">
                        <User size={11} /> {h.author}
                      </span>
                      {userRole !== 'viewer' && !isCurrent && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestore(h.version);
                          }}
                          disabled={restoring}
                          className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
                        >
                          <RotateCcw size={10} />
                          <span>이 버전으로 복원</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right 2 Columns: Markdown / Content Inspector */}
          <div className="md:col-span-2 p-5 overflow-y-auto max-h-[70vh] space-y-4 text-xs">
            {selectedItem ? (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
                  <div>
                    <div className="font-bold text-sm text-slate-900">
                      버전 v{selectedItem.version} 세부 스냅샷
                    </div>
                    <div className="text-slate-500 text-[11px] mt-0.5">
                      작성자: {selectedItem.author} ({selectedItem.role}) | 작성시각: {selectedItem.createdAt}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Compare select */}
                    {historyList.length > 1 && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-600">
                        <span>비교 대상:</span>
                        <select
                          value={compareVersion || ''}
                          onChange={(e) => setCompareVersion(Number(e.target.value) || null)}
                          className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-xs"
                        >
                          <option value="">(선택 안함 - 단일 보기)</option>
                          {historyList
                            .filter((h) => h.version !== selectedVersion)
                            .map((h) => (
                              <option key={h.version} value={h.version}>
                                v{h.version} ({h.createdAt.slice(5, 10)})
                              </option>
                            ))}
                        </select>
                      </div>
                    )}

                    {userRole !== 'viewer' && selectedItem.version !== pledge.version && (
                      <button
                        onClick={() => handleRestore(selectedItem.version)}
                        disabled={restoring}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition flex items-center gap-1"
                      >
                        <RotateCcw size={12} />
                        <span>이 버전으로 복원</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Diff Viewer or Single Snapshot */}
                {compareItem ? (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between p-2.5 bg-slate-100 rounded-lg text-xs font-semibold text-slate-700">
                      <span>비교본: v{compareItem.version} ({compareItem.createdAt})</span>
                      <ArrowRight size={14} className="text-slate-400" />
                      <span>기준본: v{selectedItem.version} ({selectedItem.createdAt})</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="font-semibold text-slate-500 mb-1">
                          v{compareItem.version} 스냅샷
                        </div>
                        <pre className="p-3 bg-slate-900 text-slate-200 font-mono text-[11px] rounded-lg overflow-x-auto max-h-96 whitespace-pre-wrap leading-relaxed">
                          {compareItem.snapshotMarkdown}
                        </pre>
                      </div>
                      <div>
                        <div className="font-semibold text-blue-700 mb-1">
                          v{selectedItem.version} 스냅샷
                        </div>
                        <pre className="p-3 bg-slate-900 text-slate-200 font-mono text-[11px] rounded-lg overflow-x-auto max-h-96 whitespace-pre-wrap leading-relaxed">
                          {selectedItem.snapshotMarkdown}
                        </pre>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 space-y-2">
                    <div className="text-[11px] text-slate-500">
                      해당 시점에 영구 보존된 YAML front matter 및 Markdown 원문 스냅샷입니다:
                    </div>
                    <pre className="p-4 bg-slate-900 text-slate-100 font-mono text-[11px] rounded-lg overflow-x-auto max-h-[480px] whitespace-pre-wrap leading-relaxed">
                      {selectedItem.snapshotMarkdown}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400">버전을 선택하면 스냅샷을 확인하실 수 있습니다.</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            ※ 복원 기능은 기존 이력을 덮어쓰지 않고 최신 리비전(새 버전)으로 기록됩니다.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 font-semibold text-slate-800 transition"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
