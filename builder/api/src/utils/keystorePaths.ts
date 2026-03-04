import path from 'path';
import fs from 'fs-extra';

const ROOT = path.resolve(__dirname, '../../../../');
const KEYS_ROOT = process.env.KEYS_ROOT || path.join(ROOT, 'builder', 'keys');

/** Paket adı (applicationId) ile keystore dizini - örn: com.example.app */
export function getKeystoreDir(applicationId: string): string {
  return path.join(KEYS_ROOT, applicationId);
}

export function getKeyJksPath(applicationId: string): string {
  return path.join(getKeystoreDir(applicationId), 'key.jks');
}

export function getKeystorePropsPath(applicationId: string): string {
  return path.join(getKeystoreDir(applicationId), 'keystore.properties');
}

export function hasKeystore(applicationId: string): boolean {
  const jksPath = getKeyJksPath(applicationId);
  const propsPath = getKeystorePropsPath(applicationId);
  return fs.existsSync(jksPath) && fs.existsSync(propsPath);
}
