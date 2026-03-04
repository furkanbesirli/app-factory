import path from 'path';
import fs from 'fs-extra';

const ROOT = path.resolve(__dirname, '../../../');
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

export function readKeystoreProps(applicationId: string): { storePassword: string; keyAlias: string; keyPassword: string } | null {
  const propsPath = getKeystorePropsPath(applicationId);
  if (!fs.existsSync(propsPath)) return null;
  const content = fs.readFileSync(propsPath, 'utf-8');
  const lines = content.split('\n');
  const props: Record<string, string> = {};
  for (const line of lines) {
    const eq = line.indexOf('=');
    if (eq > 0) {
      props[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
    }
  }
  if (!props.storePassword || !props.keyAlias || !props.keyPassword) return null;
  return {
    storePassword: props.storePassword,
    keyAlias: props.keyAlias,
    keyPassword: props.keyPassword,
  };
}
