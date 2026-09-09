/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Sidebar, ActiveNavTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { PledgeListView } from './components/PledgeListView';
import { PledgeDetailView } from './components/PledgeDetailView';
import { ThreeTransitMap } from './components/ThreeTransitMap';
import { HistoryAuditView } from './components/HistoryAuditView';

import { PledgeEditModal } from './components/PledgeEditModal';
import { VersionHistoryModal } from './components/VersionHistoryModal';
import { PdfUploadMergeModal } from './components/PdfUploadMergeModal';
import { BackupImportModal } from './components/BackupImportModal';
import { RawMarkdownModal } from './components/RawMarkdownModal';
import { NewPledgeModal } from './components/NewPledgeModal';

import { Pledge, DashboardStats, UserRole, DiscussionItem, PledgeMergeDiff } from './types/pledge';
import { INITIAL_SHARED_BUDGETS } from './data/initialPledges';
import { DesktopStorageService } from './services/desktopStorage';

export default function App() {
  // Navigation & View States
  const [activeTab, setActiveTab] = useState<ActiveNavTab>('dashboard');
  const [selectedPledgeCode, setSelectedPledgeCode] = useState<string | null>(null);

  // User & Access States
  const [currentRole, setCurrentRole] = useState<UserRole>('admin');
  const [isPublicMode, setIsPublicMode] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Core Data States
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [discussions, setDiscussions] = useState<DiscussionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals States
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [activeEditingPledge, setActiveEditingPledge] = useState<Pledge | null>(null);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [activeHistoryPledge, setActiveHistoryPledge] = useState<Pledge | null>(null);

  const [isMarkdownModalOpen, setIsMarkdownModalOpen] = useState<boolean>(false);
  const [activeMarkdownPledge, setActiveMarkdownPledge] = useState<Pledge | null>(null);

  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);
  const [isNewPledgeModalOpen, setIsNewPledgeModalOpen] = useState<boolean>(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);

  // Toast notification state
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string>(
    DesktopStorageService.getLastSavedTime() || '방금 전',
  );

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const updateLastSaved = () => {
    const time = new Date().toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setLastSavedTime(time);
  };

  // Fetch core data: Desktop Local Storage + Optional Server Sync
  const fetchData = useCallback(async () => {
    setLoading(true);
    // 1. Initialize and load from local desktop storage immediately
    DesktopStorageService.init();
    const localPledges = DesktopStorageService.getPledges();
    const localStats = DesktopStorageService.getDashboardStats();

    if (localPledges && localPledges.length > 0) {
      setPledges(localPledges);
      setStats(localStats);
    }

    // 2. Try syncing with server if available
    try {
      const [pledgesRes, statsRes] = await Promise.all([
        fetch('/api/pledges').catch(() => null),
        fetch('/api/stats').catch(() => null),
      ]);

      if (
        pledgesRes &&
        pledgesRes.ok &&
        pledgesRes.headers.get('content-type')?.includes('application/json') &&
        statsRes &&
        statsRes.ok &&
        statsRes.headers.get('content-type')?.includes('application/json')
      ) {
        const pledgesData = await pledgesRes.json();
        const statsData = await statsRes.json();

        if (pledgesData.success && Array.isArray(pledgesData.pledges) && pledgesData.pledges.length > 0) {
          setPledges(pledgesData.pledges);
        }
        if (statsData.success) {
          setStats(statsData.stats);
        }
      }
    } catch {
      // Server offline: application continues seamlessly on desktop local storage!
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch discussions when a pledge is selected
  useEffect(() => {
    if (selectedPledgeCode) {
      // First load from local storage
      const localDiscussions = DesktopStorageService.getDiscussions(selectedPledgeCode);
      setDiscussions(localDiscussions);

      // Attempt server fetch if online
      fetch(`/api/discussions?pledgeCode=${selectedPledgeCode}`)
        .then((res) => {
          if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) {
            return null;
          }
          return res.json();
        })
        .then((data) => {
          if (data && data.success && Array.isArray(data.discussions)) {
            setDiscussions(data.discussions);
          }
        })
        .catch(() => {
          // Server offline, localDiscussions already set
        });
    } else {
      setDiscussions([]);
    }
  }, [selectedPledgeCode]);

  // Navigation handlers
  const handleSelectTab = (tab: ActiveNavTab) => {
    if (tab === 'pdf') {
      setIsPdfModalOpen(true);
      return;
    }
    setActiveTab(tab);
    setSelectedPledgeCode(null);
  };

  const handleSelectPledge = (code: string) => {
    setSelectedPledgeCode(code);
  };

  const handleBackToList = () => {
    setSelectedPledgeCode(null);
  };

  // Modal open handlers
  const handleOpenEdit = (pledge: Pledge) => {
    if (currentRole === 'viewer') {
      alert('열람자(Viewer) 권한에서는 공약을 수정할 수 없습니다.');
      return;
    }
    setActiveEditingPledge(pledge);
    setIsEditModalOpen(true);
  };

  const handleOpenHistory = (pledge: Pledge) => {
    setActiveHistoryPledge(pledge);
    setIsHistoryModalOpen(true);
  };

  const handleOpenMarkdown = (pledge: Pledge) => {
    setActiveMarkdownPledge(pledge);
    setIsMarkdownModalOpen(true);
  };

  // CRUD Operations with Desktop Local Storage Priority + Optional Server Sync
  const handleSaveEdit = async (
    updatedPledge: Pledge,
    reason: string,
    rawMarkdown?: string,
  ): Promise<boolean> => {
    try {
      const authorName = currentRole === 'admin' ? '관리자' : '편집자';

      // 1. Save directly to Desktop Local Storage
      const saved = DesktopStorageService.savePledge(
        updatedPledge,
        reason,
        authorName,
        currentRole,
      );

      // 2. Sync with backend server if available
      try {
        await fetch(`/api/pledges/${updatedPledge.code}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': currentRole,
            'x-user-name': authorName,
          },
          body: JSON.stringify({
            pledge: updatedPledge,
            reason,
            expectedVersion: updatedPledge.version,
            rawMarkdown,
          }),
        });
      } catch {
        /* Server offline is fine */
      }

      updateLastSaved();
      showToast(`공약 [${saved.code}]이 새 버전(v${saved.version})으로 데스크톱 로컬에 안전하게 저장되었습니다.`);
      await fetchData();

      // If this pledge is currently viewed in detail, update selected pledge
      if (selectedPledgeCode === saved.code) {
        setSelectedPledgeCode(saved.code);
      }
      return true;
    } catch (err: any) {
      alert(err.message || '저장 오류');
      return false;
    }
  };

  const handleSaveNewPledge = async (newPledge: Pledge, reason: string): Promise<boolean> => {
    try {
      const authorName = currentRole === 'admin' ? '관리자' : '기획자';

      // 1. Save to Desktop Local Storage
      const created = DesktopStorageService.createPledge(
        newPledge,
        reason,
        authorName,
        currentRole,
      );

      // 2. Sync with backend server if available
      try {
        await fetch('/api/pledges', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': currentRole,
            'x-user-name': authorName,
          },
          body: JSON.stringify({ pledge: newPledge, reason }),
        });
      } catch {
        /* Server offline is fine */
      }

      updateLastSaved();
      showToast(`신규 공약 [${created.code}]이 데스크톱 로컬에 성공적으로 등록되었습니다.`);
      await fetchData();
      setSelectedPledgeCode(created.code);
      return true;
    } catch (err: any) {
      alert(err.message || '등록 오류');
      return false;
    }
  };

  const handleRestoreVersion = async (targetVersion: number): Promise<boolean> => {
    if (!activeHistoryPledge) return false;
    try {
      const authorName = currentRole === 'admin' ? '관리자' : '편집자';

      // 1. Restore in Desktop Local Storage
      const restored = DesktopStorageService.restoreVersion(
        activeHistoryPledge.code,
        targetVersion,
        authorName,
        currentRole,
      );

      // 2. Sync with backend server if available
      try {
        await fetch(`/api/pledges/${activeHistoryPledge.code}/restore`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': currentRole,
            'x-user-name': authorName,
          },
          body: JSON.stringify({
            version: targetVersion,
            reason: `버전 v${targetVersion} 시점의 내용으로 안전 복원`,
          }),
        });
      } catch {
        /* Server offline is fine */
      }

      updateLastSaved();
      showToast(`버전 v${targetVersion}으로 안전 복원되었습니다 (신규 v${restored.version}).`);
      await fetchData();
      return true;
    } catch (err: any) {
      alert(err.message || '복원 오류');
      return false;
    }
  };

  const handleApplyPdfMerge = async (
    diffResults: PledgeMergeDiff[],
    pdfFileName: string,
  ): Promise<boolean> => {
    try {
      // 1. Apply merge directly in Desktop Local Storage
      DesktopStorageService.applyMerge(
        diffResults,
        pdfFileName,
        'PDF병합담당자',
        currentRole,
      );

      // 2. Sync with backend server if available
      try {
        await fetch('/api/pdf/apply-merge', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': currentRole,
            'x-user-name': 'PDF병합담당자',
          },
          body: JSON.stringify({
            diffResults,
            pdfFileName,
          }),
        });
      } catch {
        /* Server offline is fine */
      }

      updateLastSaved();
      showToast(`PDF 3방향 병합이 데스크톱 로컬 환경에 성공적으로 반영되었습니다.`);
      await fetchData();
      return true;
    } catch (err: any) {
      alert(err.message || '병합 오류');
      return false;
    }
  };

  const handleAddDiscussion = async (content: string, isInternal: boolean) => {
    if (!selectedPledgeCode) return;
    const authorName = currentRole === 'admin' ? '총괄관리자' : '교통정책과 주무관';

    // 1. Add to Desktop Local Storage
    const newDisc = DesktopStorageService.addDiscussion(
      selectedPledgeCode,
      authorName,
      currentRole,
      content,
      isInternal,
    );
    setDiscussions((prev) => [newDisc, ...prev]);

    // 2. Sync with backend server if available
    try {
      await fetch('/api/discussions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pledgeCode: selectedPledgeCode,
          author: authorName,
          role: currentRole,
          content,
          isInternalMemo: isInternal,
        }),
      });
    } catch {
      /* Server offline is fine */
    }

    updateLastSaved();
    showToast('새 업무 메모 또는 토론이 로컬에 저장되었습니다.');
  };

  // Currently viewed pledge
  const currentPledge = pledges.find((p) => p.code === selectedPledgeCode) || null;

  return (
    <div className="min-h-screen bg-[#F5F7FB] text-[#0F172A] flex flex-col antialiased">
      {/* Top Universal Header */}
      <Header
        currentRole={currentRole}
        onChangeRole={setCurrentRole}
        isPublicMode={isPublicMode}
        onTogglePublicMode={() => setIsPublicMode(!isPublicMode)}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          if (q && activeTab !== 'list' && !selectedPledgeCode) {
            setActiveTab('list');
          }
        }}
        onOpenPdfUpload={() => setIsPdfModalOpen(true)}
        onOpenNewPledge={() => setIsNewPledgeModalOpen(true)}
        onOpenBackup={() => setIsBackupModalOpen(true)}
        lastSavedTime={lastSavedTime}
        onQuickExportJson={() => DesktopStorageService.exportToJsonFile()}
      />

      {/* Main App Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          pledges={pledges}
          selectedPledgeCode={selectedPledgeCode || undefined}
          onSelectPledge={handleSelectPledge}
        />

        {/* Center/Right Dynamic Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {loading && pledges.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
              <div className="text-xs font-semibold">공약위키 데이터베이스 로드 중...</div>
            </div>
          ) : selectedPledgeCode && currentPledge ? (
            /* WIKI DETAIL VIEW */
            <PledgeDetailView
              pledge={currentPledge}
              allPledges={pledges}
              userRole={currentRole}
              isPublicMode={isPublicMode}
              discussions={discussions}
              onBack={handleBackToList}
              onEdit={handleOpenEdit}
              onViewHistory={handleOpenHistory}
              onViewMarkdown={handleOpenMarkdown}
              onSelectPledge={handleSelectPledge}
              onAddDiscussion={handleAddDiscussion}
            />
          ) : activeTab === 'dashboard' ? (
            /* KPI DASHBOARD VIEW */
            <DashboardView
              pledges={pledges}
              sharedBudgets={INITIAL_SHARED_BUDGETS}
              onSelectPledge={handleSelectPledge}
              onOpenPdfUpload={() => setIsPdfModalOpen(true)}
            />
          ) : activeTab === 'list' ? (
            /* PLEDGE LIST & TABLE VIEW */
            <PledgeListView
              pledges={pledges}
              searchQuery={searchQuery}
              onSelectPledge={handleSelectPledge}
              onOpenNewPledge={() => setIsNewPledgeModalOpen(true)}
            />
          ) : activeTab === 'map' ? (
            /* 3D TRANSIT MAP VIEW */
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    3D 철도망 공간 시각화 (Three.js WebGL)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    마우스 드래그로 360° 회전 및 줌하여 남양주시 주요 철도망과 역사를 입체적으로 조망하세요.
                  </p>
                </div>
              </div>
              <ThreeTransitMap
                pledges={pledges}
                selectedPledgeCode={selectedPledgeCode || undefined}
                onSelectPledge={handleSelectPledge}
              />
            </div>
          ) : activeTab === 'history' ? (
            /* AUDIT LOG VIEW */
            <HistoryAuditView
              pledges={pledges}
              onSelectPledge={handleSelectPledge}
              onOpenHistoryForPledge={handleOpenHistory}
            />
          ) : null}
        </main>
      </div>

      {/* Global Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {toastMsg}
        </div>
      )}

      {/* MODALS */}
      {/* 1. Dual-Mode Edit Modal */}
      <PledgeEditModal
        pledge={activeEditingPledge}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setActiveEditingPledge(null);
        }}
        onSave={handleSaveEdit}
      />

      {/* 2. Version History Modal with Diff View & Restore */}
      <VersionHistoryModal
        pledge={activeHistoryPledge}
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setActiveHistoryPledge(null);
        }}
        userRole={currentRole}
        onRestoreVersion={handleRestoreVersion}
      />

      {/* 3. PDF Re-upload & 3-Way Merge Modal */}
      <PdfUploadMergeModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        currentPledges={pledges}
        userRole={currentRole}
        onApplyMerge={handleApplyPdfMerge}
      />

      {/* 4. Backup Export (.zip) & Markdown Import Modal */}
      <BackupImportModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        pledges={pledges}
        userRole={currentRole}
        onRefreshData={fetchData}
      />

      {/* 5. Raw Markdown & Front-Matter Inspector Modal */}
      <RawMarkdownModal
        pledge={activeMarkdownPledge}
        isOpen={isMarkdownModalOpen}
        onClose={() => {
          setIsMarkdownModalOpen(false);
          setActiveMarkdownPledge(null);
        }}
      />

      {/* 6. New Pledge Creator Modal */}
      <NewPledgeModal
        isOpen={isNewPledgeModalOpen}
        onClose={() => setIsNewPledgeModalOpen(false)}
        userRole={currentRole}
        onSaveNewPledge={handleSaveNewPledge}
      />
    </div>
  );
}
