import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { App } from '@capacitor/app';
import { writable } from 'svelte/store';

/**
 * Build-time version injected from package.json via astro.config.mjs
 */
const initialBuildVersion = typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_APP_VERSION
  ? String(import.meta.env.PUBLIC_APP_VERSION).replace(/^v/i, '')
  : '1.0.0';

/**
 * Reactive Svelte store containing the active version string (e.g. "1.0.0").
 * Automatically updates when an OTA bundle is detected or applied.
 */
export const appVersion = writable(initialBuildVersion);

/**
 * Default OTA configuration
 * IMPORTANT: `DEFAULT_APP_NAME` must match the exact GitHub repository name (e.g. 'oboeru-mobile')
 * so the Cloudflare Worker can resolve `GET /:repo/version` and `GET /:repo/download`.
 */
export const DEFAULT_APP_NAME = 'mobile-dev-template';
export const DEFAULT_WORKER_URL = 'https://mobile-ota-updater.fede-eagle.workers.dev';

const subscribers = new Set();

let currentState = {
  status: 'idle',
  currentVersion: initialBuildVersion,
  availableVersion: null,
  downloadProgress: 0,
  error: null,
  updateReadyToApply: false
};

function updateState(partial) {
  currentState = { ...currentState, ...partial };
  subscribers.forEach((cb) => {
    try {
      cb(currentState);
    } catch (e) {
      console.error('[OTA] Error in state subscriber:', e);
    }
  });
}

export function subscribeOtaState(callback) {
  subscribers.add(callback);
  callback(currentState);
  return () => {
    subscribers.delete(callback);
  };
}

export function getOtaState() {
  return currentState;
}

/**
 * Confirms to Capgo that the application loaded successfully.
 * CRITICAL: Must be invoked during app initialization (e.g. Svelte onMount)
 * to prevent Capgo from rolling back to the previous bundle.
 */
export async function notifyAppReady() {
  if (!Capacitor.isNativePlatform()) {
    console.log('[OTA] Web environment detected: skipping notifyAppReady.');
    return;
  }

  try {
    await CapacitorUpdater.notifyAppReady();
    await getAppVersionInfo();
    console.log('[OTA] ✅ Capgo notifyAppReady() confirmed successfully. Rollback avoided.');
  } catch (error) {
    console.warn('[OTA] ⚠️ notifyAppReady failed or not in Capgo container:', error);
  }
}

/**
 * Resolves comprehensive version metadata (distinguishing Native 'builtin' vs OTA bundle vs Web)
 */
export async function getAppVersionInfo() {
  const buildVersion = (import.meta.env?.PUBLIC_APP_VERSION || '1.0.0').replace(/^v/i, '');

  if (!Capacitor.isNativePlatform()) {
    appVersion.set(buildVersion);
    return {
      version: buildVersion,
      isOta: false,
      channel: 'web',
      bundleId: null,
      formatted: `v${buildVersion} (Web)`
    };
  }

  let nativeVersion = buildVersion;
  try {
    const appInfo = await App.getInfo();
    if (appInfo?.version && appInfo.version !== '1.0') {
      nativeVersion = appInfo.version.replace(/^v/i, '');
    }
  } catch {
    // Keep buildVersion fallback
  }

  let resolvedInfo = null;

  try {
    const current = await CapacitorUpdater.current();
    const bundleId = current?.bundle?.id;
    const bundleVer = current?.bundle?.version;

    // In @capgo/capacitor-updater v8, the factory APK bundle reports id='builtin' and version='builtin'
    const isBuiltinBundle =
      !bundleId ||
      bundleId === 'builtin' ||
      bundleId === 'default' ||
      bundleVer === 'builtin';

    if (!isBuiltinBundle) {
      const cleanOtaVersion =
        bundleVer && bundleVer !== 'builtin'
          ? String(bundleVer).replace(/^v/i, '')
          : buildVersion;

      resolvedInfo = {
        version: cleanOtaVersion,
        isOta: true,
        channel: 'ota',
        bundleId,
        nativeVersion,
        formatted: `v${cleanOtaVersion} (OTA)`
      };
    }
  } catch {
    // Fallback if current() throws
  }

  if (!resolvedInfo) {
    resolvedInfo = {
      version: buildVersion,
      isOta: false,
      channel: 'native',
      bundleId: 'builtin',
      nativeVersion,
      formatted: `v${buildVersion} (Base)`
    };
  }

  appVersion.set(resolvedInfo.version);
  return resolvedInfo;
}

export async function refreshAppVersion() {
  const info = await getAppVersionInfo();
  return info.version;
}

export async function getCurrentAppVersion() {
  const info = await getAppVersionInfo();
  return info.version;
}

/**
 * Check for updates against the Cloudflare Worker endpoint (GET /:repo/version)
 */
export async function checkForOtaUpdates(config = {}) {
  const appName = config.appName || DEFAULT_APP_NAME;
  const workerBaseUrl = (config.workerBaseUrl || DEFAULT_WORKER_URL).replace(/\/$/, '');
  const autoReload = config.autoReload ?? false;
  const timeoutMs = config.timeoutMs ?? 15000;

  if (!Capacitor.isNativePlatform()) {
    const currentVersion = await getCurrentAppVersion();
    updateState({ status: 'up-to-date', currentVersion });
    return { updateAvailable: false };
  }

  try {
    updateState({ status: 'checking', error: null });
    const currentVersion = await getCurrentAppVersion();
    const currentClean = String(currentVersion).replace(/^v/i, '');
    updateState({ currentVersion: currentClean });

    const endpoint = `${workerBaseUrl}/${encodeURIComponent(appName)}/version`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(endpoint, {
      method: 'GET',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} en ${endpoint}`);
    }

    const data = await response.json();
    const rawVersion = data.version || data.latestVersion || '';
    const latestVersion = String(rawVersion).replace(/^v/i, '');
    const bundleUrl = data.downloadUrl || data.url || data.bundleUrl;

    if (!latestVersion || !bundleUrl || latestVersion === currentClean) {
      updateState({ status: 'up-to-date', availableVersion: latestVersion || currentClean });
      return { updateAvailable: false, version: currentClean };
    }

    updateState({
      status: 'downloading',
      availableVersion: latestVersion,
      downloadProgress: 0
    });

    const downloadOpts = {
      url: bundleUrl,
      version: latestVersion
    };
    if (data.checksum) {
      downloadOpts.checksum = data.checksum;
    }

    const bundle = await CapacitorUpdater.download(downloadOpts);
    await CapacitorUpdater.set(bundle);

    updateState({
      status: 'ready',
      availableVersion: latestVersion,
      updateReadyToApply: true,
      downloadProgress: 100
    });

    if (autoReload) {
      await reloadApp();
    }

    return {
      updateAvailable: true,
      version: latestVersion,
      bundleUrl
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[OTA] ❌ Check/Download failed:', errorMsg);
    updateState({
      status: 'error',
      error: errorMsg
    });
    return { updateAvailable: false };
  }
}

export async function reloadApp() {
  if (!Capacitor.isNativePlatform()) {
    window.location.reload();
    return;
  }

  try {
    await CapacitorUpdater.reload();
  } catch {
    window.location.reload();
  }
}

export async function resetToNativeBundle() {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    await CapacitorUpdater.reset();
    await reloadApp();
  } catch (error) {
    console.error('[OTA] Reset bundle failed:', error);
  }
}
