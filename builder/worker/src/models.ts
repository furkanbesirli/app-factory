import mongoose, { Schema, Document } from 'mongoose';

// Re-declare models for the worker process (same schemas as API)

const ParameterSchema = new Schema({
  key: String, label: String, type: String,
  required: Boolean, defaultValue: Schema.Types.Mixed,
  validationRegex: String, helpText: String,
}, { _id: false });

const PatchRuleSchema = new Schema({
  filePath: String, mode: String, find: String,
  replaceWith: String, expectedMatches: Schema.Types.Mixed,
}, { _id: false });

const TemplateSchema = new Schema({
  name: String, localPath: String, description: String,
  parameters: [ParameterSchema], patchRules: [PatchRuleSchema],
}, { timestamps: true });

const KeystoreSchema = new Schema({
  encryptedJksBlobBase64: String, originalFileName: String,
  storePasswordEnc: String, keyAliasEnc: String, keyPasswordEnc: String,
}, { _id: false });

const AppSchema = new Schema({
  templateId: { type: Schema.Types.ObjectId, ref: 'Template' },
  displayName: String, applicationId: String, policyName: String,
  onesignalAppId: String, onesignalApiKey: String, analyticsUrl: String, keystore: KeystoreSchema,
}, { timestamps: true });

const BuildOutputsSchema = new Schema({
  apkPath: String, aabPath: String, mappingPath: String,
}, { _id: false });

const BuildSchema = new Schema({
  appId: { type: Schema.Types.ObjectId, ref: 'App', index: true },
  templateId: { type: Schema.Types.ObjectId, ref: 'Template' },
  requestedAt: { type: Date, default: Date.now },
  startedAt: Date, finishedAt: Date,
  status: { type: String, enum: ['queued', 'running', 'success', 'failed', 'cancelled'], index: true },
  versionCode: Number, versionName: String,
  paramsSnapshot: Schema.Types.Mixed,
  logsPath: String, outputs: BuildOutputsSchema, errorMessage: String,
});

export const Template = mongoose.models.Template || mongoose.model('Template', TemplateSchema);
export const App = mongoose.models.App || mongoose.model('App', AppSchema);
export const Build = mongoose.models.Build || mongoose.model('Build', BuildSchema);
