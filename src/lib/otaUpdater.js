import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { App } from '@capacitor/app';
import { writable } from 'svelte/store';

/**
 * Build-time version fallback
 */
const initialBuildVersion = typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_APP_VERSION
  ? import.meta.env.PUBLIC_APP_VERSION
  : '1.0.0';

/**
 * Reactive Svelte store containing the active version string (e.g. "1.0.0").
 * Automatically updates when an OTA bundle is detected or applied.
 * Compatible with Svelte auto-subscriptions ($appVersion).
 */
export const appVersion = writable(initialBuildVersion);

/**
 * @typedef {Object} OtaConfig
 * @property {string} appName - Unique app identifier registered in the Cloudflare Worker
 * @property {string} [workerBaseUrl] - URL of the Cloudflare Worker
 * @property {boolean} [autoReload] - Whether to reload immediately when a new update is downloaded
 * @property {number} [timeoutMs] - Request timeout in milliseconds
 */

/**
 * Default OTA configuration
 * Replace `DEFAULT_APP_NAME` or pass custom config in `initOta()`
 */
export const DEFAULT_APP_NAME = 'mobile-dev-template';
export const DEFAULT_WORKER_URL = 'https://mobile-ota-updater.fede-eagle.workers.dev';

/**
 * Global OTA state subscriber for UI feedback (Svelte 5 runes / reactive stores)
 * @type {Set<(state: OtaState) => void>}
 */
const subscribers = new Set();

/**
 * @typedef {Object} OtaState
 * @property {'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error' | 'up-to-date'} status
 * @property {string | null} currentVersion
 * @property {string | null} availableVersion
 * @property {number} downloadProgress
 * @property {string | null} error
 * @property {boolean} updateReadyToApply
 */

/** @type {OtaState} */
let currentState = {
  status: 'idle',
  currentVersion: null,
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

/**
 * Subscribe to OTA status changes
 * @param {(state: OtaState) => void} callback
 * @returns {() => void} Unsubscribe function
 */
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
    console.log('[OTA] ✅ Capgo notifyAppReady() confirmed successfully. Rollback avoided.');
  } catch (error) {
    console.warn('[OTA] ⚠️ notifyAppReady failed or not in Capgo container:', error);
  }
}

/**
 * Resolves comprehensive version metadata (distinguishing Native vs OTA bundle vs Web)
 * @returns {Promise<{
 *   version: string,
 *   isOta: boolean,
 *   channel: 'ota' | 'native' | 'web',
 *   bundleId: string | null,
 *   nativeVersion?: string,
 *   formatted: string
 * }>}
 */
export async function getAppVersionInfo() {
  const buildVersion = import.meta.env?.PUBLIC_APP_VERSION || '1.0.0';

  if (!Capacitor.isNativePlatform()) {
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
    if (appInfo && appInfo.version) {
      nativeVersion = appInfo.version;
    }
  } catch {
    // Keep buildVersion fallback
  }

  let resolvedInfo;

  try {
    const current = await CapacitorUpdater.current();
    if (current && current.bundle && current.bundle.id && current.bundle.id !== 'default') {
      resolvedInfo = {
        version: current.bundle.id,
        isOta: true,
        channel: 'ota',
        bundleId: current.bundle.id,
        nativeVersion,
        formatted: `v${current.bundle.id} (OTA)`
      };
    }
  } catch {
    // Fallback if current() throws
  }

  if (!resolvedInfo) {
    resolvedInfo = {
      version: nativeVersion,
      isOta: false,
      channel: 'native',
      bundleId: 'default',
      nativeVersion,
      formatted: `v${nativeVersion} (Base)`
    };
  }

  // Synchronize reactive Svelte store
  appVersion.set(resolvedInfo.version);
  return resolvedInfo;
}

/**
 * Manually forces a refresh of appVersion store
 * @returns {Promise<string>}
 */
export async function refreshAppVersion() {
  const info = await getAppVersionInfo();
  return info.version;
}

/**
 * Resolves current running app version string
 * @returns {Promise<string>}
 */
export async function getCurrentAppVersion() {
  const info = await getAppVersionInfo();
  return info.version;
}

/**
 * Check for updates against the Cloudflare Worker endpoint
 * 
 * @param {OtaConfig} [config]
 * @returns {Promise<{ updateAvailable: boolean, version?: string, bundleUrl?: string }>}
 */
export async function checkForOtaUpdates(config = {}) {
  const appName = config.appName || DEFAULT_APP_NAME;
  const workerBaseUrl = (config.workerBaseUrl || DEFAULT_WORKER_URL).replace(/\/$/, '');
  const autoReload = config.autoReload ?? false;
  const timeoutMs = config.timeoutMs ?? 15000;

  if (!Capacitor.isNativePlatform()) {
    console.log(`[OTA] Web preview mode. Simulating OTA check for app "${appName}"...`);
    updateState({ status: 'up-to-date', currentVersion: '1.0.0-web' });
    return { updateAvailable: false };
  }

  try {
    updateState({ status: 'checking', error: null });
    const currentVersion = await getCurrentAppVersion();
    updateState({ currentVersion });

    console.log(`[OTA] Checking updates for "${appName}" (current: v${currentVersion})...`);

    // Multi-tenant query: Worker receives app query param
    const endpoint = `${workerBaseUrl}?app=${encodeURIComponent(appName)}&version=${encodeURIComponent(currentVersion)}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Worker responded with HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[OTA] Worker response:', data);

    // Expected worker format:
    // { updateAvailable: true, version: '1.0.1', url: 'https://.../dist.zip', checksum: '...' }
    // Or Capgo compatible direct format { version: '1.0.1', url: '...' }
    const latestVersion = data.version || data.latestVersion;
    const bundleUrl = data.url || data.bundleUrl;

    if (!latestVersion || !bundleUrl || latestVersion === currentVersion) {
      console.log(`[OTA] App is up to date (v${currentVersion}).`);
      updateState({ status: 'up-to-date', availableVersion: currentVersion });
      return { updateAvailable: false, version: currentVersion };
    }

    console.log(`[OTA] 🚀 New update found: v${latestVersion}. Starting download...`);
    updateState({
      status: 'downloading',
      availableVersion: latestVersion,
      downloadProgress: 0
    });

    // Download bundle via Capgo CapacitorUpdater
    const bundle = await CapacitorUpdater.download({
      url: bundleUrl,
      version: latestVersion,
      checksum: data.checksum
    });

    console.log(`[OTA] Download completed for v${latestVersion}. Setting active bundle...`, bundle);

    // Set bundle as active
    await CapacitorUpdater.set({ id: bundle.id || latestVersion });

    updateState({
      status: 'ready',
      availableVersion: latestVersion,
      updateReadyToApply: true,
      downloadProgress: 100
    });

    if (autoReload) {
      console.log('[OTA] AutoReload enabled. Reloading app now...');
      await reloadApp();
    } else {
      console.log('[OTA] Update staged. It will take effect on next launch or when reloadApp() is called.');
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

/**
 * Immediately reloads the application to activate the staged bundle
 */
export async function reloadApp() {
  if (!Capacitor.isNativePlatform()) {
    window.location.reload();
    return;
  }

  try {
    await CapacitorUpdater.reload();
  } catch (error) {
    console.warn('[OTA] Capgo reload() failed, falling back to window.location.reload():', error);
    window.location.reload();
  }
}

/**
 * Resets application back to the factory native binary bundle
 */
export async function resetToNativeBundle() {
  if (!Capacitor.isNativePlatform()) {
    console.log('[OTA] Web platform: Reset simulation.');
    return;
  }

  try {
    await CapacitorUpdater.reset();
    await reloadApp();
  } catch (error) {
    console.error('[OTA] Reset bundle failed:', error);
  }
}
