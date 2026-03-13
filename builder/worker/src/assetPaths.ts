import path from 'path';
import fs from 'fs-extra';

const ROOT = path.resolve(__dirname, '../../../');
const ASSETS_ROOT = process.env.ASSETS_ROOT || path.join(ROOT, 'builder', 'assets');

export function getLogoPath(applicationId: string): string {
  return path.join(ASSETS_ROOT, applicationId, 'logo.png');
}

export function hasLogo(applicationId: string): boolean {
  return fs.existsSync(getLogoPath(applicationId));
}

export function getGoogleServicesPath(applicationId: string): string {
  return path.join(ASSETS_ROOT, applicationId, 'google-services.json');
}

export function hasGoogleServices(applicationId: string): boolean {
  return fs.existsSync(getGoogleServicesPath(applicationId));
}
