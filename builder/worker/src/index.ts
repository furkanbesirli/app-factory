import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import mongoose from 'mongoose';
import { Build, App, Template } from './models';
import { executeBuild } from './pipeline';
import { hasKeystore, getKeyJksPath, readKeystoreProps } from './keystorePaths';
import { hasLogo, getLogoPath } from './assetPaths';

const POLL_INTERVAL = 10_000;

async function claimBuild() {
  return Build.findOneAndUpdate(
    { status: 'queued' },
    { $set: { status: 'running', startedAt: new Date() } },
    { sort: { requestedAt: 1 }, new: true },
  );
}

async function claimBuildById(buildId: string) {
  return Build.findOneAndUpdate(
    { _id: buildId, status: 'queued' },
    { $set: { status: 'running', startedAt: new Date() } },
    { new: true },
  );
}

async function processBuild(build: any) {
  const app = await App.findById(build.appId);
  if (!app) {
    await Build.findByIdAndUpdate(build._id, {
      status: 'failed',
      finishedAt: new Date(),
      errorMessage: 'App not found',
    });
    return;
  }

  const template = await Template.findById(build.templateId);
  if (!template) {
    await Build.findByIdAndUpdate(build._id, {
      status: 'failed',
      finishedAt: new Date(),
      errorMessage: 'Template not found',
    });
    return;
  }

  const params = build.paramsSnapshot || {};
  const keystoreProps = hasKeystore(app.applicationId) ? readKeystoreProps(app.applicationId) : null;
  const keystoreJksPath = hasKeystore(app.applicationId) ? getKeyJksPath(app.applicationId) : undefined;

  console.log(`\n========================================`);
  console.log(`Building: ${app.displayName} v${build.versionName} (${build.versionCode})`);
  console.log(`ApplicationId: ${app.applicationId}`);
  console.log(`========================================\n`);

  const result = await executeBuild({
    buildId: build._id.toString(),
    templatePath: template.localPath,
    applicationId: app.applicationId,
    versionCode: build.versionCode,
    versionName: build.versionName,
    appNameTR: params.appNameTR || app.displayName,
    appNameEN: params.appNameEN || app.displayName,
    appNameES: params.appNameES || app.displayName,
    onesignalAppId: params.onesignalAppId || app.onesignalAppId,
    keystoreJksPath: keystoreJksPath,
    storePassword: keystoreProps?.storePassword,
    keyAlias: keystoreProps?.keyAlias,
    keyPassword: keystoreProps?.keyPassword,
    appLabel: params.appLabel as string || app.displayName,
    appSubtitle: params.appSubtitle as string || '',
    loginBgColorStart: params.loginBgColorStart as string || '#4C1D95',
    loginBgColorEnd: params.loginBgColorEnd as string || '#1E1B4B',
    brandPrimaryColor: params.brandPrimaryColor as string || '#7C3AED',
    logoPath: hasLogo(app.applicationId) ? getLogoPath(app.applicationId) : undefined,
    sourcePackage: 'chatonlive.com.aab',
    diversify: params.diversify as any || {
      enabled: true,
      classCount: 8,
      resourceNoise: true,
      dummyAssets: true,
      dummyAssetSizeMb: 2,
      layoutNoise: true,
      obfuscationDict: true,
      proguardEnabled: true,
    },
    patchRules: template.patchRules || [],
  });

  await Build.findOneAndUpdate(
    { _id: build._id, status: 'running' },
    {
      status: result.success ? 'success' : 'failed',
      finishedAt: new Date(),
      logsPath: result.logsPath,
      outputs: result.outputs,
      errorMessage: result.errorMessage,
    },
  );

  console.log(`Build ${build._id} ${result.success ? 'SUCCESS' : 'FAILED'}`);
}

async function runSingleBuild(buildId: string) {
  const build = await claimBuildById(buildId);
  if (!build) {
    console.error(`Build ${buildId} not found or not in queued state`);
    process.exit(1);
  }
  await processBuild(build);
}

async function pollLoop() {
  while (true) {
    try {
      const build = await claimBuild();
      if (build) {
        await processBuild(build);
      }
    } catch (err: any) {
      console.error('Worker error:', err.message);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
  }
}

async function main() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/android_builder';
  const singleBuildId = process.env.BUILD_ID;

  console.log(`Worker connecting to MongoDB: ${mongoUri}`);
  await mongoose.connect(mongoUri);
  console.log('Worker connected to MongoDB');

  if (singleBuildId) {
    console.log(`Single-shot mode: processing build ${singleBuildId}`);
    await runSingleBuild(singleBuildId);
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log('Poll mode: watching for queued builds...');
  await pollLoop();
}

main().catch((err) => {
  console.error('Worker fatal error:', err);
  process.exit(1);
});
