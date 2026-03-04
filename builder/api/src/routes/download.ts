import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs-extra';

const router = Router();

// __dirname = builder/api/src/routes → go up to project root, then builder/artifacts
const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const DEFAULT_ARTIFACTS = path.join(ROOT, 'builder', 'artifacts');

router.get('/download', (req: Request, res: Response) => {
  try {
    const filePath = req.query.path as string;
    if (!filePath) return res.status(400).json({ error: 'path query parameter required' });

    // ARTIFACTS_ROOT from .env is often relative (e.g. ./builder/artifacts); resolve from project root
    const artifactsRoot = process.env.ARTIFACTS_ROOT
      ? path.isAbsolute(process.env.ARTIFACTS_ROOT)
        ? process.env.ARTIFACTS_ROOT
        : path.resolve(ROOT, process.env.ARTIFACTS_ROOT)
      : DEFAULT_ARTIFACTS;
    const resolved = path.resolve(artifactsRoot, filePath);

    if (!resolved.startsWith(artifactsRoot)) {
      return res.status(403).json({ error: 'Access denied: path traversal detected' });
    }

    if (!fs.existsSync(resolved)) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.download(resolved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
