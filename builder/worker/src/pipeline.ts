import path from 'path';
import fs from 'fs-extra';
import crypto from 'crypto';
import { spawn } from 'child_process';
import { applyDiversification, DiversifyOptions } from './diversify';

const ROOT = path.resolve(__dirname, '../../../');

interface BuildContext {
  buildId: string;
  templatePath: string;
  applicationId: string;
  versionCode: number;
  versionName: string;
  appNameTR: string;
  appNameEN: string;
  appNameES: string;
  onesignalAppId?: string;
  keystoreJksPath?: string;
  storePassword?: string;
  keyAlias?: string;
  keyPassword?: string;
  appLabel?: string;
  appSubtitle?: string;
  loginBgColorStart?: string;
  loginBgColorEnd?: string;
  brandPrimaryColor?: string;
  logoPath?: string;
  sourcePackage?: string;
  diversify?: DiversifyOptions;
  patchRules: Array<{
    filePath: string;
    mode: 'replace' | 'regex';
    find: string;
    replaceWith: string;
    expectedMatches?: number | string;
  }>;
}

function resolveFromRoot(p: string): string {
  if (path.isAbsolute(p)) return p;
  return path.resolve(ROOT, p);
}

function log(logStream: fs.WriteStream, msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  logStream.write(line + '\n');
  console.log(line);
}

function runCommand(cmd: string, args: string[], cwd: string, logStream: fs.WriteStream): Promise<number> {
  return new Promise((resolve, reject) => {
    log(logStream, `> ${cmd} ${args.join(' ')}`);
    const proc = spawn(cmd, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        JAVA_HOME: process.env.JAVA_HOME || undefined,
        ANDROID_HOME: process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME || undefined,
        ANDROID_SDK_ROOT: process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME || undefined,
      },
    });

    proc.stdout?.on('data', (data) => {
      logStream.write(data);
    });
    proc.stderr?.on('data', (data) => {
      logStream.write(data);
    });

    proc.on('close', (code) => {
      resolve(code ?? 1);
    });
    proc.on('error', (err) => {
      log(logStream, `Command error: ${err.message}`);
      reject(err);
    });
  });
}

function updateGradleField(content: string, field: string, value: string | number): string {
  const isString = typeof value === 'string';
  const formattedValue = isString ? `"${value}"` : String(value);

  const patterns = [
    new RegExp(`(${field}\\s*=\\s*)("[^"]*"|'[^']*'|\\d+)`, 'g'),
    new RegExp(`(${field}\\s+)("[^"]*"|'[^']*'|\\d+)`, 'g'),
  ];

  let replaced = false;
  let result = content;

  for (const pattern of patterns) {
    if (pattern.test(result)) {
      result = result.replace(pattern, `$1${formattedValue}`);
      replaced = true;
      break;
    }
  }

  if (!replaced) {
    const dcMatch = result.match(/defaultConfig\s*\{/);
    if (dcMatch && dcMatch.index !== undefined) {
      const insertPos = dcMatch.index + dcMatch[0].length;
      const insertion = `\n        ${field} ${formattedValue}`;
      result = result.slice(0, insertPos) + insertion + result.slice(insertPos);
    }
  }

  return result;
}

function updateStringsXml(content: string, name: string, value: string): string {
  const regex = new RegExp(`(<string\\s+name="${name}">)[^<]*(</string>)`);
  if (regex.test(content)) {
    return content.replace(regex, `$1${value}$2`);
  }
  const insertBefore = '</resources>';
  return content.replace(insertBefore, `    <string name="${name}">${value}</string>\n${insertBefore}`);
}

function ensureStringsFile(filePath: string, appName: string): void {
  const dir = path.dirname(filePath);
  fs.ensureDirSync(dir);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <string name="app_name">${appName}</string>\n</resources>\n`);
  } else {
    let content = fs.readFileSync(filePath, 'utf-8');
    content = updateStringsXml(content, 'app_name', appName);
    fs.writeFileSync(filePath, content);
  }
}

function updateColorXml(content: string, name: string, value: string): string {
  const regex = new RegExp(`(<color\\s+name="${name}">)[^<]*(</color>)`);
  if (regex.test(content)) {
    return content.replace(regex, `$1${value}$2`);
  }
  return content;
}

function replaceXmlText(content: string, currentText: string, newText: string): string {
  return content.split(currentText).join(newText);
}

/** Theme name: diversification → random (Theme.Axq), else → sanitized app label (Theme.Sena) */
function resolveThemeName(appLabel: string | undefined, diversifyEnabled: boolean): string {
  if (diversifyEnabled) {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const len = 3 + (crypto.randomInt(2)); // 3 or 4 chars
    let name = '';
    for (let i = 0; i < len; i++) name += chars[crypto.randomInt(chars.length)];
    return name.charAt(0).toUpperCase() + name.slice(1); // e.g. Axq, Klv
  }
  const label = (appLabel || 'App').trim();
  const sanitized = label.replace(/[^a-zA-Z0-9_]/g, '').replace(/^([a-z])/, (_, c) => c.toUpperCase());
  if (sanitized.length === 0 || !/^[a-zA-Z]/.test(sanitized)) return 'App';
  return sanitized;
}

function replaceThemePlaceholder(projectPath: string, themeName: string, logStream: fs.WriteStream): void {
  const appDir = path.join(projectPath, 'app');
  if (!fs.existsSync(appDir)) return;

  const replaceInFile = (filePath: string) => {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf-8');
    if (!content.includes('APP_THEME')) return;
    content = content.split('APP_THEME').join(themeName);
    fs.writeFileSync(filePath, content);
  };

  const stylesPath = path.join(appDir, 'src', 'main', 'res', 'values', 'styles.xml');
  const manifestPath = path.join(appDir, 'src', 'main', 'AndroidManifest.xml');
  replaceInFile(stylesPath);
  replaceInFile(manifestPath);
  log(logStream, `Theme placeholder replaced: APP_THEME → ${themeName} (Theme.${themeName})`);
}

function repackageSource(
  projectPath: string,
  oldPkg: string,
  newPkg: string,
  logStream: fs.WriteStream,
): void {
  log(logStream, `=== REPACKAGE: ${oldPkg} → ${newPkg} ===`);

  const oldPkgPath = oldPkg.replace(/\./g, '/');
  const newPkgPath = newPkg.replace(/\./g, '/');

  // 1) Replace all references in source files (.kt, .java, .xml, .gradle, .properties)
  const extensions = ['.kt', '.java', '.xml', '.gradle', '.properties'];

  function walkAndReplace(dir: string): number {
    let count = 0;
    if (!fs.existsSync(dir)) return count;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (['build', '.gradle', '.idea', 'node_modules'].includes(entry.name)) continue;
        count += walkAndReplace(fullPath);
      } else if (extensions.some(ext => entry.name.endsWith(ext))) {
        let content = fs.readFileSync(fullPath, 'utf-8');
        if (content.includes(oldPkg)) {
          content = content.split(oldPkg).join(newPkg);
          fs.writeFileSync(fullPath, content);
          count++;
        }
      }
    }
    return count;
  }

  const appDir = path.join(projectPath, 'app');
  const filesChanged = walkAndReplace(appDir);
  log(logStream, `  Replaced "${oldPkg}" in ${filesChanged} files`);

  // Also replace in root-level gradle files
  const rootGradleFiles = ['build.gradle', 'build.gradle.kts', 'settings.gradle', 'settings.gradle.kts'];
  for (const gf of rootGradleFiles) {
    const gfPath = path.join(projectPath, gf);
    if (fs.existsSync(gfPath)) {
      let content = fs.readFileSync(gfPath, 'utf-8');
      if (content.includes(oldPkg)) {
        content = content.split(oldPkg).join(newPkg);
        fs.writeFileSync(gfPath, content);
        log(logStream, `  Replaced in ${gf}`);
      }
    }
  }

  // 2) Move source folder structure
  const javaBase = path.join(projectPath, 'app', 'src', 'main', 'java');
  const oldSrcDir = path.join(javaBase, oldPkgPath);
  const newSrcDir = path.join(javaBase, newPkgPath);

  if (fs.existsSync(oldSrcDir) && oldSrcDir !== newSrcDir) {
    fs.ensureDirSync(newSrcDir);

    // Move all contents (files and subdirs) from old to new
    const items = fs.readdirSync(oldSrcDir, { withFileTypes: true });
    for (const item of items) {
      const oldItemPath = path.join(oldSrcDir, item.name);
      const newItemPath = path.join(newSrcDir, item.name);
      fs.moveSync(oldItemPath, newItemPath, { overwrite: true });
    }

    // Clean up empty old directories
    let dirToClean: string | null = oldSrcDir;
    while (dirToClean && dirToClean !== javaBase) {
      try {
        const remaining = fs.readdirSync(dirToClean);
        if (remaining.length === 0) {
          fs.rmdirSync(dirToClean);
          dirToClean = path.dirname(dirToClean);
        } else {
          break;
        }
      } catch {
        break;
      }
    }

    log(logStream, `  Moved source: ${oldPkgPath}/ → ${newPkgPath}/`);
  }

  // 3) Update namespace in build.gradle
  const gradleFile = path.join(projectPath, 'app', 'build.gradle');
  const gradleKtsFile = path.join(projectPath, 'app', 'build.gradle.kts');
  const activeGradle = fs.existsSync(gradleKtsFile) ? gradleKtsFile : gradleFile;
  if (fs.existsSync(activeGradle)) {
    let gc = fs.readFileSync(activeGradle, 'utf-8');
    gc = gc.replace(
      /namespace\s*["']([^"']+)["']/,
      `namespace "${newPkg}"`,
    );
    gc = gc.replace(
      /namespace\s+"([^"]+)"/,
      `namespace "${newPkg}"`,
    );
    fs.writeFileSync(activeGradle, gc);
    log(logStream, `  Updated namespace in build.gradle → ${newPkg}`);
  }

  log(logStream, `=== REPACKAGE: Complete ===`);
}

function applyPatchRule(
  projectPath: string,
  rule: { filePath: string; mode: string; find: string; replaceWith: string; expectedMatches?: number | string },
  logStream: fs.WriteStream,
): void {
  const fullPath = path.join(projectPath, rule.filePath);
  if (!fs.existsSync(fullPath)) {
    log(logStream, `WARN: Patch target not found: ${rule.filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf-8');
  let matchCount = 0;

  if (rule.mode === 'replace') {
    const parts = content.split(rule.find);
    matchCount = parts.length - 1;
    content = parts.join(rule.replaceWith);
  } else {
    const regex = new RegExp(rule.find, 'g');
    const matches = content.match(regex);
    matchCount = matches ? matches.length : 0;
    content = content.replace(regex, rule.replaceWith);
  }

  if (rule.expectedMatches !== undefined) {
    const expected = rule.expectedMatches;
    if (expected === '>=1' && matchCount < 1) {
      log(logStream, `WARN: Expected >=1 matches for ${rule.filePath}, got ${matchCount}`);
    } else if (typeof expected === 'number' && matchCount !== expected) {
      log(logStream, `WARN: Expected ${expected} matches for ${rule.filePath}, got ${matchCount}`);
    }
  }

  fs.writeFileSync(fullPath, content);
  log(logStream, `Patched ${rule.filePath}: ${matchCount} replacement(s)`);
}

export async function executeBuild(ctx: BuildContext): Promise<{
  success: boolean;
  outputs: { apkPath?: string; aabPath?: string; mappingPath?: string };
  logsPath: string;
  errorMessage?: string;
}> {
  const workspacesRoot = resolveFromRoot(process.env.WORKSPACES_ROOT || './builder/workspaces');
  const artifactsRoot = resolveFromRoot(process.env.ARTIFACTS_ROOT || './builder/artifacts');

  const workspaceDir = path.join(workspacesRoot, ctx.buildId);
  const projectPath = path.join(workspaceDir, 'android');
  const artifactDir = path.join(artifactsRoot, 'apps', ctx.applicationId, 'builds', ctx.buildId);
  const logsRelative = path.join('apps', ctx.applicationId, 'builds', ctx.buildId, 'build.log');
  const logsAbsolute = path.join(artifactsRoot, logsRelative);

  fs.ensureDirSync(artifactDir);
  const logStream = fs.createWriteStream(logsAbsolute, { flags: 'a' });

  try {
    // 1. Prepare workspace
    log(logStream, '=== STEP 1: Preparing workspace ===');
    if (fs.existsSync(workspaceDir)) {
      fs.removeSync(workspaceDir);
    }
    fs.ensureDirSync(workspaceDir);

    const templateAbsPath = resolveFromRoot(ctx.templatePath);
    log(logStream, `Copying template from ${templateAbsPath} to ${projectPath}`);
    await fs.copy(templateAbsPath, projectPath, {
      filter: (src: string) => {
        const basename = path.basename(src);
        return basename !== '.gradle' && basename !== 'build' && basename !== '.idea' && basename !== '.kotlin';
      },
    });
    log(logStream, 'Template copied successfully');

    // 1b. Full source package rename
    const sourcePackage = ctx.sourcePackage || 'chatonlive.com.aab';
    if (sourcePackage !== ctx.applicationId) {
      repackageSource(projectPath, sourcePackage, ctx.applicationId, logStream);
    }

    // 2. Apply parameters
    log(logStream, '=== STEP 2: Applying parameters ===');

    const gradleFile = path.join(projectPath, 'app', 'build.gradle');
    const gradleKtsFile = path.join(projectPath, 'app', 'build.gradle.kts');
    const activeGradleFile = fs.existsSync(gradleKtsFile) ? gradleKtsFile : gradleFile;

    if (!fs.existsSync(activeGradleFile)) {
      throw new Error(`Gradle file not found at ${activeGradleFile}`);
    }

    let gradleContent = fs.readFileSync(activeGradleFile, 'utf-8');

    // A) applicationId
    log(logStream, `Setting applicationId = ${ctx.applicationId}`);
    gradleContent = updateGradleField(gradleContent, 'applicationId', ctx.applicationId);

    // B) versionCode + versionName
    log(logStream, `Setting versionCode = ${ctx.versionCode}, versionName = ${ctx.versionName}`);
    gradleContent = updateGradleField(gradleContent, 'versionCode', ctx.versionCode);
    gradleContent = updateGradleField(gradleContent, 'versionName', ctx.versionName);

    fs.writeFileSync(activeGradleFile, gradleContent);
    log(logStream, 'Gradle file updated');

    // B2) Update package attribute in AndroidManifest.xml to new package
    const manifestPath = path.join(projectPath, 'app', 'src', 'main', 'AndroidManifest.xml');
    if (fs.existsSync(manifestPath)) {
      let manifestContent = fs.readFileSync(manifestPath, 'utf-8');
      manifestContent = manifestContent.replace(/package="[^"]*"/, `package="${ctx.applicationId}"`);
      fs.writeFileSync(manifestPath, manifestContent);
      log(logStream, `Updated AndroidManifest.xml package → ${ctx.applicationId}`);
    }

    // C) App names for EN/TR/ES
    const resBase = path.join(projectPath, 'app', 'src', 'main', 'res');

    log(logStream, `Setting app_name EN = ${ctx.appNameEN}`);
    ensureStringsFile(path.join(resBase, 'values', 'strings.xml'), ctx.appNameEN);

    log(logStream, `Setting app_name TR = ${ctx.appNameTR}`);
    ensureStringsFile(path.join(resBase, 'values-tr', 'strings.xml'), ctx.appNameTR);

    log(logStream, `Setting app_name ES = ${ctx.appNameES}`);
    ensureStringsFile(path.join(resBase, 'values-es', 'strings.xml'), ctx.appNameES);

    // D) Branding: logo, label, subtitle, colors
    log(logStream, '=== STEP 2b: Applying branding ===');

    // D1) Logo — replace drawable/app_logo.png AND all mipmap ic_launcher PNGs
    if (ctx.logoPath && fs.existsSync(ctx.logoPath)) {
      // 1a) drawable/app_logo.png (login screen + adaptive icon foreground)
      const drawableDir = path.join(resBase, 'drawable');
      fs.ensureDirSync(drawableDir);
      const targetLogo = path.join(drawableDir, 'app_logo.png');
      fs.copySync(ctx.logoPath, targetLogo, { overwrite: true });
      log(logStream, `Logo replaced: ${ctx.logoPath} → drawable/app_logo.png`);

      // 1b) mipmap-*/ic_launcher.png and ic_launcher_round.png
      // Guarantees the icon is visible on all Android versions and all launchers
      const mipmapDensities = ['mipmap-mdpi', 'mipmap-hdpi', 'mipmap-xhdpi', 'mipmap-xxhdpi', 'mipmap-xxxhdpi'];
      let mipmapCount = 0;
      for (const density of mipmapDensities) {
        const densityDir = path.join(resBase, density);
        fs.ensureDirSync(densityDir);
        fs.copySync(ctx.logoPath, path.join(densityDir, 'ic_launcher.png'), { overwrite: true });
        fs.copySync(ctx.logoPath, path.join(densityDir, 'ic_launcher_round.png'), { overwrite: true });
        mipmapCount++;
      }
      log(logStream, `Logo copied to ${mipmapCount} mipmap densities (ic_launcher.png + ic_launcher_round.png)`);

      // 1c) Update mipmap-anydpi-v26 adaptive icon to use PNG directly as foreground
      const anydpiDir = path.join(resBase, 'mipmap-anydpi-v26');
      fs.ensureDirSync(anydpiDir);
      const adaptiveLauncherXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@drawable/ic_launcher_foreground" />
</adaptive-icon>`;
      fs.writeFileSync(path.join(anydpiDir, 'ic_launcher.xml'), adaptiveLauncherXml);
      fs.writeFileSync(path.join(anydpiDir, 'ic_launcher_round.xml'), adaptiveLauncherXml);
      log(logStream, `Adaptive icon XML updated`);
    }

    // D2) Label & subtitle — replace across all layout XMLs
    const layoutDir = path.join(resBase, 'layout');
    if (fs.existsSync(layoutDir)) {
      const layoutFiles = fs.readdirSync(layoutDir).filter((f: string) => f.endsWith('.xml'));
      for (const lf of layoutFiles) {
        const lfPath = path.join(layoutDir, lf);
        let content = fs.readFileSync(lfPath, 'utf-8');
        let changed = false;

        if (ctx.appLabel && content.includes('Umingle')) {
          content = replaceXmlText(content, 'android:text="Umingle"', `android:text="${ctx.appLabel}"`);
          content = replaceXmlText(content, 'Explore Umingle', `Explore ${ctx.appLabel}`);
          content = replaceXmlText(content, 'Umingle Trends', `${ctx.appLabel} Trends`);
          content = replaceXmlText(content, 'Discover Umingle', `Discover ${ctx.appLabel}`);
          content = replaceXmlText(content, 'Umingle Plus', `${ctx.appLabel} Plus`);
          content = replaceXmlText(content, 'Umingle Pulse', `${ctx.appLabel} Pulse`);
          changed = true;
        }
        if (ctx.appSubtitle && content.includes('Connect. Chat. Spark.')) {
          content = replaceXmlText(content, 'Connect. Chat. Spark.', ctx.appSubtitle);
          changed = true;
        }

        if (changed) {
          fs.writeFileSync(lfPath, content);
          log(logStream, `Branding applied to layout/${lf}`);
        }
      }
      if (ctx.appLabel) log(logStream, `App label set to: ${ctx.appLabel}`);
      if (ctx.appSubtitle) log(logStream, `App subtitle set to: ${ctx.appSubtitle}`);
    }

    // D2b) Replace brand name in Kotlin/Java source (default documents, etc.)
    if (ctx.appLabel && ctx.appLabel !== 'Umingle') {
      const javaBase = path.join(projectPath, 'app', 'src', 'main', 'java');
      if (fs.existsSync(javaBase)) {
        const replaceInSrc = (dir: string): number => {
          let count = 0;
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            const fp = path.join(dir, entry.name);
            if (entry.isDirectory()) { count += replaceInSrc(fp); continue; }
            if (!entry.name.endsWith('.kt') && !entry.name.endsWith('.java')) continue;
            let src = fs.readFileSync(fp, 'utf-8');
            if (!src.includes('Umingle')) continue;
            src = src.split('UMINGLE').join(ctx.appLabel!.toUpperCase());
            src = src.split('Umingle').join(ctx.appLabel!);
            src = src.split('umingle').join(ctx.appLabel!.toLowerCase());
            fs.writeFileSync(fp, src);
            count++;
          }
          return count;
        };
        const srcCount = replaceInSrc(javaBase);
        if (srcCount > 0) log(logStream, `Brand name replaced in ${srcCount} source file(s)`);
      }
    }

    // D3) Colors — update colors.xml
    const colorsPath = path.join(resBase, 'values', 'colors.xml');
    if (fs.existsSync(colorsPath)) {
      let colorsContent = fs.readFileSync(colorsPath, 'utf-8');

      if (ctx.loginBgColorStart) {
        colorsContent = updateColorXml(colorsContent, 'brand_background_start', ctx.loginBgColorStart);
        log(logStream, `brand_background_start = ${ctx.loginBgColorStart}`);
      }
      if (ctx.loginBgColorEnd) {
        colorsContent = updateColorXml(colorsContent, 'brand_background_end', ctx.loginBgColorEnd);
        log(logStream, `brand_background_end = ${ctx.loginBgColorEnd}`);
      }
      if (ctx.brandPrimaryColor) {
        colorsContent = updateColorXml(colorsContent, 'brand_primary', ctx.brandPrimaryColor);
        log(logStream, `brand_primary = ${ctx.brandPrimaryColor}`);
      }

      fs.writeFileSync(colorsPath, colorsContent);
    }

    // D4) Theme name — replace APP_THEME placeholder (clone detection)
    const themeName = resolveThemeName(ctx.appLabel, !!ctx.diversify?.enabled);
    replaceThemePlaceholder(projectPath, themeName, logStream);

    // E) Apply template patch rules
    if (ctx.patchRules && ctx.patchRules.length > 0) {
      log(logStream, `Applying ${ctx.patchRules.length} patch rule(s)`);
      for (const rule of ctx.patchRules) {
        const interpolatedRule = {
          ...rule,
          replaceWith: rule.replaceWith
            .replace(/\$\{APP_ONESIGNAL_ID\}/g, ctx.onesignalAppId || '')
            .replace(/\$\{APP_NAME_TR\}/g, ctx.appNameTR)
            .replace(/\$\{APP_NAME_EN\}/g, ctx.appNameEN)
            .replace(/\$\{APP_NAME_ES\}/g, ctx.appNameES)
            .replace(/\$\{APP_VERSION\}/g, String(ctx.versionCode))
            .replace(/\$\{APP_VERSION_FORMATTED\}/g, ctx.versionName),
        };
        applyPatchRule(projectPath, interpolatedRule, logStream);
      }
    }

    // 2c. Diversification (uses applicationId since source is already repackaged)
    if (ctx.diversify?.enabled) {
      await applyDiversification(projectPath, ctx.applicationId, ctx.diversify, (msg) => log(logStream, msg));
    }

    // 3. Signing
    log(logStream, '=== STEP 3: Setting up signing ===');

    if (ctx.keystoreJksPath && ctx.storePassword && ctx.keyAlias && ctx.keyPassword) {
      const jksPath = path.isAbsolute(ctx.keystoreJksPath)
        ? ctx.keystoreJksPath
        : path.resolve(ROOT, ctx.keystoreJksPath);

      const keystorePropsPath = path.join(projectPath, 'app', 'keystore.properties');
      const keystoreProps = [
        `storeFile=${jksPath}`,
        `storePassword=${ctx.storePassword}`,
        `keyAlias=${ctx.keyAlias}`,
        `keyPassword=${ctx.keyPassword}`,
      ].join('\n');
      fs.writeFileSync(keystorePropsPath, keystoreProps);

      // Update build.gradle to read keystore.properties from project dir
      let gc = fs.readFileSync(activeGradleFile, 'utf-8');
      if (!gc.includes('keystore.properties') || gc.includes('../../keystore.properties')) {
        gc = gc.replace(
          /file\("[^"]*keystore\.properties"\)/g,
          'file("keystore.properties")',
        );
        fs.writeFileSync(activeGradleFile, gc);
      }

      log(logStream, 'Keystore configured for signed release build');
    } else {
      log(logStream, 'WARNING: No keystore configured. Build may produce unsigned output.');
      // Remove signing config to avoid build failure
      let gc = fs.readFileSync(activeGradleFile, 'utf-8');
      gc = gc.replace(/signingConfig\s+signingConfigs\.release/g, '// signingConfig signingConfigs.release');
      fs.writeFileSync(activeGradleFile, gc);
    }

    // 4. Build
    log(logStream, '=== STEP 4: Running Gradle build ===');

    const gradlewPath = path.join(projectPath, 'gradlew');
    if (fs.existsSync(gradlewPath)) {
      fs.chmodSync(gradlewPath, '755');
    }

    const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';

    // Clean
    log(logStream, 'Running: gradlew clean');
    let exitCode = await runCommand(gradlew, ['clean'], projectPath, logStream);
    if (exitCode !== 0) {
      throw new Error(`gradlew clean failed with exit code ${exitCode}`);
    }

    // Build-time gradle params
    const gradleParams: string[] = [];
    if (ctx.onesignalAppId) {
      gradleParams.push(`-PONESIGNAL_APP_ID=${ctx.onesignalAppId}`);
      log(logStream, `OneSignal App ID injected: ${ctx.onesignalAppId}`);
    }

    // assembleRelease
    log(logStream, 'Running: gradlew assembleRelease');
    exitCode = await runCommand(gradlew, ['assembleRelease', ...gradleParams], projectPath, logStream);
    if (exitCode !== 0) {
      throw new Error(`gradlew assembleRelease failed with exit code ${exitCode}`);
    }

    // bundleRelease
    log(logStream, 'Running: gradlew bundleRelease');
    exitCode = await runCommand(gradlew, ['bundleRelease', ...gradleParams], projectPath, logStream);
    if (exitCode !== 0) {
      throw new Error(`gradlew bundleRelease failed with exit code ${exitCode}`);
    }

    // 5. Collect artifacts
    log(logStream, '=== STEP 5: Collecting artifacts ===');

    const outputs: { apkPath?: string; aabPath?: string; mappingPath?: string } = {};

    // Find APK
    const apkDir = path.join(projectPath, 'app', 'build', 'outputs', 'apk', 'release');
    if (fs.existsSync(apkDir)) {
      const apkFiles = fs.readdirSync(apkDir).filter((f: string) => f.endsWith('.apk'));
      if (apkFiles.length > 0) {
        const apkSrc = path.join(apkDir, apkFiles[0]);
        const apkDst = path.join(artifactDir, `${ctx.applicationId}(v${ctx.versionName}).apk`);
        fs.copySync(apkSrc, apkDst);
        outputs.apkPath = path.relative(artifactsRoot, apkDst);
        log(logStream, `APK collected: ${outputs.apkPath}`);
      }
    }

    // Find AAB
    const aabDir = path.join(projectPath, 'app', 'build', 'outputs', 'bundle', 'release');
    if (fs.existsSync(aabDir)) {
      const aabFiles = fs.readdirSync(aabDir).filter((f: string) => f.endsWith('.aab'));
      if (aabFiles.length > 0) {
        const aabSrc = path.join(aabDir, aabFiles[0]);
        const aabDst = path.join(artifactDir, `${ctx.applicationId}(v${ctx.versionName}).aab`);
        fs.copySync(aabSrc, aabDst);
        outputs.aabPath = path.relative(artifactsRoot, aabDst);
        log(logStream, `AAB collected: ${outputs.aabPath}`);
      }
    }

    // Find mapping
    const mappingDir = path.join(projectPath, 'app', 'build', 'outputs', 'mapping', 'release');
    if (fs.existsSync(mappingDir)) {
      const mappingFile = path.join(mappingDir, 'mapping.txt');
      if (fs.existsSync(mappingFile)) {
        const mappingDst = path.join(artifactDir, 'mapping.txt');
        fs.copySync(mappingFile, mappingDst);
        outputs.mappingPath = path.relative(artifactsRoot, mappingDst);
        log(logStream, `Mapping collected: ${outputs.mappingPath}`);
      }
    }

    log(logStream, '=== BUILD COMPLETE ===');
    logStream.end();

    return { success: true, outputs, logsPath: logsRelative };
  } catch (err: any) {
    log(logStream, `=== BUILD FAILED: ${err.message} ===`);
    logStream.end();

    let errorMessage = err.message;
    try {
      const fullLog = fs.readFileSync(logsAbsolute, 'utf-8');
      const lines = fullLog.split('\n');
      const last50 = lines.slice(-50).join('\n');
      errorMessage = `${err.message}\n\n--- Last 50 lines ---\n${last50}`;
    } catch { /* ignore */ }

    return {
      success: false,
      outputs: {},
      logsPath: logsRelative,
      errorMessage,
    };
  }
}
