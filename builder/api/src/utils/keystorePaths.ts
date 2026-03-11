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

export function getKeystoreCredentials(applicationId: string) {
  const propsPath = getKeystorePropsPath(applicationId);
  if (!fs.existsSync(propsPath)) return null;

  try {
    const content = fs.readFileSync(propsPath, 'utf8');
    const lines = content.split('\n');
    const creds: any = {};
    lines.forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        creds[key.trim()] = value.trim();
      }
    });
    return {
      storePassword: creds.storePassword,
      keyAlias: creds.keyAlias,
      keyPassword: creds.keyPassword
    };
  } catch (err) {
    console.error('Failed to read keystore properties:', err);
    return null;
  }
}
