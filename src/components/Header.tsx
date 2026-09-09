/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  FileUp,
  PlusCircle,
  DownloadCloud,
  Search,
  ShieldCheck,
  Globe,
  Lock,
  UserCheck,
  HardDrive,
  Save,
} from 'lucide-react';
import { UserRole } from '../types/pledge';

interface Props {
  currentRole: UserRole;
  onChangeRole: (role: UserRole) => void;
  isPublicMode: boolean;
  onTogglePublicMode: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenPdfUpload: () => void;
  onOpenNewPledge: () => void;
  onOpenBackup: () => void;
  lastSavedTime?: string;
  onQuickExportJson?: () => void;
}

export const Header: React.FC<Props> = ({
  currentRole,
  onChangeRole,
  isPublicMode,
  onTogglePublicMode,
  searchQuery,
  onSearchChange,
  onOpenPdfUpload,
  onOpenNewPledge,
  onOpenBackup,
  lastSavedTime,
  onQuickExportJson,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs px-4 lg:px-8 py-2.5 flex flex-col md:flex-row items-center justify-between gap-3">
      {/* Brand & Data Baseline Info */}
      <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-700 flex items-center justify-center text-white font-bold text-sm shadow-sm">
            위키
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-slate-900 tracking-tight">공약위키</span>
              <span className="text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200/80 px-1.5 py-0.5 rounded">
                남양주시 철도교통망
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              공약사항 오픈위키 협업 관리 & PDF 3방향 병합
            </div>
          </div>
        </div>

        {/* Desktop Local Storage badge */}
        <div
          title="서버 없이도 모든 수정 데이터가 사용자의 PC 로컬 환경에 실시간 안전하게 저장됩니다."
          className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs"
        >
          <HardDrive size={12} className="text-emerald-600" />
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>데스크톱 로컬 저장{lastSavedTime ? ` (${lastSavedTime})` : ''}</span>
        </div>
      </div>

      {/* Center Search */}
      <div className="relative w-full md:w-72 lg:w-96">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="공약명, 관리번호(예: 4-01), 노선, 부서 검색..."
          className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-100/80 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {/* Right Controls: Role, Public Mode, Actions */}
      <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
        {/* Public View Mode Toggle */}
        <button
          onClick={onTogglePublicMode}
          title={isPublicMode ? '비공개 업무 모드로 전환' : '시민 공개 열람 모드로 전환 (개인 연락처 보호)'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition ${
            isPublicMode
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          {isPublicMode ? <Globe size={13} className="text-amber-600" /> : <Lock size={13} className="text-slate-500" />}
          <span>{isPublicMode ? '공개 열람 모드' : '업무 내부 모드'}</span>
        </button>

        {/* User Role Switcher */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
          <button
            onClick={() => onChangeRole('viewer')}
            className={`px-2 py-1 rounded-md transition font-medium ${
              currentRole === 'viewer'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="열람자: 읽기 전용 모드"
          >
            열람자
          </button>
          <button
            onClick={() => onChangeRole('editor')}
            className={`px-2 py-1 rounded-md transition font-medium ${
              currentRole === 'editor'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="편집자: 직접 수정 및 PDF 병합 가능"
          >
            편집자
          </button>
          <button
            onClick={() => onChangeRole('admin')}
            className={`px-2 py-1 rounded-md transition font-medium ${
              currentRole === 'admin'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="관리자: 버전 복원 및 전체 제어"
          >
            관리자
          </button>
        </div>

        {/* Quick PC Save Button */}
        {onQuickExportJson && (
          <button
            onClick={onQuickExportJson}
            title="현재 로컬 데이터를 PC 백업 파일(.json)로 즉시 저장"
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition"
          >
            <Save size={13} className="text-blue-600" />
            <span className="hidden lg:inline">PC 저장</span>
          </button>
        )}

        {/* Action: Backup / ZIP Export & Import */}
        <button
          onClick={onOpenBackup}
          title="데스크톱 백업 및 마크다운 가져오기"
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
        >
          <DownloadCloud size={14} />
          <span className="hidden sm:inline">백업/복원</span>
        </button>

        {/* Action: PDF Update Trigger */}
        <button
          onClick={onOpenPdfUpload}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition"
        >
          <FileUp size={14} />
          <span>PDF로 업데이트</span>
        </button>

        {/* Action: Add New Pledge */}
        {currentRole !== 'viewer' && (
          <button
            onClick={onOpenNewPledge}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition"
          >
            <PlusCircle size={14} />
            <span>공약 추가</span>
          </button>
        )}
      </div>
    </header>
  );
};
