import mongoose, { Schema, Document } from 'mongoose';

export interface ITemplateParameter {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean';
  required: boolean;
  defaultValue?: string | number | boolean;
  validationRegex?: string;
  helpText?: string;
}

export interface IPatchRule {
  filePath: string;
  mode: 'replace' | 'regex';
  find: string;
  replaceWith: string;
  expectedMatches?: number | string;
}

export interface ITemplateDoc extends Document {
  name: string;
  localPath: string;
  description?: string;
  parameters: ITemplateParameter[];
  patchRules: IPatchRule[];
  createdAt: Date;
  updatedAt: Date;
}

const ParameterSchema = new Schema<ITemplateParameter>({
  key: { type: String, required: true },
  label: { type: String, required: true },
  type: { type: String, enum: ['string', 'number', 'boolean'], required: true },
  required: { type: Boolean, default: false },
  defaultValue: Schema.Types.Mixed,
  validationRegex: String,
  helpText: String,
}, { _id: false });

const PatchRuleSchema = new Schema<IPatchRule>({
  filePath: { type: String, required: true },
  mode: { type: String, enum: ['replace', 'regex'], required: true },
  find: { type: String, required: true },
  replaceWith: { type: String, required: true },
  expectedMatches: Schema.Types.Mixed,
}, { _id: false });

const TemplateSchema = new Schema<ITemplateDoc>({
  name: { type: String, required: true },
  localPath: { type: String, required: true },
  description: String,
  parameters: [ParameterSchema],
  patchRules: [PatchRuleSchema],
}, { timestamps: true });

export const Template = mongoose.model<ITemplateDoc>('Template', TemplateSchema);
