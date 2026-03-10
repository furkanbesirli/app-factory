import mongoose, { Schema, Document } from 'mongoose';

export interface IBuildOutputs {
  apkPath?: string;
  aabPath?: string;
  mappingPath?: string;
}

export type BuildStatus = 'queued' | 'running' | 'success' | 'failed' | 'cancelled';

export interface IBuildDoc extends Document {
  appId: mongoose.Types.ObjectId;
  templateId: mongoose.Types.ObjectId;
  requestedAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
  status: BuildStatus;
  versionCode: number;
  versionName: string;
  paramsSnapshot: Record<string, unknown>;
  templateVersion: number;
  logsPath?: string;
  outputs?: IBuildOutputs;
  errorMessage?: string;
}

const BuildOutputsSchema = new Schema<IBuildOutputs>({
  apkPath: String,
  aabPath: String,
  mappingPath: String,
}, { _id: false });

const BuildSchema = new Schema<IBuildDoc>({
  appId: { type: Schema.Types.ObjectId, ref: 'App', required: true, index: true },
  templateId: { type: Schema.Types.ObjectId, ref: 'Template', required: true },
  requestedAt: { type: Date, default: Date.now },
  startedAt: Date,
  finishedAt: Date,
  status: {
    type: String,
    enum: ['queued', 'running', 'success', 'failed', 'cancelled'],
    default: 'queued',
    index: true,
  },
  versionCode: { type: Number, required: true },
  versionName: { type: String, required: true },
  paramsSnapshot: { type: Schema.Types.Mixed, default: {} },
  templateVersion: { type: Number, default: 1 },
  logsPath: String,
  outputs: BuildOutputsSchema,
  errorMessage: String,
});

export const Build = mongoose.model<IBuildDoc>('Build', BuildSchema);
