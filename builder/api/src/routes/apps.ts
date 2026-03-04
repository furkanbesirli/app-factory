import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs-extra';
import { App } from '../models/App';
import { getKeystoreDir, getKeyJksPath, getKeystorePropsPath, hasKeystore } from '../utils/keystorePaths';
import { getAppAssetsDir, getLogoPath, hasLogo } from '../utils/assetPaths';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function enrichApp(a: any) {
  const obj = typeof a.toObject === 'function' ? a.toObject() : { ...a };
  obj.keystore = hasKeystore(a.applicationId) ? { originalFileName: 'key.jks' } : undefined;
  obj.hasLogo = hasLogo(a.applicationId);
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
    const apps = await App.find().sort({ createdAt: -1 }).populate('templateId', 'name');
    res.json(apps.map(enrichApp));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const app = await App.create(req.body);
    res.status(201).json(app);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const app = await App.findById(id).populate('templateId', 'name localPath');
    if (!app) return res.status(404).json({ error: 'App not found' });
    res.json(enrichApp(app));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const app = await App.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!app) return res.status(404).json({ error: 'App not found' });
    res.json(app);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const app = await App.findByIdAndDelete(req.params.id);
    if (!app) return res.status(404).json({ error: 'App not found' });
    res.json({ message: 'App deleted' });
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

export default router;
