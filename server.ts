/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import path from 'path';
import JSZip from 'jszip';
import { PledgeDb } from './server/db';
import { pledgeToMarkdown, markdownToPledge } from './src/utils/markdownParser';
import { applyPledgeMerge } from './src/utils/threeWayMerge';
import { Pledge, PledgeMergeDiff, UserRole } from './src/types/pledge';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Middleware to extract user role and name from header (simulated auth)
  app.use((req, res, next) => {
    (req as any).userRole = (req.headers['x-user-role'] as UserRole) || 'editor';
    (req as any).userName = (req.headers['x-user-name'] as string) || '담당자';
    (req as any).isPublicView = req.headers['x-public-view'] === 'true';
    next();
  });

  // 1. Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // 2. Get dashboard statistics
  app.get(['/api/stats', '/api/stats/dashboard'], (req: Request, res: Response) => {
    try {
      const stats = PledgeDb.getDashboardStats();
      res.json({ success: true, stats });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. Get shared budgets
  app.get('/api/shared-budgets', (req: Request, res: Response) => {
    try {
      const sharedBudgets = PledgeDb.getSharedBudgets();
      res.json({ success: true, sharedBudgets });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 4. List all pledges
  app.get('/api/pledges', (req: Request, res: Response) => {
    try {
      let pledges = PledgeDb.getAll();
      const isPublic = (req as any).isPublicView;

      if (isPublic) {
        // Mask internal phone numbers and contact details for public view
        pledges = pledges.map((p) => ({
          ...p,
          contacts: {
            department: p.contacts.department,
            section: p.contacts.section,
            director: '비공개',
            teamLeader: '비공개',
            officer: '비공개',
          },
        }));
      }

      res.json({ success: true, pledges });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5. Get single pledge
  app.get('/api/pledges/:codeOrId', (req: Request, res: Response) => {
    try {
      const codeOrId = req.params.codeOrId;
      let pledge = PledgeDb.getByCodeOrId(codeOrId);
      if (!pledge) {
        res.status(404).json({ success: false, error: '해당 공약을 찾을 수 없습니다.' });
        return;
      }

      if ((req as any).isPublicView) {
        pledge = {
          ...pledge,
          contacts: {
            department: pledge.contacts.department,
            section: pledge.contacts.section,
            director: '비공개',
            teamLeader: '비공개',
            officer: '비공개',
          },
        };
      }

      const markdown = pledgeToMarkdown(pledge);
      res.json({ success: true, pledge, markdown });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 6. Get raw markdown for pledge
  app.get('/api/pledges/:codeOrId/markdown', (req: Request, res: Response) => {
    try {
      const markdown = PledgeDb.getMarkdown(req.params.codeOrId);
      if (!markdown) {
        res.status(404).send('해당 문서를 찾을 수 없습니다.');
        return;
      }
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.send(markdown);
    } catch (err: any) {
      res.status(500).send(err.message);
    }
  });

  // 7. Update pledge (requires editor or admin role)
  app.put('/api/pledges/:codeOrId', (req: Request, res: Response) => {
    try {
      const userRole = (req as any).userRole as UserRole;
      const userName = (req as any).userName;

      if (userRole === 'viewer') {
        res.status(403).json({
          success: false,
          error: '열람자(Viewer) 권한으로는 공약을 수정할 수 없습니다. 편집자(Editor) 또는 관리자(Admin) 권한으로 전환하세요.',
        });
        return;
      }

      const { pledge, reason, expectedVersion, rawMarkdown } = req.body;

      let targetPledge: Pledge;
      if (rawMarkdown) {
        const base = PledgeDb.getByCodeOrId(req.params.codeOrId);
        const parseResult = markdownToPledge(rawMarkdown, base || undefined);
        if (parseResult.errors.length > 0) {
          res.status(400).json({ success: false, error: parseResult.errors.join(' ') });
          return;
        }
        targetPledge = parseResult.pledge;
      } else {
        targetPledge = pledge;
      }

      if (!targetPledge || !targetPledge.code || !targetPledge.title) {
        res.status(400).json({ success: false, error: '관리번호와 공약명은 필수 입력 항목입니다.' });
        return;
      }

      const result = PledgeDb.savePledge(
        targetPledge,
        userName,
        userRole,
        reason || '위키 직접 편집 수정',
        'MANUAL_EDIT',
        expectedVersion,
      );

      if (!result.success) {
        res.status(409).json(result);
        return;
      }

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 8. Restore previous version
  app.post('/api/pledges/:codeOrId/restore', (req: Request, res: Response) => {
    try {
      const userRole = (req as any).userRole as UserRole;
      const userName = (req as any).userName;

      if (userRole === 'viewer') {
        res.status(403).json({ success: false, error: '열람자 권한으로는 버전을 복원할 수 없습니다.' });
        return;
      }

      const { targetVersion } = req.body;
      if (!targetVersion) {
        res.status(400).json({ success: false, error: '복원할 버전 번호가 필요합니다.' });
        return;
      }

      const result = PledgeDb.restoreVersion(req.params.codeOrId, Number(targetVersion), userName, userRole);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 9. Get version history
  app.get('/api/pledges/:codeOrId/history', (req: Request, res: Response) => {
    try {
      const pledge = PledgeDb.getByCodeOrId(req.params.codeOrId);
      if (!pledge) {
        res.status(404).json({ success: false, error: '해당 공약을 찾을 수 없습니다.' });
        return;
      }
      const history = PledgeDb.getHistory(pledge.id);
      res.json({ success: true, history });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 10. Discussions & internal work memos
  app.get('/api/pledges/:codeOrId/discussions', (req: Request, res: Response) => {
    try {
      const pledge = PledgeDb.getByCodeOrId(req.params.codeOrId);
      if (!pledge) {
        res.status(404).json({ success: false, error: '해당 공약을 찾을 수 없습니다.' });
        return;
      }
      const discussions = PledgeDb.getDiscussions(pledge.id);
      res.json({ success: true, discussions });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/pledges/:codeOrId/discussions', (req: Request, res: Response) => {
    try {
      const pledge = PledgeDb.getByCodeOrId(req.params.codeOrId);
      if (!pledge) {
        res.status(404).json({ success: false, error: '해당 공약을 찾을 수 없습니다.' });
        return;
      }
      const { content, isInternalMemo } = req.body;
      if (!content || !content.trim()) {
        res.status(400).json({ success: false, error: '내용을 입력해주세요.' });
        return;
      }
      const userName = (req as any).userName;
      const userRole = (req as any).userRole;
      const item = PledgeDb.addDiscussion(pledge.id, userName, userRole, content.trim(), Boolean(isInternalMemo));
      res.json({ success: true, discussion: item });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 11. PDF upload records & deduplication
  app.get('/api/pdf/uploads', (req: Request, res: Response) => {
    try {
      const uploads = PledgeDb.getPdfUploads();
      res.json({ success: true, uploads });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/pdf/record-upload', (req: Request, res: Response) => {
    try {
      const { fileName, fileHash, fileSize, versionLabel, extractedCount } = req.body;
      const record = PledgeDb.recordPdfUpload(fileName, fileHash, fileSize || 0, versionLabel, extractedCount || 0);
      res.json({ success: true, ...record });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 12. Transactional 3-Way Merge Apply
  app.post('/api/pdf/apply-merge', (req: Request, res: Response) => {
    try {
      const userRole = (req as any).userRole as UserRole;
      const userName = (req as any).userName;

      if (userRole === 'viewer') {
        res.status(403).json({ success: false, error: '열람자 권한으로는 PDF 갱신을 반영할 수 없습니다.' });
        return;
      }

      const { diffResults, pdfFileName } = req.body as {
        diffResults: PledgeMergeDiff[];
        pdfFileName: string;
      };

      if (!diffResults || !Array.isArray(diffResults)) {
        res.status(400).json({ success: false, error: '병합 대상 목록이 올바르지 않습니다.' });
        return;
      }

      const appliedPledges: Pledge[] = [];
      const skippedPledges: string[] = [];

      for (const diff of diffResults) {
        if (!diff.selectedForMerge) {
          skippedPledges.push(diff.pledgeCode);
          continue;
        }

        const current = PledgeDb.getByCodeOrId(diff.pledgeCode);
        if (diff.isNewPledge || !current) {
          // New pledge addition
          const newPledgeDiff = diff.fieldDiffs.find((f) => f.fieldPath === 'all');
          if (newPledgeDiff && newPledgeDiff.incomingValue) {
            const newPledge = newPledgeDiff.incomingValue as Pledge;
            const saveRes = PledgeDb.savePledge(
              newPledge,
              userName,
              userRole,
              `PDF 신규 등록: ${pdfFileName}`,
              'PDF_UPDATE',
            );
            if (saveRes.pledge) appliedPledges.push(saveRes.pledge);
          }
        } else {
          // 3-way merge onto current
          const merged = applyPledgeMerge(current, diff, pdfFileName, `${userName} (PDF병합)`);
          const reason = `PDF 재업로드 갱신 반영 (${pdfFileName}) [자동갱신: ${diff.autoUpdateCount}건, 충돌해결: ${diff.conflictsCount}건]`;
          const saveRes = PledgeDb.savePledge(merged, userName, userRole, reason, 'PDF_UPDATE', current.version);
          if (!saveRes.success) {
            throw new Error(`[${diff.pledgeCode}] 반영 실패: ${saveRes.error}`);
          }
          if (saveRes.pledge) appliedPledges.push(saveRes.pledge);
        }
      }

      res.json({
        success: true,
        message: `${appliedPledges.length}건의 공약사항이 안전하게 갱신되었습니다.`,
        appliedCount: appliedPledges.length,
        appliedCodes: appliedPledges.map((p) => p.code),
        skippedCodes: skippedPledges,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 13. Export all markdown and metadata as ZIP
  app.get('/api/export/zip', async (req: Request, res: Response) => {
    try {
      const zip = new JSZip();
      const pledges = PledgeDb.getAll();
      const sharedBudgets = PledgeDb.getSharedBudgets();

      // Add metadata.json
      const meta = {
        title: '공약위키 전체 백업 아카이브',
        exportedAt: new Date().toISOString(),
        totalPledges: pledges.length,
        pledgeCodes: pledges.map((p) => p.code),
        sharedBudgets,
      };
      zip.file('metadata.json', JSON.stringify(meta, null, 2));

      // Add individual Markdown files in /pledges folder
      const pledgesFolder = zip.folder('pledges');
      pledges.forEach((p) => {
        const md = pledgeToMarkdown(p);
        const fileName = `${p.code}_${p.title.replace(/[\\/:*?"<>|]/g, '_')}.md`;
        pledgesFolder?.file(fileName, md);
      });

      // Add README.md
      zip.file(
        'README.md',
        `# 공약위키 데이터 백업\n\n- 내보낸 시각: ${new Date().toLocaleString('ko-KR')}\n- 수록 공약 수: ${pledges.length}건\n- 본 아카이브의 마크다운 파일들은 표준 YAML front-matter와 마크다운으로 구성되어 있어 일반 옵시디언(Obsidian)이나 VS Code 등에서도 바로 읽을 수 있습니다.`,
      );

      const buffer = await zip.generateAsync({ type: 'nodebuffer' });
      const filename = `공약위키_전체백업_${new Date().toISOString().slice(0, 10)}.zip`;

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      res.send(buffer);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 14. Import Markdown file(s)
  app.post('/api/import/markdown', (req: Request, res: Response) => {
    try {
      const userRole = (req as any).userRole as UserRole;
      const userName = (req as any).userName;

      if (userRole === 'viewer') {
        res.status(403).json({ success: false, error: '열람자 권한으로는 마크다운을 가져올 수 없습니다.' });
        return;
      }

      const { markdown } = req.body;
      if (!markdown) {
        res.status(400).json({ success: false, error: '가져올 마크다운 내용이 없습니다.' });
        return;
      }

      const parseRes = markdownToPledge(markdown);
      if (parseRes.errors.length > 0) {
        res.status(400).json({ success: false, error: parseRes.errors.join(' ') });
        return;
      }

      const pledge = parseRes.pledge;
      const saveRes = PledgeDb.savePledge(
        pledge,
        userName,
        userRole,
        '마크다운 파일 재가져오기(Import) 반영',
        'MARKDOWN_IMPORT',
      );

      res.json(saveRes);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Vite middleware in dev mode OR static files in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Pledge Wiki Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
