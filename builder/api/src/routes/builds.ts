import { Router, Request, Response } from 'express';
import { Build } from '../models/Build';
import { App } from '../models/App';
import { isContainerPerBuildEnabled, spawnBuildContainer } from '../utils/buildRunner';

const router = Router();

router.post('/apps/:id/builds', async (req: Request, res: Response) => {
  try {
    const app = await App.findById(req.params.id);
    if (!app) return res.status(404).json({ error: 'App not found' });

    const { versionCode, versionName, appNameTR, appNameEN, appNameES, onesignalAppId, diversify } = req.body;
    if (!versionCode || !versionName) {
      return res.status(400).json({ error: 'versionCode and versionName are required' });
    }

    const build = await Build.create({
      appId: app._id,
      templateId: app.templateId,
      status: 'queued',
      versionCode: Number(versionCode),
      versionName,
      paramsSnapshot: {
        appNameTR: appNameTR || app.displayName,
        appNameEN: appNameEN || app.displayName,
        appNameES: appNameES || app.displayName,
        onesignalAppId: onesignalAppId || app.onesignalAppId || '',
        applicationId: app.applicationId,
        displayName: app.displayName,
        appLabel: app.appLabel || app.displayName,
        appSubtitle: app.appSubtitle || '',
        loginBgColorStart: app.loginBgColorStart || '#4C1D95',
        loginBgColorEnd: app.loginBgColorEnd || '#1E1B4B',
        brandPrimaryColor: app.brandPrimaryColor || '#7C3AED',
        diversify: diversify ?? {
          enabled: true,
          classCount: 8,
          resourceNoise: true,
          dummyAssets: true,
          dummyAssetSizeMb: 2,
          layoutNoise: true,
          obfuscationDict: true,
          proguardEnabled: true,
        },
      },
    });

    if (isContainerPerBuildEnabled()) {
      try {
        const { containerId } = await spawnBuildContainer(build._id.toString());
        console.log(`Build ${build._id} → container ${containerId.slice(0, 12)}`);
      } catch (err: any) {
        console.error(`Failed to spawn container for build ${build._id}:`, err.message);
      }
    }

    res.status(201).json(build);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/apps/:id/builds', async (req: Request, res: Response) => {
  try {
    const builds = await Build.find({ appId: req.params.id }).sort({ requestedAt: -1 });
    res.json(builds);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/builds/:id', async (req: Request, res: Response) => {
  try {
    const build = await Build.findById(req.params.id);
    if (!build) return res.status(404).json({ error: 'Build not found' });
    res.json(build);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/builds/:id/cancel', async (req: Request, res: Response) => {
  try {
    const build = await Build.findById(req.params.id);
    if (!build) return res.status(404).json({ error: 'Build not found' });
    if (build.status !== 'queued' && build.status !== 'running') {
      return res.status(400).json({ error: 'Sadece sırada veya üretimdeki build iptal edilebilir' });
    }
    build.status = 'cancelled';
    build.finishedAt = new Date();
    await build.save();
    res.json(build);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
