import mongoose, { Schema, Document } from 'mongoose';

export interface IKeystoreInfo {
  encryptedJksBlobBase64?: string;
  originalFileName?: string;
  storePasswordEnc?: string;
  keyAliasEnc?: string;
  keyPasswordEnc?: string;
}

export interface IAppDoc extends Document {
  templateId: mongoose.Types.ObjectId;
  displayName: string;
  applicationId: string;
  policyName: string;
  onesignalAppId?: string;
  onesignalApiKey?: string;
  analyticsUrl?: string;
  keystore?: IKeystoreInfo;
  appLabel?: string;
  appSubtitle?: string;
  loginBgColorStart?: string;
  loginBgColorEnd?: string;
  brandPrimaryColor?: string;
  storeStatus?: 'published' | 'removed' | 'unknown';
  lastStoreCheck?: Date;
  serverIp?: string;
  serverPassword?: string;
  googleAccount?: string;
  googlePassword?: string;
  showLiveUsers?: boolean;
  liveUsersCount?: string;
  liveUsersText?: string;
  loginButtonAreaBgColor?: string;
  createdAt: Date;
  updatedAt: Date;
}

const KeystoreSchema = new Schema<IKeystoreInfo>({
  encryptedJksBlobBase64: String,
  originalFileName: String,
  storePasswordEnc: String,
  keyAliasEnc: String,
  keyPasswordEnc: String,
}, { _id: false });

const AppSchema = new Schema<IAppDoc>({
  templateId: { type: Schema.Types.ObjectId, ref: 'Template', required: true },
  displayName: { type: String, required: true },
  applicationId: { type: String, required: true, unique: true },
  policyName: { type: String, required: true },
  onesignalAppId: String,
  onesignalApiKey: String,
  analyticsUrl: String,
  keystore: KeystoreSchema,
  appLabel: { type: String, default: '' },
  appSubtitle: { type: String, default: '' },
  loginBgColorStart: { type: String, default: '#4C1D95' },
  loginBgColorEnd: { type: String, default: '#1E1B4B' },
  brandPrimaryColor: { type: String, default: '#7C3AED' },
  storeStatus: { type: String, enum: ['published', 'removed', 'unknown'], default: 'unknown' },
  lastStoreCheck: Date,
  serverIp: { type: String, default: '' },
  serverPassword: { type: String, default: '' },
  googleAccount: { type: String, default: '' },
  googlePassword: { type: String, default: '' },
  showLiveUsers: { type: Boolean, default: true },
  liveUsersCount: { type: String, default: '85,432' },
  liveUsersText: { type: String, default: 'users are live' },
  loginButtonAreaBgColor: { type: String, default: '#ffffff' },
}, { timestamps: true });

export const App = mongoose.model<IAppDoc>('App', AppSchema);
