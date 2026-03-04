import path from 'path';
import fs from 'fs-extra';
import crypto from 'crypto';

export interface DiversifyOptions {
  enabled: boolean;
  classCount?: number;       // random Kotlin class sayısı (default 8)
  resourceNoise?: boolean;   // dimens/colors/strings random entry (default true)
  dummyAssets?: boolean;     // random binary asset dosyaları (default true)
  dummyAssetSizeMb?: number; // toplam dummy asset boyutu MB (default 2)
  layoutNoise?: boolean;     // layout'lara random dummy view (default true)
  obfuscationDict?: boolean; // R8 random dictionary (default true)
  proguardEnabled?: boolean; // R8/Proguard etkinleştir (default true)
}

const DEFAULT_OPTIONS: Required<DiversifyOptions> = {
  enabled: true,
  classCount: 8,
  resourceNoise: true,
  dummyAssets: true,
  dummyAssetSizeMb: 2,
  layoutNoise: true,
  obfuscationDict: true,
  proguardEnabled: true,
};

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randHex(len: number): string {
  return crypto.randomBytes(len).toString('hex').slice(0, len);
}

function randId(): string {
  const prefixes = ['Sys', 'App', 'Core', 'Data', 'Net', 'Util', 'Cfg', 'Auth', 'Cache', 'Sync', 'Task', 'Event', 'Log', 'State', 'Flow', 'Hub'];
  const suffixes = ['Manager', 'Handler', 'Provider', 'Helper', 'Service', 'Engine', 'Module', 'Bridge', 'Worker', 'Factory', 'Resolver', 'Adapter', 'Observer', 'Guard', 'Filter', 'Tracker'];
  return prefixes[rand(0, prefixes.length - 1)] + suffixes[rand(0, suffixes.length - 1)] + '_' + randHex(4);
}

function randMethodName(): string {
  const verbs = ['compute', 'resolve', 'validate', 'process', 'handle', 'check', 'fetch', 'prepare', 'configure', 'dispatch', 'transform', 'evaluate', 'execute', 'aggregate', 'normalize', 'serialize'];
  const nouns = ['State', 'Config', 'Payload', 'Session', 'Token', 'Buffer', 'Cache', 'Queue', 'Metric', 'Index', 'Context', 'Frame', 'Signal', 'Batch', 'Registry', 'Checkpoint'];
  return verbs[rand(0, verbs.length - 1)] + nouns[rand(0, nouns.length - 1)] + rand(10, 99);
}

function randColor(): string {
  return '#' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

function randDp(): string {
  return rand(1, 400) + 'dp';
}

function generateRandomWords(count: number): string[] {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const words: string[] = [];
  for (let i = 0; i < count; i++) {
    const len = rand(4, 12);
    let w = '';
    for (let j = 0; j < len; j++) w += chars[rand(0, chars.length - 1)];
    words.push(w);
  }
  return words;
}

// 1) Random Kotlin class injection
function generateKotlinClass(packageName: string): { name: string; code: string } {
  const className = randId();
  const methodCount = rand(3, 8);
  let methods = '';

  for (let i = 0; i < methodCount; i++) {
    const mName = randMethodName();
    const returnType = ['Int', 'Long', 'String', 'Boolean', 'Double'][rand(0, 4)];
    const seed = rand(1, 99999);

    switch (returnType) {
      case 'Int':
        methods += `    fun ${mName}(seed: Int = ${seed}): Int {\n        val v = (seed * ${rand(7, 97)} + ${rand(100, 9999)}) % ${rand(1000, 99999)}\n        return if (v > ${rand(100, 50000)}) v else v + ${rand(1, 999)}\n    }\n\n`;
        break;
      case 'Long':
        methods += `    fun ${mName}(): Long {\n        return System.nanoTime() xor ${rand(100000, 999999)}L\n    }\n\n`;
        break;
      case 'String':
        methods += `    fun ${mName}(): String {\n        val parts = listOf("${randHex(6)}", "${randHex(8)}", "${randHex(4)}")\n        return parts.joinToString("-") { it.reversed() }\n    }\n\n`;
        break;
      case 'Boolean':
        methods += `    fun ${mName}(input: Int = ${seed}): Boolean {\n        return (input * ${rand(3, 31)}) % ${rand(2, 17)} ${rand(0, 1) === 0 ? '==' : '!='} 0\n    }\n\n`;
        break;
      case 'Double':
        methods += `    fun ${mName}(): Double {\n        return kotlin.math.sin(${rand(1, 360)}.toDouble()) * ${rand(10, 9999)}\n    }\n\n`;
        break;
    }
  }

  const companionVal = `        const val TAG = "${className}"\n        const val VERSION = ${rand(1, 999)}\n        const val HASH = "${randHex(16)}"`;

  const code = `package ${packageName}.internal.generated

import kotlin.math.abs

@Suppress("unused")
internal class ${className} {
    private val instanceId = "${randHex(8)}"
    private var counter = ${rand(0, 999)}

${methods}    fun getInstanceSignature(): String {
        return "$instanceId-\${counter++}-\${System.currentTimeMillis() % ${rand(10000, 99999)}}"
    }

    companion object {
${companionVal}
    }
}
`;

  return { name: className, code };
}

// 2) R8 obfuscation dictionary
function generateObfuscationDictionary(wordCount: number): string {
  const words = generateRandomWords(wordCount);
  return words.join('\n') + '\n';
}

// 3) Random resource entries
function generateDimenEntries(count: number): string {
  let entries = '';
  for (let i = 0; i < count; i++) {
    entries += `    <dimen name="internal_spacing_${randHex(4)}">${randDp()}</dimen>\n`;
  }
  return entries;
}

function generateColorEntries(count: number): string {
  let entries = '';
  for (let i = 0; i < count; i++) {
    entries += `    <color name="gen_color_${randHex(4)}">${randColor()}</color>\n`;
  }
  return entries;
}

function generateStringEntries(count: number): string {
  let entries = '';
  for (let i = 0; i < count; i++) {
    const words = generateRandomWords(rand(2, 5));
    entries += `    <string name="gen_str_${randHex(4)}" translatable="false">${words.join(' ')}</string>\n`;
  }
  return entries;
}

// 4) Dummy invisible layout view
function generateDummyView(): string {
  const id = `gen_view_${randHex(6)}`;
  return `    <View android:id="@+id/${id}" android:layout_width="0dp" android:layout_height="0dp" android:visibility="gone" android:alpha="0" android:tag="${randHex(8)}" />`;
}

// 5) Binary dummy assets
function generateDummyAsset(sizeBytes: number): Buffer {
  return crypto.randomBytes(sizeBytes);
}

// MAIN APPLY FUNCTION
export async function applyDiversification(
  projectPath: string,
  sourcePackage: string,
  options: DiversifyOptions,
  logFn: (msg: string) => void,
): Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  if (!opts.enabled) {
    logFn('Diversification disabled, skipping');
    return;
  }

  logFn('=== DIVERSIFICATION: Starting ===');
  const resBase = path.join(projectPath, 'app', 'src', 'main', 'res');
  const javaBase = path.join(projectPath, 'app', 'src', 'main', 'java');
  const packageDir = sourcePackage.replace(/\./g, '/');

  // --- 1) Kotlin class injection ---
  logFn(`Injecting ${opts.classCount} random Kotlin classes`);
  const generatedDir = path.join(javaBase, packageDir, 'internal', 'generated');
  fs.ensureDirSync(generatedDir);

  const classNames: string[] = [];
  for (let i = 0; i < opts.classCount; i++) {
    const cls = generateKotlinClass(sourcePackage);
    const filePath = path.join(generatedDir, `${cls.name}.kt`);
    fs.writeFileSync(filePath, cls.code);
    classNames.push(cls.name);
  }
  logFn(`  Created classes: ${classNames.join(', ')}`);

  // Registry class that references all generated classes
  const registryCode = `package ${sourcePackage}.internal.generated

@Suppress("unused")
internal object GeneratedRegistry_${randHex(4)} {
    val modules = listOf(
${classNames.map(c => `        ${c}::class.java.name`).join(',\n')}
    )
    val buildHash = "${randHex(32)}"
    val buildSeed = ${rand(100000, 999999)}L
}
`;
  fs.writeFileSync(path.join(generatedDir, `GeneratedRegistry_${randHex(4)}.kt`), registryCode);

  // --- 2) Resource noise ---
  if (opts.resourceNoise) {
    logFn('Injecting random resource entries');

    // dimens.xml
    const dimensPath = path.join(resBase, 'values', 'dimens.xml');
    if (fs.existsSync(dimensPath)) {
      let content = fs.readFileSync(dimensPath, 'utf-8');
      const entries = generateDimenEntries(rand(10, 20));
      content = content.replace('</resources>', entries + '</resources>');
      fs.writeFileSync(dimensPath, content);
    }

    // colors.xml
    const colorsPath = path.join(resBase, 'values', 'colors.xml');
    if (fs.existsSync(colorsPath)) {
      let content = fs.readFileSync(colorsPath, 'utf-8');
      const entries = generateColorEntries(rand(8, 16));
      content = content.replace('</resources>', entries + '</resources>');
      fs.writeFileSync(colorsPath, content);
    }

    // strings.xml
    const stringsPath = path.join(resBase, 'values', 'strings.xml');
    if (fs.existsSync(stringsPath)) {
      let content = fs.readFileSync(stringsPath, 'utf-8');
      const entries = generateStringEntries(rand(8, 16));
      content = content.replace('</resources>', entries + '</resources>');
      fs.writeFileSync(stringsPath, content);
    }

    logFn('  Resource entries injected');
  }

  // --- 3) Layout noise ---
  if (opts.layoutNoise) {
    logFn('Injecting dummy views into layouts');
    const layoutDir = path.join(resBase, 'layout');
    if (fs.existsSync(layoutDir)) {
      const xmlFiles = fs.readdirSync(layoutDir).filter((f: string) => f.endsWith('.xml'));
      for (const xmlFile of xmlFiles) {
        const xmlPath = path.join(layoutDir, xmlFile);
        let content = fs.readFileSync(xmlPath, 'utf-8');

        const viewCount = rand(1, 3);
        const dummyViews = Array.from({ length: viewCount }, () => generateDummyView()).join('\n');

        // Insert before closing root tag
        const lastClosingTag = content.lastIndexOf('</');
        if (lastClosingTag > 0) {
          content = content.slice(0, lastClosingTag) + '\n' + dummyViews + '\n' + content.slice(lastClosingTag);
          fs.writeFileSync(xmlPath, content);
        }
      }
      logFn(`  Dummy views added to ${xmlFiles.length} layouts`);
    }
  }

  // --- 4) Dummy assets (MB variation) ---
  let dummyAssetNames: string[] = [];
  if (opts.dummyAssets && opts.dummyAssetSizeMb > 0) {
    logFn(`Generating ${opts.dummyAssetSizeMb}MB dummy assets`);
    const assetsDir = path.join(projectPath, 'app', 'src', 'main', 'assets');
    fs.ensureDirSync(assetsDir);

    const totalBytes = opts.dummyAssetSizeMb * 1024 * 1024;
    const fileCount = rand(3, 8);
    const perFile = Math.floor(totalBytes / fileCount);

    for (let i = 0; i < fileCount; i++) {
      const size = perFile + rand(-Math.floor(perFile * 0.3), Math.floor(perFile * 0.3));
      const ext = ['dat', 'bin', 'db', 'cache', 'idx'][rand(0, 4)];
      const fileName = `data_${randHex(6)}.${ext}`;
      dummyAssetNames.push(fileName);
      fs.writeFileSync(path.join(assetsDir, fileName), generateDummyAsset(Math.max(1024, size)));
    }

    // ContentProvider - shrinkResources asset'leri silmesin diye referans ediyoruz
    const providerName = `AssetRefHolder_${randHex(4)}`;
    const assetLoaderCode = `package ${sourcePackage}.internal.generated

import android.content.ContentProvider
import android.content.ContentValues
import android.database.Cursor
import android.net.Uri

@Suppress("unused")
internal class ${providerName} : ContentProvider() {
    override fun onCreate(): Boolean {
        context?.assets?.let { assets ->
            try {
                val names = listOf(${dummyAssetNames.map(n => `"${n}"`).join(', ')})
                names.forEach { name -> assets.open(name).use { it.read() } }
            } catch (_: Exception) { }
        }
        return true
    }
    override fun query(uri: Uri, p1: Array<out String>?, p2: String?, p3: Array<out String>?, p4: String?) = null
    override fun getType(uri: Uri) = null
    override fun insert(uri: Uri, values: ContentValues?) = null
    override fun delete(uri: Uri, selection: String?, selectionArgs: Array<out String>?) = 0
    override fun update(uri: Uri, values: ContentValues?, selection: String?, selectionArgs: Array<out String>?) = 0
}
`;
    fs.writeFileSync(path.join(generatedDir, `${providerName}.kt`), assetLoaderCode);

    // AndroidManifest'e provider ekle
    const manifestPath = path.join(projectPath, 'app', 'src', 'main', 'AndroidManifest.xml');
    if (fs.existsSync(manifestPath)) {
      let manifest = fs.readFileSync(manifestPath, 'utf-8');
      const providerEntry = `\n      <provider android:name="${sourcePackage}.internal.generated.${providerName}" android:authorities="${sourcePackage}.assetref.${randHex(8)}" android:exported="false" />`;
      manifest = manifest.replace('</application>', providerEntry + '\n    </application>');
      fs.writeFileSync(manifestPath, manifest);
    }

    logFn(`  Created ${fileCount} dummy asset files (~${opts.dummyAssetSizeMb}MB total) + AssetRefHolder to prevent stripping`);
  }

  // --- 5) R8/Proguard obfuscation dictionary ---
  const gradleFile = path.join(projectPath, 'app', 'build.gradle');
  const gradleKtsFile = path.join(projectPath, 'app', 'build.gradle.kts');
  const activeGradle = fs.existsSync(gradleKtsFile) ? gradleKtsFile : gradleFile;

  if (opts.obfuscationDict) {
    logFn('Generating random obfuscation dictionary');
    const dictPath = path.join(projectPath, 'app', 'obfuscation-dict.txt');
    fs.writeFileSync(dictPath, generateObfuscationDictionary(500));

    const classDictPath = path.join(projectPath, 'app', 'class-dict.txt');
    fs.writeFileSync(classDictPath, generateObfuscationDictionary(500));

    const proguardPath = path.join(projectPath, 'app', 'proguard-rules.pro');
    let proguardContent = fs.existsSync(proguardPath) ? fs.readFileSync(proguardPath, 'utf-8') : '';

    const dictRules = `
# --- Auto-generated diversification rules ---
-obfuscationdictionary obfuscation-dict.txt
-classobfuscationdictionary class-dict.txt
-packageobfuscationdictionary obfuscation-dict.txt
`;

    if (!proguardContent.includes('-obfuscationdictionary')) {
      proguardContent += dictRules;
      fs.writeFileSync(proguardPath, proguardContent);
    }
    logFn('  Obfuscation dictionaries configured');
  }

  // --- 6) Enable R8/Proguard minification ---
  if (opts.proguardEnabled && fs.existsSync(activeGradle)) {
    logFn('Enabling R8/Proguard minification');
    let gc = fs.readFileSync(activeGradle, 'utf-8');

    gc = gc.replace(
      /def enableProguardInReleaseBuilds\s*=\s*false/,
      'def enableProguardInReleaseBuilds = true',
    );

    // Also enable shrinkResources if minify is on
    if (!gc.includes('shrinkResources')) {
      gc = gc.replace(
        /(minifyEnabled\s+enableProguardInReleaseBuilds)/,
        '$1\n            shrinkResources enableProguardInReleaseBuilds',
      );
    }

    fs.writeFileSync(activeGradle, gc);
    logFn('  R8 minification + resource shrinking enabled');
  }

  logFn('=== DIVERSIFICATION: Complete ===');
}
