/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Copy, Check, FileCode2, Download } from 'lucide-react';
import { Pledge } from '../types/pledge';
import { pledgeToMarkdown } from '../utils/markdownParser';

interface Props {
  pledge: Pledge | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RawMarkdownModal: React.FC<Props> = ({ pledge, isOpen, onClose }) => {
  if (!isOpen || !pledge) return null;

  const [copied, setCopied] = useState<boolean>(false);
  const markdown = pledgeToMarkdown(pledge);

  const handleCopy = () => {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pledge.code}_${pledge.title.replace(/[\\/:*?"<>|]/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <FileCode2 size={18} className="text-blue-600" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-600 text-white">
                  {pledge.code}
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  마크다운 & YAML Front-Matter 원문 보기
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                모든 대시보드와 UI는 이 단일 마크다운 기준본을 파싱하여 생성됩니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
            >
              {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              <span>{copied ? '복사 완료!' : '클립보드 복사'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition"
            >
              <Download size={13} />
              <span>.md 파일 다운로드</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 overflow-y-auto bg-slate-950 text-slate-200">
          <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap selection:bg-blue-600 selection:text-white">
            {markdown}
          </pre>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            문서 크기: {markdown.length.toLocaleString()} 자 | 표준 규격: CommonMark + YAML Header
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
