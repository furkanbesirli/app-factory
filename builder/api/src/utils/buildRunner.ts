import Docker from 'dockerode';
import fs from 'fs';

const DOCKER_SOCKET = '/var/run/docker.sock';
const WORKER_IMAGE = process.env.WORKER_IMAGE || 'builder-worker:latest';
const DOCKER_NETWORK = process.env.DOCKER_NETWORK || 'builder_default';
const COMPOSE_PROJECT = process.env.COMPOSE_PROJECT_NAME || 'builder';

let docker: Docker | null = null;
let dockerAvailable: boolean | null = null;

function getDocker(): Docker | null {
  if (dockerAvailable === false) return null;
  if (docker) return docker;

  if (!fs.existsSync(DOCKER_SOCKET)) {
    console.log('[BuildRunner] Docker socket not found — container-per-build disabled (local dev mode)');
    dockerAvailable = false;
    return null;
  }

  try {
    docker = new Docker({ socketPath: DOCKER_SOCKET });
    dockerAvailable = true;
    console.log('[BuildRunner] Docker socket detected — container-per-build enabled');
    return docker;
  } catch {
    dockerAvailable = false;
    console.log('[BuildRunner] Docker init failed — falling back to queue mode');
    return null;
  }
}

export function isContainerPerBuildEnabled(): boolean {
  return getDocker() !== null;
}

export async function spawnBuildContainer(buildId: string): Promise<{ containerId: string }> {
  const d = getDocker();
  if (!d) throw new Error('Docker not available');

  const containerName = `build-${buildId}`;

  const container = await d.createContainer({
    Image: WORKER_IMAGE,
    name: containerName,
    Env: [
      `BUILD_ID=${buildId}`,
      `MONGODB_URI=${process.env.MONGODB_URI || 'mongodb://mongo:27017/android_builder'}`,
      `NODE_ENV=production`,
      `WORKSPACES_ROOT=/data/workspaces`,
      `ARTIFACTS_ROOT=/data/artifacts`,
      `KEYS_ROOT=/data/keys`,
      `ASSETS_ROOT=/data/assets`,
    ],
    HostConfig: {
      Binds: [
        `${COMPOSE_PROJECT}_artifacts:/data/artifacts`,
        `${COMPOSE_PROJECT}_workspaces:/data/workspaces`,
        `${COMPOSE_PROJECT}_keys:/data/keys`,
        `${COMPOSE_PROJECT}_assets:/data/assets`,
      ],
      AutoRemove: true,
    },
    NetworkingConfig: {
      EndpointsConfig: {
        [DOCKER_NETWORK]: {},
      },
    },
  });

  await container.start();
  console.log(`[BuildRunner] Container ${containerName} started for build ${buildId}`);

  return { containerId: container.id };
}
