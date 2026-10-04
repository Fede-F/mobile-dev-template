<script>
  import { onMount } from 'svelte';
  import {
    appVersion,
    getAppVersionInfo,
    subscribeOtaState,
    checkForOtaUpdates,
    reloadApp
  } from '../lib/otaUpdater.js';
  import {
    hapticImpactLight,
    hapticImpactMedium,
    hapticSuccess
  } from '../lib/haptics.js';

  /**
   * @typedef {Object} Props
   * @property {'minimal' | 'chip' | 'footer'} [variant] - Visual appearance
   * @property {string} [class] - Additional CSS classes
   */
  let { variant = 'minimal', class: customClass = '' } = $props();

  let versionInfo = $state({
    version: '...',
    isOta: false,
    channel: 'native',
    bundleId: null,
    nativeVersion: '...',
    formatted: '...'
  });

  let otaState = $state({
    status: 'idle',
    currentVersion: null,
    availableVersion: null,
    updateReadyToApply: false
  });

  let showDetailsModal = $state(false);
  let isChecking = $state(false);

  onMount(async () => {
    versionInfo = await getAppVersionInfo();
    const unsubscribe = subscribeOtaState((state) => {
      otaState = state;
    });

    return () => {
      unsubscribe();
    };
  });

  async function openDetails() {
    await hapticImpactLight();
    // Refresh version info dynamically
    versionInfo = await getAppVersionInfo();
    showDetailsModal = true;
  }

  async function handleCheckUpdate() {
    await hapticImpactMedium();
    isChecking = true;
    try {
      await checkForOtaUpdates();
      if (otaState.status === 'up-to-date') {
        await hapticSuccess();
      }
    } finally {
      isChecking = false;
    }
  }

  async function handleApply() {
    await hapticSuccess();
    await reloadApp();
  }
</script>

<!-- Render Variants -->
{#if variant === 'chip'}
  <!-- Subtle Header/Toolbar Chip -->
  <button
    type="button"
    onclick={openDetails}
    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-900/80 border border-slate-700/60 text-slate-300 active-press hover:border-cyan-500/40 transition-colors {customClass}"
  >
    {#if otaState.updateReadyToApply}
      <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
    {:else if versionInfo.isOta}
      <span class="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
    {:else}
      <span class="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
    {/if}
    <span class="font-mono">v{$appVersion}{versionInfo.isOta ? ' (OTA)' : ''}</span>
  </button>

{:else if variant === 'footer'}
  <!-- Non-invasive Footer Link -->
  <footer class="w-full py-4 text-center select-none {customClass}">
    <button
      type="button"
      onclick={openDetails}
      class="inline-flex items-center gap-2 text-[11px] text-slate-500 hover:text-slate-400 active-press transition-colors px-3 py-1 rounded-lg"
    >
      <span class="font-mono tracking-tight font-semibold text-slate-400">v{$appVersion}</span>
      {#if versionInfo.isOta}
        <span class="px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 text-[9px] font-bold">OTA</span>
      {/if}
      <span class="text-slate-600">•</span>
      <span class="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Tocar para info</span>
      {#if otaState.updateReadyToApply}
        <span class="px-1.5 py-0.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800 text-[9px] font-bold">
          Actualización Lista
        </span>
      {/if}
    </button>
  </footer>

{:else}
  <!-- Minimalist inline clickable text -->
  <button
    type="button"
    onclick={openDetails}
    class="text-[11px] font-mono text-slate-400 hover:text-cyan-400 active-press transition-colors inline-flex items-center gap-1 {customClass}"
  >
    <span>v{$appVersion}</span>
    {#if versionInfo.isOta}
      <span class="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
    {/if}
  </button>
{/if}

<!-- Non-invasive Version & OTA Diagnostics Modal -->
{#if showDetailsModal}
  <div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-5 animate-fade-in">
    <div class="glass-card max-w-sm w-full p-5 rounded-3xl border border-slate-700/80 space-y-4 shadow-2xl">
      <!-- Modal Header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs">
            ℹ️
          </div>
          <div>
            <h3 class="text-sm font-bold text-white leading-tight">Información de la App</h3>
            <p class="text-[11px] text-slate-400">Canal de compilación y estado OTA</p>
          </div>
        </div>
        <button
          onclick={() => (showDetailsModal = false)}
          class="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xs active-press"
        >
          ✕
        </button>
      </div>

      <!-- Info Specs -->
      <div class="space-y-2 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800/80 text-xs">
        <div class="flex justify-between items-center">
          <span class="text-slate-400">Versión actual:</span>
          <span class="font-mono font-bold text-cyan-400">v{versionInfo.version}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-slate-400">Origen del código:</span>
          {#if versionInfo.isOta}
            <span class="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] font-bold">
              Over-The-Air (Capgo)
            </span>
          {:else if versionInfo.channel === 'native'}
            <span class="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold">
              Binario Base (APK/IPA)
            </span>
          {:else}
            <span class="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px]">
              Entorno Web
            </span>
          {/if}
        </div>
        {#if versionInfo.nativeVersion && versionInfo.isOta}
          <div class="flex justify-between items-center">
            <span class="text-slate-400">Binario nativo base:</span>
            <span class="font-mono text-slate-300">v{versionInfo.nativeVersion}</span>
          </div>
        {/if}
        <div class="flex justify-between items-center">
          <span class="text-slate-400">Estado OTA:</span>
          <span class="capitalize text-slate-200 font-semibold">{otaState.status}</span>
        </div>
      </div>

      <!-- Action Buttons -->
      {#if otaState.updateReadyToApply}
        <button
          onclick={handleApply}
          class="w-full touch-target rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs active-press shadow-lg shadow-emerald-500/20"
        >
          Reiniciar para Aplicar v{otaState.availableVersion}
        </button>
      {:else}
        <button
          onclick={handleCheckUpdate}
          disabled={isChecking}
          class="w-full touch-target rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-bold text-xs active-press border border-slate-700/60 flex items-center justify-center gap-2"
        >
          {#if isChecking}
            <span>Consultando Worker...</span>
          {:else}
            <span>Buscar Actualizaciones</span>
          {/if}
        </button>
      {/if}
    </div>
  </div>
{/if}
