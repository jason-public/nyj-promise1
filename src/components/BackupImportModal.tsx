/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  DownloadCloud,
  UploadCloud,
  FileCode2,
  FolderArchive,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  FileJson,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Pledge, UserRole } from '../types/pledge';
import { DesktopStorageService } from '../services/desktopStorage';
import { downloadClientZip } from '../utils/clientZip';
import { pledgeToMarkdown } from '../utils/markdownParser';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  pledges: Pledge[];
  userRole: UserRole;
  onRefreshData: () => void;
}

export const BackupImportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  pledges,
  userRole,
  onRefreshData,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [importText, setImportText] = useState<string>('');
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // 1. Download offline ZIP with all markdown files & metadata
  const handleDownloadZip = async () => {
    try {
      setIsProcessing(true);
      await downloadClientZip(pledges);
      setImportStatus({
        type: 'success',
        message: '전체 공약 마크다운 압축 파일(.zip)이 데스크톱 다운로드 폴더에 저장되었습니다.',
      });
    } catch (e: any) {
      setImportStatus({ type: 'error', message: 'ZIP 압축 생성 실패: ' + e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Download all local data as JSON backup
  const handleExportJson = () => {
    try {
      DesktopStorageService.exportToJsonFile();
      setImportStatus({
        type: 'success',
        message: '데스크톱 로컬 백업 파일(.json)이 다운로드되었습니다.',
      });
    } catch (e: any) {
      setImportStatus({ type: 'error', message: 'JSON 파일 저장 실패: ' + e.message });
    }
  };

  // 3. Download single markdown file directly in browser
  const handleDownloadSingleMarkdown = (pledge: Pledge) => {
    try {
      const md = pledgeToMarkdown(pledge);
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      const safeTitle = pledge.title.replace(/[\\/:*?"<>|]/g, '_');
      const filename = `${pledge.code}_${safeTitle}.md`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert('마크다운 다운로드 실패: ' + e.message);
    }
  };

  // 4. Handle JSON backup file import
  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = DesktopStorageService.importFromJsonString(content);
      if (res.success) {
        setImportStatus({
          type: 'success',
          message: `백업 파일로부터 총 ${res.count}건의 공약 및 이력이 데스크톱 로컬 저장소에 완벽히 복원되었습니다.`,
        });
        onRefreshData();
      } else {
        setImportStatus({ type: 'error', message: res.error || 'JSON 복원 실패' });
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  // 5. Handle Markdown file import
  const handleImportMdFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportText(content);
    };
    reader.readAsText(file, 'utf-8');
  };

  // 6. Execute Markdown import
  const handleExecuteMarkdownImport = () => {
    if (!importText.trim()) {
      setImportStatus({ type: 'error', message: '가져올 마크다운 내용이 비어있습니다.' });
      return;
    }

    try {
      setIsProcessing(true);
      setImportStatus(null);
      const importedPledge = DesktopStorageService.importMarkdown(
        importText,
        '데스크톱사용자(MD가져오기)',
        userRole,
      );

      // Also try syncing to server if server is online
      fetch('/api/import/markdown', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': userRole,
          'x-user-name': '데스크톱사용자(MD가져오기)',
        },
        body: JSON.stringify({ markdown: importText }),
      }).catch(() => {
        /* Server offline is acceptable */
      });

      setImportStatus({
        type: 'success',
        message: `공약 [${importedPledge.code} ${importedPledge.title}] (v${importedPledge.version})이 데스크톱 로컬 저장소에 저장되었습니다!`,
      });
      setImportText('');
      onRefreshData();
    } catch (err: any) {
      setImportStatus({ type: 'error', message: err.message || '가져오기 실패' });
    } finally {
      setIsProcessing(false);
    }
  };

  // 7. Reset to default sample
  const handleResetToDefault = () => {
    if (
      !window.confirm(
        '로컬 데스크톱 저장소를 「샘플.pdf」 기준 초기 데이터(7건)로 초기화하시겠습니까? 현재 수정한 모든 내용이 초기화됩니다.',
      )
    ) {
      return;
    }
    DesktopStorageService.resetToDefault();
    setImportStatus({
      type: 'success',
      message: '초기 7대 공약 원본 상태로 안전하게 재설정되었습니다.',
    });
    onRefreshData();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
              <HardDrive size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">데스크톱 로컬 백업 및 데이터 관리</h2>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full border border-emerald-300">
                  서버 불필요 · PC 독립 실행
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                모든 자료는 사용자의 데스크톱 PC 로컬 환경에 저장되며 파일로 즉시 내보내거나 불러올 수 있습니다.
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

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 px-6 pt-2 bg-slate-50/50">
          <button
            onClick={() => setActiveTab('export')}
            className={`pb-2.5 px-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 ${
              activeTab === 'export'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <DownloadCloud size={14} />
            <span>내보내기 (PC 파일 백업)</span>
          </button>

          <button
            onClick={() => setActiveTab('import')}
            className={`pb-2.5 px-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 ${
              activeTab === 'import'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UploadCloud size={14} />
            <span>불러오기 (복원 및 마크다운)</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs">
          {importStatus && (
            <div
              className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                importStatus.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {importStatus.type === 'success' ? (
                <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
              ) : (
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
              )}
              <span className="leading-relaxed font-medium">{importStatus.message}</span>
            </div>
          )}

          {activeTab === 'export' ? (
            <div className="space-y-4">
              {/* Card 1: JSON Full Database Snapshot */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-slate-300 transition">
                <div>
                  <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <FileJson size={16} className="text-amber-600" />
                    <span>전체 데이터베이스 파일 백업 (.json)</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    수정된 공약({pledges.length}건), 전체 버전 이력, 업무 토론 메모 등 모든 데이터를 단일 백업 파일로 데스크톱에 즉시 다운로드합니다.
                  </p>
                </div>

                <button
                  onClick={handleExportJson}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-lg transition shadow-xs flex items-center gap-1.5 shrink-0"
                >
                  <DownloadCloud size={14} />
                  <span>PC에 JSON 파일 저장</span>
                </button>
              </div>

              {/* Card 2: Offline ZIP with all Markdown docs */}
              <div className="p-4 bg-blue-50/70 rounded-xl border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-blue-300 transition">
                <div>
                  <div className="font-bold text-sm text-blue-950 flex items-center gap-1.5">
                    <FolderArchive size={16} className="text-blue-700" />
                    <span>전체 마크다운 압축 아카이브 (.zip)</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    서버 없이 브라우저 자체에서 개별 .md 문서와 metadata.json, README를 생성하여 데스크톱 압축 파일로 저장합니다.
                  </p>
                </div>

                <button
                  onClick={handleDownloadZip}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition shadow-xs flex items-center gap-1.5 shrink-0"
                >
                  <FolderArchive size={14} />
                  <span>{isProcessing ? '압축 생성 중...' : '마크다운 ZIP 다운로드'}</span>
                </button>
              </div>

              {/* Individual MD export list */}
              <div>
                <h3 className="font-bold text-slate-800 text-xs mb-2 flex items-center gap-1">
                  <FileCode2 size={14} className="text-slate-500" />
                  <span>개별 공약 마크다운(.md) 바로 다운로드</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                  {pledges.map((p) => (
                    <div
                      key={p.id}
                      className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between hover:bg-slate-50 transition shadow-2xs"
                    >
                      <div className="flex items-center gap-1.5 truncate pr-2">
                        <span className="font-mono font-bold text-blue-700 text-[11px]">[{p.code}]</span>
                        <span className="truncate text-slate-800 font-medium text-xs">{p.title}</span>
                      </div>
                      <button
                        onClick={() => handleDownloadSingleMarkdown(p)}
                        className="px-2 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 text-[11px] font-medium rounded transition shrink-0 flex items-center gap-1"
                        title="마크다운 다운로드"
                      >
                        <DownloadCloud size={12} />
                        <span>.md 저장</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* IMPORT TAB */
            <div className="space-y-4">
              {/* Option A: Restore JSON file */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 mb-1 text-sm">
                  <FileJson size={16} className="text-amber-600" />
                  <span>데스크톱 JSON 백업 파일 복원</span>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  이전에 데스크톱으로 저장해 둔 `.json` 백업 파일을 선택하면 공약 데이터 및 편집 이력이 복원됩니다.
                </p>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImportJsonFile}
                  className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200 cursor-pointer"
                />
              </div>

              {/* Option B: Import Markdown */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
                  <UploadCloud size={16} className="text-blue-600" />
                  <span>마크다운(.md) 파일 또는 텍스트 등록</span>
                </div>
                <input
                  type="file"
                  accept=".md,.markdown,text/plain"
                  onChange={handleImportMdFile}
                  className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />

                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="---\nid: 'p-4-01'\ncode: '4-01'\ntitle: '...'\n...\n---\n# 공약 본문 마크다운"
                  rows={6}
                  className="w-full p-2.5 font-mono text-[11px] bg-slate-900 text-slate-100 rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleExecuteMarkdownImport}
                    disabled={isProcessing || !importText.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition flex items-center gap-1.5"
                  >
                    <Sparkles size={14} />
                    <span>{isProcessing ? '처리 중...' : '마크다운 분석 및 로컬 저장소에 반영'}</span>
                  </button>
                </div>
              </div>

              {/* Option C: Factory Reset */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span>데이터를 처음 샘플 원본 상태로 되돌리려면:</span>
                <button
                  onClick={handleResetToDefault}
                  className="px-3 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition flex items-center gap-1"
                >
                  <RotateCcw size={12} />
                  <span>초기 샘플 데이터로 복원</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-500 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>데스크톱 브라우저 로컬 저장소 활성화됨</span>
          </div>

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
