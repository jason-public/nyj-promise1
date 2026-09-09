/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import JSZip from 'jszip';
import { Pledge } from '../types/pledge';
import { pledgeToMarkdown } from './markdownParser';

/**
 * Generates and downloads a full ZIP archive containing all Markdown documents,
 * metadata, and a README completely client-side in the browser / desktop environment.
 */
export async function downloadClientZip(pledges: Pledge[]): Promise<void> {
  const zip = new JSZip();

  // Create folder for markdown documents
  const docsFolder = zip.folder('pledges');

  pledges.forEach((p) => {
    const md = pledgeToMarkdown(p);
    const safeTitle = p.title.replace(/[\\/:*?"<>|]/g, '_');
    const filename = `${p.code}_${safeTitle}.md`;
    docsFolder?.file(filename, md);
  });

  // Add metadata.json
  const metadata = {
    appName: '공약위키 (PledgeWiki Desktop)',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    totalPledges: pledges.length,
    environment: 'Desktop Standalone / Local Storage',
    pledgesSummary: pledges.map((p) => ({
      code: p.code,
      title: p.title,
      category: p.category,
      stage: p.stage,
      scheduleStatus: p.scheduleStatus,
      version: p.version,
      updatedAt: p.updatedAt,
    })),
  };
  zip.file('metadata.json', JSON.stringify(metadata, null, 2));

  // Add README.md
  const readme = `# 공약사항 오픈위키 아카이브 (데스크톱 백업)

본 파일은 공약위키(PledgeWiki) 시스템의 데스크톱 로컬 백업 아카이브입니다.

- **생성 일시**: ${new Date().toLocaleString('ko-KR')}
- **총 공약 수**: ${pledges.length}건
- **보관 구조**:
  - \`/pledges/\`: YAML Front-Matter가 포함된 개별 공약 표준 Markdown 문서
  - \`metadata.json\`: 전체 사업 요약 및 메타데이터 인덱스

각 Markdown 문서는 CommonMark 및 YAML Front-matter 표준을 준수하므로
옵시디언(Obsidian), 노션(Notion), 깃허브(GitHub) 등 모든 마크다운 지원 도구에서 바로 열람·편집할 수 있습니다.
`;
  zip.file('README.md', readme);

  // Generate ZIP blob and trigger download
  const content = await zip.generateAsync({ type: 'blob' });
  const filename = `공약위키_전체백업_${new Date().toISOString().slice(0, 10)}.zip`;

  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
