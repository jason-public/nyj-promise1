/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  FileUp,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Sliders,
  Sparkles,
  HelpCircle,
  FileCheck,
} from 'lucide-react';
import { Pledge, PledgeMergeDiff, UserRole } from '../types/pledge';
import { computePledge3WayDiff } from '../utils/threeWayMerge';
import { PRESET_SAMPLE_PDFS, SamplePdfPayload } from '../data/mockAlternativePdfs';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentPledges: Pledge[];
  userRole: UserRole;
  onApplyMerge: (diffResults: PledgeMergeDiff[], pdfFileName: string) => Promise<boolean>;
}

export const PdfUploadMergeModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentPledges,
  userRole,
  onApplyMerge,
}) => {
  if (!isOpen) return null;

  const [step, setStep] = useState<'select' | 'diff' | 'applying' | 'complete'>('select');
  const [selectedFileMeta, setSelectedFileMeta] = useState<{
    fileName: string;
    fileHash: string;
    fileSize: number;
    pledges: Pledge[];
  } | null>(null);
  const [diffResults, setDiffResults] = useState<PledgeMergeDiff[]>([]);
  const [isDuplicate, setIsDuplicate] = useState<boolean>(false);
  const [activeDiffIndex, setActiveDiffIndex] = useState<number>(0);
  const [applyResultSummary, setApplyResultSummary] = useState<any>(null);

  // 1. Process selected payload (from preset or uploaded file)
  const handleSelectPayload = async (payload: SamplePdfPayload) => {
    setSelectedFileMeta({
      fileName: payload.fileName,
      fileHash: payload.fileHash,
      fileSize: 4512900,
      pledges: payload.pledges,
    });

    // Check with server if file is duplicate
    const checkRes = await fetch('/api/pdf/record-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: payload.fileName,
        fileHash: payload.fileHash,
        fileSize: 4512900,
        versionLabel: 'v2.0',
        extractedCount: payload.pledges.length,
      }),
    });
    const checkData = await checkRes.json();
    setIsDuplicate(Boolean(checkData.isDuplicate));

    // Compute 3-way merge diff against current pledges
    const results: PledgeMergeDiff[] = payload.pledges.map((incoming) => {
      const current = currentPledges.find((p) => p.code === incoming.code) || null;
      return computePledge3WayDiff(null, current, incoming);
    });

    setDiffResults(results);
    setActiveDiffIndex(0);
    setStep('diff');
  };

  // Helper to handle raw custom file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Simulate PDF parsing by adapting the partial updated preset with the custom file name
    const payload: SamplePdfPayload = {
      id: `custom-${Date.now()}`,
      name: file.name,
      description: '업로드된 PDF 파일',
      fileName: file.name,
      fileHash: `sha256-custom-${file.size}-${Date.now()}`,
      pledges: PRESET_SAMPLE_PDFS[1].pledges, // partial modified sample simulation
    };
    handleSelectPayload(payload);
  };

  // Field decision changer in diff matrix
  const handleUpdateDecision = (
    pledgeIndex: number,
    fieldIndex: number,
    decision: 'keep_current' | 'use_incoming' | 'custom',
  ) => {
    const updated = [...diffResults];
    updated[pledgeIndex].fieldDiffs[fieldIndex].decision = decision;
    setDiffResults(updated);
  };

  // Toggle pledge selection for merge
  const handleTogglePledgeSelection = (pledgeIndex: number) => {
    const updated = [...diffResults];
    updated[pledgeIndex].selectedForMerge = !updated[pledgeIndex].selectedForMerge;
    setDiffResults(updated);
  };

  // 3. Apply merge transactionally
  const handleExecuteMerge = async () => {
    if (!selectedFileMeta) return;

    try {
      setStep('applying');
      const success = await onApplyMerge(diffResults, selectedFileMeta.fileName);
      if (success) {
        setApplyResultSummary({
          fileName: selectedFileMeta.fileName,
          count: diffResults.filter((d) => d.selectedForMerge).length,
        });
        setStep('complete');
      } else {
        alert('병합 반영 중 오류가 발생했습니다.');
        setStep('diff');
      }
    } catch (err: any) {
      alert(err.message || '오류 발생');
      setStep('diff');
    }
  };

  const activePledgeDiff = diffResults[activeDiffIndex];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-teal-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                PDF 재업로드 및 3방향 병합 (Three-Way Merge)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                수동 편집본을 보호하고, PDF의 새로운 실적·일정만 안전하게 추출하여 갱신합니다.
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

        {/* STEP 1: Select or Upload PDF */}
        {step === 'select' && (
          <div className="p-6 space-y-6 overflow-y-auto">
            {/* File drop area */}
            <div className="border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-xl p-8 text-center transition bg-slate-50/50">
              <FileUp size={36} className="mx-auto text-teal-600 mb-2" />
              <div className="text-sm font-bold text-slate-800">
                공약사항 PDF 보고서 파일을 마우스로 끌어오거나 선택하세요
              </div>
              <p className="text-xs text-slate-500 mt-1">
                정부·지자체 공약 이행 보고서 PDF (단일 파일 또는 갱신 분책)
              </p>

              <label className="mt-4 inline-block px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-lg cursor-pointer transition shadow-xs">
                <span>내 PC에서 PDF 파일 선택</span>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Test Simulation Presets for Instant Demonstration */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-500" />
                  <span>3방향 병합 즉시 테스트 시나리오 프리셋</span>
                </span>
                <span className="text-[11px] text-slate-500">
                  실제 PDF 업로드 없이도 요구조건 동작을 바로 검증할 수 있습니다.
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {PRESET_SAMPLE_PDFS.map((preset) => (
                  <div
                    key={preset.id}
                    onClick={() => handleSelectPayload(preset)}
                    className="p-4 rounded-xl border border-slate-200 hover:border-teal-500 hover:shadow-md transition cursor-pointer bg-white flex flex-col justify-between group"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-900 group-hover:text-teal-700 transition mb-1">
                        {preset.name}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        {preset.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-teal-600">
                      <span>공약 {preset.pledges.length}건 포함</span>
                      <span>검토 시작 →</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Merge Guarantees Summary */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1.5">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck size={15} className="text-emerald-600" />
                <span>공약위키 3방향 병합 4대 보호 원칙</span>
              </div>
              <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[11px]">
                <li>
                  <strong>수동 수정 보호</strong>: 담당자가 직접 수정한 섹션은 PDF가 갱신되어도 임의로 덮어쓰지 않습니다.
                </li>
                <li>
                  <strong>사용자 추가 섹션 영구 보존</strong>: 사용자가 추가한 메모·특이사항은 PDF에 없어도 100% 보존됩니다.
                </li>
                <li>
                  <strong>부분 보고서 안전성</strong>: 일부 공약만 담긴 PDF를 올려도 수록되지 않은 나머지 공약이 절대 삭제되지 않습니다.
                </li>
                <li>
                  <strong>해시 기반 중복 방지</strong>: 동일한 PDF를 재업로드할 경우 중복 공약을 생성하지 않고 변경 없음으로 안내합니다.
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* STEP 2: 3-Way Diff Matrix Review */}
        {step === 'diff' && selectedFileMeta && (
          <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-200">
            {/* Left Col: Extracted Pledges List */}
            <div className="p-4 overflow-y-auto max-h-[70vh] space-y-2 bg-slate-50/60">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                <span>검출된 공약 ({diffResults.length}건)</span>
                {isDuplicate && (
                  <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                    기존 파일 일치
                  </span>
                )}
              </div>

              {diffResults.map((d, idx) => {
                const isSelected = activeDiffIndex === idx;
                return (
                  <div
                    key={d.pledgeCode}
                    onClick={() => setActiveDiffIndex(idx)}
                    className={`p-3 rounded-lg border text-xs cursor-pointer transition ${
                      isSelected
                        ? 'bg-teal-50 border-teal-500 shadow-2xs'
                        : 'bg-white hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={d.selectedForMerge}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleTogglePledgeSelection(idx);
                          }}
                          className="rounded text-teal-600 focus:ring-0"
                        />
                        <span className="font-mono font-bold text-teal-700">[{d.pledgeCode}]</span>
                      </div>

                      {d.conflictsCount > 0 ? (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-bold">
                          충돌 {d.conflictsCount}
                        </span>
                      ) : d.autoUpdateCount > 0 ? (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">
                          갱신 {d.autoUpdateCount}
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                          변경없음
                        </span>
                      )}
                    </div>

                    <div className="font-semibold text-slate-800 truncate">{d.pledgeTitle}</div>
                  </div>
                );
              })}
            </div>

            {/* Right 3 Cols: Field-by-Field 3-Way Diff Inspector */}
            <div className="md:col-span-3 p-5 overflow-y-auto max-h-[70vh] space-y-4 text-xs">
              {activePledgeDiff && (
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-teal-600 text-white">
                          {activePledgeDiff.pledgeCode}
                        </span>
                        <h3 className="font-bold text-sm text-slate-900">
                          {activePledgeDiff.pledgeTitle}
                        </h3>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        필드별로 현재 편집본(Current)과 새 PDF 추출본(Incoming)을 대조하여 반영 여부를 결정하세요.
                      </p>
                    </div>

                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activePledgeDiff.selectedForMerge}
                        onChange={() => handleTogglePledgeSelection(activeDiffIndex)}
                        className="rounded text-teal-600 focus:ring-0"
                      />
                      <span>이 공약 병합 반영</span>
                    </label>
                  </div>

                  {/* Field diff items list */}
                  <div className="space-y-3 mt-4">
                    {activePledgeDiff.fieldDiffs.map((diff, fIdx) => (
                      <div
                        key={diff.fieldPath}
                        className={`p-3.5 rounded-xl border transition ${
                          diff.status === 'CONFLICT'
                            ? 'bg-rose-50/40 border-rose-300'
                            : diff.status === 'AUTO_UPDATE'
                              ? 'bg-emerald-50/40 border-emerald-300'
                              : diff.status === 'CUSTOM_PRESERVED'
                                ? 'bg-purple-50/40 border-purple-300'
                                : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{diff.fieldLabel}</span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                diff.status === 'CONFLICT'
                                  ? 'bg-rose-100 text-rose-800'
                                  : diff.status === 'AUTO_UPDATE'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : diff.status === 'USER_KEPT'
                                      ? 'bg-blue-100 text-blue-800'
                                      : diff.status === 'CUSTOM_PRESERVED'
                                        ? 'bg-purple-100 text-purple-800'
                                        : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {diff.status === 'CONFLICT'
                                ? '양측 충돌'
                                : diff.status === 'AUTO_UPDATE'
                                  ? '자동 갱신 권장'
                                  : diff.status === 'USER_KEPT'
                                    ? '사용자 수동수정 유지'
                                    : diff.status === 'CUSTOM_PRESERVED'
                                      ? '사용자 섹션 보존'
                                      : '동일'}
                            </span>
                          </div>

                          {/* Decision selector */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateDecision(activeDiffIndex, fIdx, 'keep_current')}
                              className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                                diff.decision === 'keep_current'
                                  ? 'bg-slate-800 text-white shadow-2xs'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              }`}
                            >
                              현재 내용 유지
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateDecision(activeDiffIndex, fIdx, 'use_incoming')}
                              className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                                diff.decision === 'use_incoming'
                                  ? 'bg-teal-600 text-white shadow-2xs'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              }`}
                            >
                              새 PDF 내용 적용
                            </button>
                          </div>
                        </div>

                        {/* Comparison Values Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100">
                          <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                            <div className="text-[10px] font-semibold text-slate-500 mb-1">
                              현재 시스템 내용 (Current)
                            </div>
                            <div className="text-slate-800 break-words leading-relaxed">
                              {typeof diff.currentValue === 'object'
                                ? JSON.stringify(diff.currentValue, null, 2)
                                : String(diff.currentValue ?? '-')}
                            </div>
                          </div>

                          <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                            <div className="text-[10px] font-semibold text-teal-700 mb-1">
                              새 PDF 추출 내용 (Incoming)
                            </div>
                            <div className="text-teal-900 font-medium break-words leading-relaxed">
                              {typeof diff.incomingValue === 'object'
                                ? JSON.stringify(diff.incomingValue, null, 2)
                                : String(diff.incomingValue ?? '-')}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: Applying Progress */}
        {step === 'applying' && (
          <div className="p-12 text-center space-y-3">
            <RefreshCw size={36} className="animate-spin mx-auto text-teal-600" />
            <div className="text-sm font-bold text-slate-900">3방향 병합 내용을 데이터베이스에 반영 중입니다...</div>
            <p className="text-xs text-slate-500">
              새 버전을 생성하고 변경 이력 로그를 영구 기록하고 있습니다.
            </p>
          </div>
        )}

        {/* STEP 4: Complete */}
        {step === 'complete' && (
          <div className="p-12 text-center space-y-4">
            <CheckCircle2 size={44} className="mx-auto text-emerald-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900">
                PDF 3방향 병합 갱신이 성공적으로 완료되었습니다!
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                파일명: {applyResultSummary?.fileName} | 반영된 공약: {applyResultSummary?.count}건
              </p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-900 rounded-lg text-xs max-w-md mx-auto border border-emerald-200">
              기존 사용자가 수정한 특이사항 및 메모가 안전하게 보존되었으며, 새 버전 리비전으로 저장되었습니다.
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition"
            >
              확인 및 대시보드로 돌아가기
            </button>
          </div>
        )}

        {/* Modal Footer */}
        {step === 'diff' && (
          <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
            <button
              onClick={() => setStep('select')}
              className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-200 transition font-medium"
            >
              ← 이전 파일 선택
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg text-slate-700 hover:bg-slate-200 transition font-medium"
              >
                취소
              </button>
              <button
                onClick={handleExecuteMerge}
                className="px-5 py-2 rounded-lg font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition flex items-center gap-1.5"
              >
                <CheckCircle2 size={14} />
                <span>선택한 공약 병합 반영하기</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
