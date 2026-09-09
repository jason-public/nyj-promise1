/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Pledge,
  InvestmentPlanRow,
  YearlyPlanRow,
  MilestoneItem,
  FuturePlanItem,
  ReferenceItem,
  ExtraTable,
  CustomSection,
} from '../types/pledge';

/**
 * Serializes a Pledge object into standard YAML Front-Matter + Markdown document
 */
export function pledgeToMarkdown(pledge: Pledge): string {
  const frontMatterLines: string[] = [
    '---',
    `id: "${pledge.id}"`,
    `code: "${pledge.code}"`,
    `title: "${pledge.title.replace(/"/g, '\\"')}"`,
    `category: "${pledge.category}"`,
    `isNew: "${pledge.isNew}"`,
    `completionTiming: "${pledge.completionTiming}"`,
    `period: "${pledge.period}"`,
    `statusText: "${pledge.statusText.replace(/"/g, '\\"')}"`,
    `stage: "${pledge.stage}"`,
    `scheduleStatus: "${pledge.scheduleStatus}"`,
    `leadAgency: "${pledge.leadAgency.replace(/"/g, '\\"')}"`,
    `department: "${pledge.department.replace(/"/g, '\\"')}"`,
    'contacts:',
    `  director: "${pledge.contacts.director}"`,
    `  teamLeader: "${pledge.contacts.teamLeader}"`,
    `  officer: "${pledge.contacts.officer}"`,
    'supportNeeded:',
    `  needed: ${pledge.supportNeeded.needed}`,
    `  types: [${pledge.supportNeeded.types.map((t) => `"${t}"`).join(', ')}]`,
    `finalGoal: "${pledge.finalGoal.replace(/"/g, '\\"')}"`,
    `termGoal: "${pledge.termGoal.replace(/"/g, '\\"')}"`,
    `finalGoalAchieved: ${pledge.finalGoalAchieved}`,
    `termGoalAchieved: ${pledge.termGoalAchieved}`,
    `currentProgressRate: ${pledge.currentProgressRate ?? 'null'}`,
    `sharedBudgetId: ${pledge.budgetInfo.sharedBudgetId ? `"${pledge.budgetInfo.sharedBudgetId}"` : 'null'}`,
    `isUndeterminedBudget: ${pledge.budgetInfo.isUndetermined}`,
    `isUnapportionedBudget: ${pledge.budgetInfo.isUnapportioned}`,
    `localBurdenMillion: ${pledge.budgetInfo.localBurdenMillion ?? 'null'}`,
    `tags: [${pledge.tags.map((t) => `"${t}"`).join(', ')}]`,
    `version: ${pledge.version}`,
    `updatedAt: "${pledge.updatedAt}"`,
    `updatedBy: "${pledge.updatedBy}"`,
    'sourcePdf:',
    `  fileName: "${pledge.sourcePdf.fileName}"`,
    `  pageRange: "${pledge.sourcePdf.pageRange}"`,
    `  startPage: ${pledge.sourcePdf.startPage}`,
    `  endPage: ${pledge.sourcePdf.endPage}`,
    '---',
  ];

  const bodyLines: string[] = [
    `# [${pledge.code}] ${pledge.title}`,
    '',
    '## 1. 사업목적',
    pledge.purpose,
    '',
    '## 2. 사업개요',
    `- **사업구간**: ${pledge.overview.section}`,
    `- **사업량**: ${pledge.overview.scope}`,
    `- **총사업비**: ${pledge.overview.totalBudgetText}`,
    '',
    '## 3. 재원투자 계획',
    `*(단위: 백만원 / 정규화 금액: ${pledge.budgetInfo.normalizedKrwBillion}억원)*`,
    '',
    '| 구분 | 총액 | 기투자 | 2026년 | 2027년 | 2028년 | 2029년 | 2030년 | 향후 |',
    '| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |',
  ];

  pledge.budgetInfo.investmentPlan.forEach((row) => {
    bodyLines.push(
      `| ${row.category} | ${row.total.toLocaleString()} | ${row.preInvestment.toLocaleString()} | ${row.y2026.toLocaleString()} | ${row.y2027.toLocaleString()} | ${row.y2028.toLocaleString()} | ${row.y2029.toLocaleString()} | ${row.y2030.toLocaleString()} | ${row.postTerm.toLocaleString()} |`,
    );
  });

  if (pledge.budgetInfo.notes) {
    bodyLines.push('', pledge.budgetInfo.notes);
  }
  if (pledge.budgetInfo.sharedBudgetNote) {
    bodyLines.push('', `> **공유 예산 안내**: ${pledge.budgetInfo.sharedBudgetNote}`);
  }
  if (pledge.budgetInfo.alternatives && pledge.budgetInfo.alternatives.length > 0) {
    bodyLines.push('', '### 검토 대안별 사업비 (합산 불가)');
    pledge.budgetInfo.alternatives.forEach((alt) => {
      bodyLines.push(`- **${alt.name}**: ${alt.amountText}`);
    });
  }

  bodyLines.push(
    '',
    '## 4. 사업목표',
    `- **최종 목표**: ${pledge.finalGoal} (${pledge.finalGoalAchieved ? '달성완료' : '추진중'})`,
    `- **임기 내 목표**: ${pledge.termGoal} (${pledge.termGoalAchieved ? '달성완료' : '추진중'})`,
    '',
    '## 5. 연도별 추진계획 및 실적',
    '| 연도구분 | 추진계획 | 실적 | 누적추진율 | 구분 |',
    '| :--- | :--- | :--- | :--- | :--- |',
  );

  pledge.yearlyPlans.forEach((plan) => {
    bodyLines.push(
      `| ${plan.yearRange} | ${plan.plan.replace(/\n/g, '<br>')} | ${plan.performance.replace(/\n/g, '<br>') || '-'} | ${plan.progressRate} | ${plan.progressType} |`,
    );
  });

  bodyLines.push('', '## 6. 날짜별 추진실적');
  pledge.milestones.forEach((m) => {
    bodyLines.push(
      `- **${m.date}**: ${m.title}${m.details ? ` (${m.details})` : ''}${m.isCompleted ? ' [완료]' : ''}`,
    );
  });

  bodyLines.push(
    '',
    '## 7. 쟁점사항(문제점) 및 해소방안',
    '### 주요 문제점',
  );
  pledge.issuesAndSolutions.issues.forEach((issue) => {
    bodyLines.push(`- ${issue}`);
  });
  bodyLines.push('', '### 해소 방안');
  pledge.issuesAndSolutions.solutions.forEach((sol) => {
    bodyLines.push(`- ${sol}`);
  });

  bodyLines.push('', '## 8. 향후계획');
  pledge.futurePlans.forEach((fp) => {
    bodyLines.push(`- **${fp.year}**: ${fp.content}`);
  });

  if (pledge.extraTables && pledge.extraTables.length > 0) {
    pledge.extraTables.forEach((et) => {
      bodyLines.push('', `## ${et.title}`);
      bodyLines.push(`| ${et.headers.join(' | ')} |`);
      bodyLines.push(`| ${et.headers.map(() => ':---').join(' | ')} |`);
      et.rows.forEach((row) => {
        bodyLines.push(`| ${row.join(' | ')} |`);
      });
      if (et.notes) {
        bodyLines.push('', et.notes);
      }
    });
  }

  bodyLines.push('', '## 9. 참고자료');
  pledge.references.forEach((ref) => {
    bodyLines.push(`- **${ref.title}** (PDF ${ref.page}쪽): ${ref.caption}`);
  });

  if (pledge.customSections && pledge.customSections.length > 0) {
    pledge.customSections.forEach((cs) => {
      bodyLines.push('', `## 사용자추가: ${cs.title}`, cs.content);
    });
  }

  return [...frontMatterLines, '', ...bodyLines].join('\n');
}

/**
 * Parses YAML front-matter and Markdown text into a Pledge object.
 * Robustly preserves custom sections and checks for errors.
 */
export function markdownToPledge(
  markdown: string,
  basePledge?: Pledge,
): { pledge: Pledge; errors: string[] } {
  const errors: string[] = [];
  const fmRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
  const match = markdown.match(fmRegex);

  let fmText = '';
  let bodyText = markdown;

  if (match) {
    fmText = match[1];
    bodyText = match[2];
  } else {
    errors.push('YAML Front-Matter 구분자(---)를 찾을 수 없습니다.');
  }

  // Parse simple key-values from front matter
  const meta: Record<string, any> = {};
  const lines = fmText.split(/\r?\n/);
  let currentKey = '';

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    if (line.startsWith('  ') && currentKey) {
      // Nested property or array
      const childMatch = trimmed.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
      if (childMatch) {
        if (typeof meta[currentKey] !== 'object' || meta[currentKey] === null) {
          meta[currentKey] = {};
        }
        let val: any = childMatch[2].replace(/^["']|["']$/g, '');
        if (val === 'true') val = true;
        if (val === 'false') val = false;
        if (val === 'null') val = null;
        meta[currentKey][childMatch[1]] = val;
      }
    } else {
      const topMatch = line.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
      if (topMatch) {
        currentKey = topMatch[1];
        let val: any = topMatch[2].trim();
        if (val.startsWith('[') && val.endsWith(']')) {
          // Array
          val = val
            .slice(1, -1)
            .split(',')
            .map((s: string) => s.trim().replace(/^["']|["']$/g, ''))
            .filter(Boolean);
        } else {
          val = val.replace(/^["']|["']$/g, '');
          if (val === 'true') val = true;
          else if (val === 'false') val = false;
          else if (val === 'null') val = null;
          else if (!isNaN(Number(val)) && val !== '') val = Number(val);
        }
        meta[currentKey] = val;
      }
    }
  });

  // Extract custom sections from body
  const customSections: CustomSection[] = [];
  const customSectionRegex = /## 사용자추가:\s*([^\r\n]+)\r?\n([\s\S]*?)(?=(?:\r?\n## |$))/g;
  let csMatch;
  while ((csMatch = customSectionRegex.exec(bodyText)) !== null) {
    customSections.push({
      id: `cs-${Date.now()}-${customSections.length}`,
      title: csMatch[1].trim(),
      content: csMatch[2].trim(),
    });
  }

  // Extract purpose
  let purpose = basePledge?.purpose || '';
  const purposeMatch = bodyText.match(/## 1\. 사업목적\r?\n([\s\S]*?)(?=\r?\n## )/);
  if (purposeMatch) {
    purpose = purposeMatch[1].trim();
  }

  // Extract overview
  const overview = { ...(basePledge?.overview || { section: '', scope: '', totalBudgetText: '' }) };
  const secMatch = bodyText.match(/- \*\*사업구간\*\*:\s*([^\r\n]+)/);
  if (secMatch) overview.section = secMatch[1].trim();
  const scopeMatch = bodyText.match(/- \*\*사업량\*\*:\s*([^\r\n]+)/);
  if (scopeMatch) overview.scope = scopeMatch[1].trim();
  const totalBudgetMatch = bodyText.match(/- \*\*총사업비\*\*:\s*([^\r\n]+)/);
  if (totalBudgetMatch) overview.totalBudgetText = totalBudgetMatch[1].trim();

  // Extract goals
  let finalGoal = meta.finalGoal || basePledge?.finalGoal || '';
  const fgMatch = bodyText.match(/- \*\*최종 목표\*\*:\s*([^(\r\n]+)/);
  if (fgMatch) finalGoal = fgMatch[1].trim();

  let termGoal = meta.termGoal || basePledge?.termGoal || '';
  const tgMatch = bodyText.match(/- \*\*임기 내 목표\*\*:\s*([^(\r\n]+)/);
  if (tgMatch) termGoal = tgMatch[1].trim();

  // Build reconstituted Pledge
  const code = meta.code || basePledge?.code || '4-00';
  const title = meta.title || basePledge?.title || '공약 제목';

  const pledge: Pledge = {
    id: meta.id || basePledge?.id || `p-${code.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    code,
    title,
    category: meta.category || basePledge?.category || '공약사업',
    isNew: meta.isNew || basePledge?.isNew || '계속',
    completionTiming: meta.completionTiming || basePledge?.completionTiming || '임기내',
    period: meta.period || basePledge?.period || '',
    statusText: meta.statusText || basePledge?.statusText || '',
    stage: meta.stage || basePledge?.stage || '기본계획',
    scheduleStatus: meta.scheduleStatus || basePledge?.scheduleStatus || '정상추진',
    leadAgency: meta.leadAgency || basePledge?.leadAgency || '',
    department: meta.department || basePledge?.department || '',
    contacts: {
      department: meta.department?.split(' ')[0] || basePledge?.contacts?.department || '교통정책과',
      section: meta.department?.split(' ')[1] || basePledge?.contacts?.section || '철도기획팀',
      director: meta.contacts?.director || basePledge?.contacts?.director || '',
      teamLeader: meta.contacts?.teamLeader || basePledge?.contacts?.teamLeader || '',
      officer: meta.contacts?.officer || basePledge?.contacts?.officer || '',
    },
    supportNeeded: {
      needed: meta.supportNeeded?.needed ?? basePledge?.supportNeeded?.needed ?? false,
      types: meta.supportNeeded?.types || basePledge?.supportNeeded?.types || [],
    },
    purpose,
    overview,
    budgetInfo: basePledge?.budgetInfo
      ? {
          ...basePledge.budgetInfo,
          sharedBudgetId: meta.sharedBudgetId ?? basePledge.budgetInfo.sharedBudgetId,
          isUndetermined: meta.isUndeterminedBudget ?? basePledge.budgetInfo.isUndetermined,
          isUnapportioned: meta.isUnapportionedBudget ?? basePledge.budgetInfo.isUnapportioned,
        }
      : {
          totalBudgetMillion: 0,
          normalizedKrwBillion: 0,
          rawText: overview.totalBudgetText,
          rawUnit: '백만원',
          isUndetermined: false,
          isUnapportioned: false,
          investmentPlan: [],
        },
    issuesAndSolutions: basePledge?.issuesAndSolutions || {
      issues: [],
      solutions: [],
      rawText: '',
    },
    finalGoal,
    termGoal,
    finalGoalAchieved: meta.finalGoalAchieved ?? basePledge?.finalGoalAchieved ?? false,
    termGoalAchieved: meta.termGoalAchieved ?? basePledge?.termGoalAchieved ?? false,
    yearlyPlans: basePledge?.yearlyPlans || [],
    currentProgressRate: meta.currentProgressRate ?? basePledge?.currentProgressRate ?? null,
    milestones: basePledge?.milestones || [],
    futurePlans: basePledge?.futurePlans || [],
    references: basePledge?.references || [],
    extraTables: basePledge?.extraTables,
    customSections,
    tags: meta.tags || basePledge?.tags || [],
    needsReview: basePledge?.needsReview ?? false,
    reviewReasons: basePledge?.reviewReasons || [],
    sourcePdf: meta.sourcePdf
      ? {
          pdfVersion: meta.sourcePdf.fileName || 'v1.0',
          fileName: meta.sourcePdf.fileName || 'document.pdf',
          pageRange: meta.sourcePdf.pageRange || '1',
          startPage: meta.sourcePdf.startPage || 1,
          endPage: meta.sourcePdf.endPage || 1,
        }
      : basePledge?.sourcePdf || {
          pdfVersion: 'v1.0',
          fileName: '샘플.pdf',
          pageRange: '1',
          startPage: 1,
          endPage: 1,
        },
    version: (meta.version || basePledge?.version || 1) + 1,
    updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
    updatedBy: meta.updatedBy || '사용자(직접편집)',
  };

  return { pledge, errors };
}
