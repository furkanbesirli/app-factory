import fs from 'fs-extra';
import path from 'path';
import { getAppAssetsDir } from './assetPaths';

const TEMPLATES_DIR = path.join(__dirname, '../../templates');

export async function generatePolicies(applicationId: string, appName: string) {
    const assetsDir = getAppAssetsDir(applicationId);
    await fs.ensureDir(assetsDir);

    const date = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Extract domain from package name for emails (e.g. com.example.app -> example.com)
    const parts = applicationId.split('.');
    let domain = 'support.com';
    if (parts.length >= 2) {
        // If it's com.cmzymobile.aab -> cmzymobile.com
        // Search for a meaningful domain part
        const mainPart = parts[parts.length - 2];
        domain = `${mainPart}.com`;
    }

    const supportEmail = `support@${domain}`;
    const safetyEmail = `safety@${domain}`;

    const replacements: Record<string, string> = {
        '{{APP_NAME}}': appName,
        '{{PACKAGE_NAME}}': applicationId,
        '{{DATE}}': date,
        '{{SUPPORT_EMAIL}}': supportEmail,
        '{{SAFETY_EMAIL}}': safetyEmail
    };

    const templates = [
        { src: 'privacy-policy.html', dest: 'privacy-policy.html' },
        { src: 'child-safety.html', dest: 'child-safety.html' }
    ];

    for (const t of templates) {
        const templatePath = path.join(TEMPLATES_DIR, t.src);
        if (!fs.existsSync(templatePath)) {
            console.warn(`Template not found: ${templatePath}`);
            continue;
        }

        let content = await fs.readFile(templatePath, 'utf8');

        // Replace placeholders
        for (const [placeholder, value] of Object.entries(replacements)) {
            content = content.replace(new RegExp(placeholder, 'g'), value);
        }

        const destPath = path.join(assetsDir, t.dest);
        await fs.writeFile(destPath, content);
    }
}
