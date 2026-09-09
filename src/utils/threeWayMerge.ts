/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Pledge,
  PledgeMergeDiff,
  FieldDiffItem,
  MergeFieldStatus,
} from '../types/pledge';

function isDeepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    return false;
  }
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Evaluates 3-way merge for a single field:
 * - Base: Previous PDF extraction snapshot
 * - Current: Current document in system (may contain user edits)
 * - Incoming: Newly extracted PDF data
 */
export function evaluateField3Way(
  fieldPath: string,
  fieldLabel: string,
  baseVal: any,
  currentVal: any,
  incomingVal: any,
): FieldDiffItem {
  const userChanged = !isDeepEqual(baseVal, currentVal);
  const pdfChanged = !isDeepEqual(baseVal, incomingVal);

  let status: MergeFieldStatus = 'UNCHANGED';
  let chosenValue = currentVal;
  let decision: 'keep_current' | 'use_incoming' | 'custom' = 'keep_current';

  if (!userChanged && !pdfChanged) {
    status = 'UNCHANGED';
    chosenValue = currentVal;
    decision = 'keep_current';
  } else if (!userChanged && pdfChanged) {
    // User didn't modify it; only incoming PDF has new data -> auto-update recommendation!
    status = 'AUTO_UPDATE';
    chosenValue = incomingVal;
    decision = 'use_incoming';
  } else if (userChanged && !pdfChanged) {
    // User modified it, incoming PDF remains as base -> keep user's manual edit!
    status = 'USER_KEPT';
    chosenValue = currentVal;
    decision = 'keep_current';
  } else {
    // Both user and PDF changed
    if (isDeepEqual(currentVal, incomingVal)) {
      // Both made the exact same change
      status = 'UNCHANGED';
      chosenValue = currentVal;
      decision = 'keep_current';
    } else {
      // Conflict!
      status = 'CONFLICT';
      chosenValue = currentVal; // default to safe keep current until user decides
      decision = 'keep_current';
    }
  }

  return {
    fieldPath,
    fieldLabel,
    baseValue: baseVal,
    currentValue: currentVal,
    incomingValue: incomingVal,
    status,
    chosenValue,
    decision,
  };
}

/**
 * Computes the complete 3-way diff between base, current, and incoming Pledge objects.
 */
export function computePledge3WayDiff(
  basePledge: Pledge | null,
  currentPledge: Pledge | null,
  incomingPledge: Pledge,
): PledgeMergeDiff {
  const fieldDiffs: FieldDiffItem[] = [];

  // If this is a completely new pledge not existing in current database:
  if (!currentPledge) {
    return {
      pledgeCode: incomingPledge.code,
      pledgeTitle: incomingPledge.title,
      isNewPledge: true,
      needsReview: incomingPledge.needsReview,
      conflictsCount: 0,
      autoUpdateCount: 1,
      fieldDiffs: [
        {
          fieldPath: 'all',
          fieldLabel: '신규 공약 등록',
          baseValue: null,
          currentValue: null,
          incomingValue: incomingPledge,
          status: 'AUTO_UPDATE',
          chosenValue: incomingPledge,
          decision: 'use_incoming',
        },
      ],
      selectedForMerge: true,
    };
  }

  // Base fallback if no previous snapshot exists: use current as base
  const base = basePledge || currentPledge;

  // 1. 사업명
  fieldDiffs.push(
    evaluateField3Way('title', '공약명 (사업명)', base.title, currentPledge.title, incomingPledge.title),
  );

  // 2. 사업기간
  fieldDiffs.push(
    evaluateField3Way('period', '사업기간', base.period, currentPledge.period, incomingPledge.period),
  );

  // 3. 완료시기
  fieldDiffs.push(
    evaluateField3Way('completionTiming', '완료시기 구분', base.completionTiming, currentPledge.completionTiming, incomingPledge.completionTiming),
  );

  // 4. 추진상황 원문
  fieldDiffs.push(
    evaluateField3Way('statusText', '추진상황 원문', base.statusText, currentPledge.statusText, incomingPledge.statusText),
  );

  // 5. 사업단계
  fieldDiffs.push(
    evaluateField3Way('stage', '사업 단계', base.stage, currentPledge.stage, incomingPledge.stage),
  );

  // 6. 일정상태
  fieldDiffs.push(
    evaluateField3Way('scheduleStatus', '일정 상태', base.scheduleStatus, currentPledge.scheduleStatus, incomingPledge.scheduleStatus),
  );

  // 7. 사업목적
  fieldDiffs.push(
    evaluateField3Way('purpose', '사업목적', base.purpose, currentPledge.purpose, incomingPledge.purpose),
  );

  // 8. 사업개요 - 총사업비 원문
  fieldDiffs.push(
    evaluateField3Way(
      'overview.totalBudgetText',
      '총사업비 원문 텍스트',
      base.overview.totalBudgetText,
      currentPledge.overview.totalBudgetText,
      incomingPledge.overview.totalBudgetText,
    ),
  );

  // 9. 총사업비 금액
  fieldDiffs.push(
    evaluateField3Way(
      'budgetInfo.totalBudgetMillion',
      '총사업비 (백만원)',
      base.budgetInfo.totalBudgetMillion,
      currentPledge.budgetInfo.totalBudgetMillion,
      incomingPledge.budgetInfo.totalBudgetMillion,
    ),
  );

  // 10. 지자체 부담액
  fieldDiffs.push(
    evaluateField3Way(
      'budgetInfo.localBurdenMillion',
      '시비(지자체) 부담액',
      base.budgetInfo.localBurdenMillion ?? 0,
      currentPledge.budgetInfo.localBurdenMillion ?? 0,
      incomingPledge.budgetInfo.localBurdenMillion ?? 0,
    ),
  );

  // 11. 최종 목표
  fieldDiffs.push(
    evaluateField3Way('finalGoal', '최종 목표', base.finalGoal, currentPledge.finalGoal, incomingPledge.finalGoal),
  );

  // 12. 임기내 목표
  fieldDiffs.push(
    evaluateField3Way('termGoal', '임기 내 목표', base.termGoal, currentPledge.termGoal, incomingPledge.termGoal),
  );

  // 13. 쟁점사항 및 해소방안
  fieldDiffs.push(
    evaluateField3Way(
      'issuesAndSolutions.rawText',
      '쟁점사항 및 해소방안',
      base.issuesAndSolutions.rawText,
      currentPledge.issuesAndSolutions.rawText,
      incomingPledge.issuesAndSolutions.rawText,
    ),
  );

  // 14. 추진실적 타임라인 (Milestones)
  fieldDiffs.push(
    evaluateField3Way(
      'milestones',
      '추진실적 마일스톤 건수 및 내용',
      base.milestones,
      currentPledge.milestones,
      incomingPledge.milestones,
    ),
  );

  // 15. 향후계획
  fieldDiffs.push(
    evaluateField3Way(
      'futurePlans',
      '향후계획 목록',
      base.futurePlans,
      currentPledge.futurePlans,
      incomingPledge.futurePlans,
    ),
  );

  // 16. 사용자 추가 섹션 - 항상 보존
  if (currentPledge.customSections && currentPledge.customSections.length > 0) {
    fieldDiffs.push({
      fieldPath: 'customSections',
      fieldLabel: '사용자 추가 섹션 (메모/특이사항)',
      baseValue: base.customSections,
      currentValue: currentPledge.customSections,
      incomingValue: incomingPledge.customSections || [],
      status: 'CUSTOM_PRESERVED',
      chosenValue: currentPledge.customSections,
      decision: 'keep_current',
    });
  }

  const conflictsCount = fieldDiffs.filter((f) => f.status === 'CONFLICT').length;
  const autoUpdateCount = fieldDiffs.filter((f) => f.status === 'AUTO_UPDATE').length;

  return {
    pledgeCode: currentPledge.code,
    pledgeTitle: currentPledge.title,
    isNewPledge: false,
    needsReview: currentPledge.needsReview || conflictsCount > 0,
    conflictsCount,
    autoUpdateCount,
    fieldDiffs,
    selectedForMerge: autoUpdateCount > 0 || conflictsCount > 0,
  };
}

/**
 * Applies the resolved 3-way merge onto the current Pledge object,
 * producing a clean merged version with updated timestamp and source.
 */
export function applyPledgeMerge(
  currentPledge: Pledge,
  diffResult: PledgeMergeDiff,
  newPdfFileName: string,
  updatedBy: string,
): Pledge {
  const merged: any = JSON.parse(JSON.stringify(currentPledge));

  diffResult.fieldDiffs.forEach((diff) => {
    const valueToSet =
      diff.decision === 'use_incoming'
        ? diff.incomingValue
        : diff.decision === 'custom'
          ? diff.chosenValue
          : diff.currentValue;

    if (diff.fieldPath.includes('.')) {
      const parts = diff.fieldPath.split('.');
      let obj = merged;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!obj[parts[i]]) obj[parts[i]] = {};
        obj = obj[parts[i]];
      }
      obj[parts[parts.length - 1]] = valueToSet;
    } else if (diff.fieldPath !== 'all') {
      merged[diff.fieldPath] = valueToSet;
    }
  });

  merged.version = (merged.version || 1) + 1;
  merged.updatedAt = new Date().toISOString().replace('T', ' ').slice(0, 19);
  merged.updatedBy = updatedBy;
  merged.sourcePdf = {
    ...merged.sourcePdf,
    pdfVersion: `v${merged.version}.0 (PDF반영)`,
    fileName: newPdfFileName,
  };

  return merged as Pledge;
}
