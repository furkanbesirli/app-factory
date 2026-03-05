import { Router, Request, Response } from 'express';
import { App } from '../models/App';
import { PushHistory } from '../models/PushHistory';

const router = Router();

const ONESIGNAL_API = 'https://api.onesignal.com/notifications';

interface PushResult {
  appId: string;
  displayName: string;
  success: boolean;
  recipients?: number;
  successful?: number;
  error?: string;
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function fetchNotificationStats(notificationId: string, appOnesignalId: string, apiKey: string) {
  try {
    await sleep(2000);
    const res = await fetch(`${ONESIGNAL_API}/${notificationId}?app_id=${appOnesignalId}`, {
      headers: { 'Authorization': `Key ${apiKey}` },
    });
    if (res.ok) {
      const data = (await res.json()) as { successful?: number; failed?: number; converted?: number; remaining?: number };
      return {
        successful: data.successful || 0,
        failed: data.failed || 0,
        converted: data.converted || 0,
        remaining: data.remaining || 0,
      };
    }
  } catch { /* ignore */ }
  return null;
}

async function sendOnePush(
  app: any,
  payload: { title: string; message: string; image?: string; url?: string; schedule?: string; scheduledTime?: string },
): Promise<PushResult> {
  const body: any = {
    app_id: app.onesignalAppId,
    target_channel: 'push',
    included_segments: ['All'],
    headings: { en: payload.title },
    contents: { en: payload.message },
    name: payload.title,
  };
  if (payload.image) body.big_picture = payload.image;
  if (payload.url) body.url = payload.url;
  if (payload.schedule === 'scheduled' && payload.scheduledTime) body.send_after = payload.scheduledTime;

  try {
    const response = await fetch(ONESIGNAL_API, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${app.onesignalApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as { id?: string; recipients?: number; errors?: string[] };

    if (response.ok && data.id) {
      const stats = await fetchNotificationStats(data.id, app.onesignalAppId, app.onesignalApiKey);

      const recipients = stats?.successful || data.recipients || 0;

      await PushHistory.create({
        appId: app._id,
        onesignalNotificationId: data.id,
        title: payload.title,
        message: payload.message,
        image: payload.image,
        url: payload.url,
        schedule: payload.schedule || 'immediately',
        scheduledTime: payload.scheduledTime,
        success: true,
        recipients,
        successful: stats?.successful || 0,
        failed: stats?.failed || 0,
        converted: stats?.converted || 0,
      });

      return { appId: app._id.toString(), displayName: app.displayName, success: true, recipients, successful: stats?.successful || 0 };
    } else {
      const errMsg = data.errors?.join(', ') || JSON.stringify(data.errors) || 'OneSignal API error';
      await PushHistory.create({
        appId: app._id,
        title: payload.title,
        message: payload.message,
        image: payload.image,
        url: payload.url,
        schedule: payload.schedule || 'immediately',
        scheduledTime: payload.scheduledTime,
        success: false,
        error: errMsg,
      });
      return { appId: app._id.toString(), displayName: app.displayName, success: false, error: errMsg };
    }
  } catch (err: any) {
    await PushHistory.create({
      appId: app._id,
      title: payload.title,
      message: payload.message,
      image: payload.image,
      url: payload.url,
      schedule: payload.schedule || 'immediately',
      scheduledTime: payload.scheduledTime,
      success: false,
      error: err.message,
    });
    return { appId: app._id.toString(), displayName: app.displayName, success: false, error: err.message };
  }
}

router.post('/send', async (req: Request, res: Response) => {
  try {
    const { appIds, sendToAll, title, message, image, url, schedule, scheduledTime } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'title and message are required' });
    }

    let apps: any[];
    if (sendToAll) {
      apps = await App.find({
        onesignalAppId: { $exists: true, $ne: '' },
        onesignalApiKey: { $exists: true, $ne: '' },
      });
    } else if (appIds && appIds.length > 0) {
      apps = await App.find({
        _id: { $in: appIds },
        onesignalAppId: { $exists: true, $ne: '' },
        onesignalApiKey: { $exists: true, $ne: '' },
      });
    } else {
      return res.status(400).json({ error: 'appIds or sendToAll required' });
    }

    if (apps.length === 0) {
      return res.status(400).json({ error: 'No apps with OneSignal credentials found' });
    }

    const pl = { title, message, image, url, schedule, scheduledTime };
    const results: PushResult[] = [];
    for (const app of apps) {
      results.push(await sendOnePush(app, pl));
    }

    const successCount = results.filter(r => r.success).length;
    res.json({ sent: successCount, failed: results.length - successCount, total: results.length, results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/history/:appId', async (req: Request, res: Response) => {
  try {
    const appId = req.params.appId;
    const history = await PushHistory.find({ appId }).sort({ sentAt: -1 }).limit(50).lean();
    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/apps', async (_req: Request, res: Response) => {
  try {
    const apps = await App.find({
      onesignalAppId: { $exists: true, $ne: '' },
      onesignalApiKey: { $exists: true, $ne: '' },
    }).select('_id displayName applicationId onesignalAppId');
    res.json(apps);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
