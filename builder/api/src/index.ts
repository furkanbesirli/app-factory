import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import templateRoutes from './routes/templates';
import appRoutes from './routes/apps';
import buildRoutes from './routes/builds';
import downloadRoutes from './routes/download';
import pushRoutes from './routes/push';

const app = express();
const PORT = process.env.API_PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use('/templates', templateRoutes);
app.use('/apps', appRoutes);
app.use('/', buildRoutes);
app.use('/', downloadRoutes);
app.use('/push', pushRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

async function start() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/android_builder';
  console.log(`Connecting to MongoDB: ${mongoUri}`);
  await mongoose.connect(mongoUri);
  console.log('MongoDB connected');

  app.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start API:', err);
  process.exit(1);
});
