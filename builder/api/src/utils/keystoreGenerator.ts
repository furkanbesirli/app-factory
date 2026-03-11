import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import { getKeystoreDir, getKeyJksPath, getKeystorePropsPath } from './keystorePaths';

const execAsync = promisify(exec);

export async function generateKeystore(applicationId: string, displayName: string) {
    const keysDir = getKeystoreDir(applicationId);
    const jksPath = getKeyJksPath(applicationId);
    const propsPath = getKeystorePropsPath(applicationId);

    await fs.ensureDir(keysDir);

    const password = 'furkankey';
    const alias = 'furkankey';

    // Use a sanitized app name for dname
    const sanitizedName = displayName.replace(/[^\w\s]/gi, '') || 'App';

    const command = [
        'keytool',
        '-genkey',
        '-v',
        '-keystore', jksPath,
        '-alias', alias,
        '-keyalg', 'RSA',
        '-keysize', '2048',
        '-validity', '10000',
        '-storepass', password,
        '-keypass', password,
        '-dname', `"CN=${sanitizedName}, OU=Mobile, O=${sanitizedName}, L=Istanbul, S=Istanbul, C=TR"`
    ].join(' ');

    console.log(`Generating keystore for ${applicationId}...`);
    await execAsync(command);

    const keystoreProps = [
        `storePassword=${password}`,
        `keyAlias=${alias}`,
        `keyPassword=${password}`,
    ].join('\n');

    await fs.writeFile(propsPath, keystoreProps);

    return {
        jksPath,
        propsPath,
        storePassword: password,
        keyAlias: alias,
        keyPassword: password
    };
}
