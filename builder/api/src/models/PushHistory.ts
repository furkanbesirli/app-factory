import mongoose, { Schema, Document } from 'mongoose';

export interface IPushHistoryDoc extends Document {
  appId: mongoose.Types.ObjectId;
  onesignalNotificationId?: string;
  title: string;
  message: string;
  image?: string;
  url?: string;
  schedule: string;
  scheduledTime?: string;
  sentAt: Date;
  success: boolean;
  recipients?: number;
  successful?: number;
  failed?: number;
  converted?: number;
  error?: string;
}

const PushHistorySchema = new Schema<IPushHistoryDoc>({
  appId: { type: Schema.Types.ObjectId, ref: 'App', required: true, index: true },
  onesignalNotificationId: String,
  title: { type: String, required: true },
  message: { type: String, required: true },
  image: String,
  url: String,
  schedule: { type: String, default: 'immediately' },
  scheduledTime: String,
  sentAt: { type: Date, default: Date.now },
  success: { type: Boolean, required: true },
  recipients: Number,
  successful: Number,
  failed: Number,
  converted: Number,
  error: String,
}, { timestamps: true });

export const PushHistory = mongoose.model<IPushHistoryDoc>('PushHistory', PushHistorySchema);
