import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import mongoose from 'mongoose';
import { Template } from './models/Template';

const TEMPLATES = [
  {
    name: 'Umingle Template',
    localPath: './android',
    description: 'Orijinal login ekranı — glassmorphism kart tasarımı, merkezi hero section',
    parameters: [
      { key: 'APP_VERSION', label: 'Versiyon Kodu', type: 'number' as const, required: true, defaultValue: 100 },
      { key: 'APP_NAME_TR', label: 'Uygulama Adı (TR)', type: 'string' as const, required: false, defaultValue: 'Umingle' },
      { key: 'APP_NAME_EN', label: 'Uygulama Adı (EN)', type: 'string' as const, required: false, defaultValue: 'Umingle' },
      { key: 'APP_NAME_ES', label: 'Uygulama Adı (ES)', type: 'string' as const, required: false, defaultValue: 'Umingle' },
      { key: 'APP_ONESIGNAL_ID', label: 'OneSignal ID', type: 'string' as const, required: false },
    ],
    patchRules: [],
  },
  {
    name: 'Umingle V2 Template',
    localPath: './android-v2',
    description: 'Farklı login ekranı — bottom sheet kart tasarımı, minimal üst alan',
    parameters: [
      { key: 'APP_VERSION', label: 'Versiyon Kodu', type: 'number' as const, required: true, defaultValue: 100 },
      { key: 'APP_NAME_TR', label: 'Uygulama Adı (TR)', type: 'string' as const, required: false, defaultValue: 'Umingle' },
      { key: 'APP_NAME_EN', label: 'Uygulama Adı (EN)', type: 'string' as const, required: false, defaultValue: 'Umingle' },
      { key: 'APP_NAME_ES', label: 'Uygulama Adı (ES)', type: 'string' as const, required: false, defaultValue: 'Umingle' },
      { key: 'APP_ONESIGNAL_ID', label: 'OneSignal ID', type: 'string' as const, required: false },
    ],
    patchRules: [],
  },
];

async function seed() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/android_builder';
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  for (const tpl of TEMPLATES) {
    const existing = await Template.findOne({ name: tpl.name });
    if (existing) {
      console.log(`"${tpl.name}" zaten mevcut, atlanıyor.`);
      continue;
    }
    const created = await Template.create(tpl);
    console.log(`Template oluşturuldu: "${tpl.name}" → ${created._id}`);
  }

  await mongoose.disconnect();
  console.log('Seed tamamlandı.');
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
