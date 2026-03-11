import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs-extra';
import { App } from '../models/App';
import { Build } from '../models/Build';
import { getKeystoreDir, getKeyJksPath, getKeystorePropsPath, hasKeystore } from '../utils/keystorePaths';
import { getAppAssetsDir, getLogoPath, hasLogo } from '../utils/assetPaths';
import { checkAppAvailability } from '../utils/playStore';
import { generatePolicies } from '../utils/policyGenerator';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

async function enrichApp(a: any) {
  const obj = typeof a.toObject === 'function' ? a.toObject() : { ...a };
  obj.keystore = hasKeystore(a.applicationId) ? { originalFileName: 'key.jks' } : undefined;
  obj.hasLogo = hasLogo(a.applicationId);

  // Check if update is needed
  const latestBuild = await Build.findOne({ appId: a._id, status: 'success' }).sort({ requestedAt: -1 });
  if (latestBuild && a.templateId && (a.templateId as any).version) {
    obj.needsUpdate = latestBuild.templateVersion < (a.templateId as any).version;
    obj.latestTemplateVersion = (a.templateId as any).version;
    obj.builtTemplateVersion = latestBuild.templateVersion;
  } else {
    obj.needsUpdate = false;
  }

  // Play Store Availability Check
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if (!a.lastStoreCheck || a.lastStoreCheck < oneDayAgo || a.storeStatus === 'unknown') {
    // Perform check asynchronously to not block the response too much
    // but we'll wait for it here for accuracy in this simplified version
    try {
      const status = await checkAppAvailability(a.applicationId);
      await App.findByIdAndUpdate(a._id, { storeStatus: status, lastStoreCheck: new Date() });
      obj.storeStatus = status;
    } catch (err) {
      console.error('Store check failed:', err);
    }
  }

  return obj;
}

// Logo by package name (applicationId) - must be before /:id
router.get('/logo/:applicationId', async (req: Request, res: Response) => {
  try {
    const applicationId = decodeURIComponent(String(req.params.applicationId));
    const logoPath = getLogoPath(applicationId);
    if (!fs.existsSync(logoPath)) {
      return res.status(404).json({ error: 'Logo not found' });
    }
    res.sendFile(logoPath);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/logo/:applicationId', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const applicationId = decodeURIComponent(String(req.params.applicationId));
    const app = await App.findOne({ applicationId });
    if (!app) return res.status(404).json({ error: 'App not found for this package' });

    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No logo file uploaded' });

    const assetsDir = getAppAssetsDir(applicationId);
    const logoPath = getLogoPath(applicationId);

    await fs.ensureDir(assetsDir);
    await fs.writeFile(logoPath, file.buffer);

    res.json({ message: 'Logo saved', hasLogo: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (_req: Request, res: Response) => {
  try {
    const apps = await App.find().sort({ createdAt: -1 }).populate('templateId', 'name version');
    const enrichedApps = await Promise.all(apps.map(enrichApp));
    res.json(enrichedApps);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const app = await App.create(req.body);
    // Generate policies on creation
    await generatePolicies(app.applicationId, app.policyName).catch(e => console.error('Policy generation failed:', e));
    res.status(201).json(app);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Serving Privacy Policy and Child Safety Standards by applicationId
router.get('/policies/:applicationId/:type', async (req: Request, res: Response) => {
  try {
    const applicationId = String(req.params.applicationId);
    const type = String(req.params.type);
    const fileName = type === 'privacy' ? 'privacy-policy.html' : type === 'child' ? 'child-safety.html' : null;

    if (!fileName) return res.status(400).json({ error: 'Invalid policy type' });

    const filePath = path.join(getAppAssetsDir(applicationId), fileName);
    if (!fs.existsSync(filePath)) {
      // Try to generate it if it doesn't exist (fail-safe)
      const app = await App.findOne({ applicationId });
      if (app) {
        await generatePolicies(applicationId, app.policyName);
        if (fs.existsSync(filePath)) {
          return res.sendFile(filePath);
        }
      }
      return res.status(404).json({ error: 'Policy file not found' });
    }

    res.sendFile(filePath);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const app = await App.findById(id).populate('templateId', 'name localPath version');
    if (!app) return res.status(404).json({ error: 'App not found' });
    res.json(await enrichApp(app));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const app = await App.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!app) return res.status(404).json({ error: 'App not found' });

    // Regenerate policies on update
    await generatePolicies(app.applicationId, app.policyName).catch(e => console.error('Policy generation failed:', e));

    res.json(app);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

import path from 'path';

// ... existing code ...

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const app = await App.findById(id);
    if (!app) return res.status(404).json({ error: 'App not found' });

    const { applicationId } = app;

    // 1. Find and delete all build records for this app
    const builds = await Build.find({ appId: id });
    const buildIds = builds.map(b => b._id.toString());

    // 2. Physical Cleanup
    const ROOT = path.resolve(__dirname, '../../../../');

    // Assets & Keys (by applicationId)
    const assetsDir = getAppAssetsDir(applicationId);
    const keysDir = getKeystoreDir(applicationId);

    // Artifacts (check both applicationId and appId)
    const artifactByPkg = path.join(ROOT, 'builder/artifacts/apps', applicationId);
    const artifactById = path.join(ROOT, 'builder/artifacts/apps', id);

    // Remove directories
    await fs.remove(assetsDir).catch(e => console.error(`Failed to remove assets for ${applicationId}:`, e.message));
    await fs.remove(keysDir).catch(e => console.error(`Failed to remove keys for ${applicationId}:`, e.message));
    await fs.remove(artifactByPkg).catch(e => console.error(`Failed to remove artifact pkg ${applicationId}:`, e.message));
    await fs.remove(artifactById).catch(e => console.error(`Failed to remove artifact id ${id}:`, e.message));

    // Cleanup workspaces for each build
    for (const bId of buildIds) {
      const workspaceDir = path.join(ROOT, 'builder/workspaces', bId);
      await fs.remove(workspaceDir).catch(e => console.error(`Failed to remove workspace ${bId}:`, e.message));
    }

    // 3. Database Cleanup
    await Build.deleteMany({ appId: id });
    await App.findByIdAndDelete(id);

    res.json({ message: 'App and all associated data deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/keystore', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const app = await App.findById(id);
    if (!app) return res.status(404).json({ error: 'App not found' });

    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No keystore file uploaded' });

    const { storePassword, keyAlias, keyPassword } = req.body;
    if (!storePassword || !keyAlias || !keyPassword) {
      return res.status(400).json({ error: 'storePassword, keyAlias, keyPassword are required' });
    }

    const keysDir = getKeystoreDir(app.applicationId);
    const jksPath = getKeyJksPath(app.applicationId);
    const propsPath = getKeystorePropsPath(app.applicationId);

    await fs.ensureDir(keysDir);
    await fs.writeFile(jksPath, file.buffer);

    const keystoreProps = [
      `storePassword=${storePassword}`,
      `keyAlias=${keyAlias}`,
      `keyPassword=${keyPassword}`,
    ].join('\n');
    await fs.writeFile(propsPath, keystoreProps);

    res.json({ message: 'Keystore saved to disk', originalFileName: 'key.jks' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/logo', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const app = await App.findById(req.params.id);
    if (!app) return res.status(404).json({ error: 'App not found' });

    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No logo file uploaded' });

    const assetsDir = getAppAssetsDir(app.applicationId);
    const logoPath = getLogoPath(app.applicationId);

    await fs.ensureDir(assetsDir);
    await fs.writeFile(logoPath, file.buffer);

    res.json({ message: 'Logo saved', hasLogo: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/logo', async (req: Request, res: Response) => {
  try {
    const app = await App.findById(req.params.id);
    if (!app) return res.status(404).json({ error: 'App not found' });

    const logoPath = getLogoPath(app.applicationId);
    if (!fs.existsSync(logoPath)) {
      return res.status(404).json({ error: 'Logo not found' });
    }

    res.sendFile(logoPath);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete the duplicate route at the end of the file

export default router;
