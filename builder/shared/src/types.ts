export interface TemplateParameter {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean';
  required: boolean;
  defaultValue?: string | number | boolean;
  validationRegex?: string;
  helpText?: string;
}

export interface PatchRule {
  filePath: string;
  mode: 'replace' | 'regex';
  find: string;
  replaceWith: string;
  expectedMatches?: number | '>=1';
}

export interface ITemplate {
  _id?: string;
  name: string;
  localPath: string;
  description?: string;
  parameters: TemplateParameter[];
  patchRules: PatchRule[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface KeystoreInfo {
  encryptedJksBlobBase64?: string;
  originalFileName?: string;
  storePasswordEnc?: string;
  keyAliasEnc?: string;
  keyPasswordEnc?: string;
}

export interface IApp {
  _id?: string;
  templateId: string;
  displayName: string;
  applicationId: string;
  policyName: string;
  onesignalAppId?: string;
  analyticsUrl?: string;
  keystore?: KeystoreInfo;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BuildOutputs {
  apkPath?: string;
  aabPath?: string;
  mappingPath?: string;
}

export type BuildStatus = 'queued' | 'running' | 'success' | 'failed';

export interface IBuild {
  _id?: string;
  appId: string;
  templateId: string;
  requestedAt?: Date;
  startedAt?: Date;
  finishedAt?: Date;
  status: BuildStatus;
  versionCode: number;
  versionName: string;
  paramsSnapshot: Record<string, unknown>;
  logsPath?: string;
  outputs?: BuildOutputs;
  errorMessage?: string;
}
