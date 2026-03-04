import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import mongoose from 'mongoose';
import { Template } from './models/Template';

async function seed() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/android_builder';
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const existing = await Template.findOne({ name: 'Umingle Template' });
  if (existing) {
    console.log('Default template already exists, skipping seed.');
    await mongoose.disconnect();
    return;
  }

  const template = await Template.create({
    name: 'Umingle Template',
    localPath: './android',
    description: 'Default Kotlin Android template based on Umingle project',
    parameters: [
      { key: 'APP_VERSION', label: 'Versiyon Kodu', type: 'number', required: true, defaultValue: 100 },
      { key: 'APP_NAME_TR', label: 'Uygulama Adı (TR)', type: 'string', required: false, defaultValue: 'Umingle' },
      { key: 'APP_NAME_EN', label: 'Uygulama Adı (EN)', type: 'string', required: false, defaultValue: 'Umingle' },
      { key: 'APP_NAME_ES', label: 'Uygulama Adı (ES)', type: 'string', required: false, defaultValue: 'Umingle' },
      { key: 'APP_ONESIGNAL_ID', label: 'OneSignal ID', type: 'string', required: false },
    ],
    patchRules: [],
  });

  console.log('Default template created:', template._id);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
