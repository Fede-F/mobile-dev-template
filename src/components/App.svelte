<script>
  import { onMount } from 'svelte';
  import {
    appVersion,
    notifyAppReady,
    checkForOtaUpdates,
    subscribeOtaState,
    reloadApp,
    resetToNativeBundle,
    getCurrentAppVersion,
    DEFAULT_APP_NAME
  } from '../lib/otaUpdater.js';
  import {
    hapticImpactLight,
    hapticImpactMedium,
    hapticImpactHeavy,
    hapticSuccess,
    hapticWarning,
    hapticSelection
  } from '../lib/haptics.js';
  import VersionBadge from './VersionBadge.svelte';

  // Svelte 5 Runes for reactive state
  let currentTab = $state('dashboard');
  let currentVersion = $state('Cargando...');
  let otaState = $state({
    status: 'idle',
    currentVersion: null,
    availableVersion: null,
    downloadProgress: 0,
    error: null,
    updateReadyToApply: false
  });
  let isCheckingManual = $state(false);
  let showResetModal = $state(false);

  onMount(async () => {
    // 1. Critical OTA lifecycle call: notify Capgo that app launched safely
    await notifyAppReady();

    // 2. Fetch current version display
    currentVersion = await getCurrentAppVersion();

    // 3. Subscribe to OTA progress & background events
    const unsubscribe = subscribeOtaState((state) => {
      otaState = state;
    });

    // 4. Background check for OTA updates on boot
    checkForOtaUpdates({ autoReload: false });

    return () => {
      unsubscribe();
    };
  });

  async function handleTabChange(tab) {
    if (currentTab !== tab) {
      await hapticSelection();
      currentTab = tab;
    }
  }

  async function handleManualCheck() {
    await hapticImpactMedium();
    isCheckingManual = true;
    try {
      await checkForOtaUpdates({ autoReload: false });
      if (otaState.status === 'up-to-date') {
        await hapticSuccess();
      }
    } finally {
      isCheckingManual = false;
    }
  }

  async function handleApplyUpdate() {
    await hapticSuccess();
    await reloadApp();
  }

  async function handleFactoryReset() {
    await hapticWarning();
    showResetModal = false;
    await resetToNativeBundle();
  }
</script>

<div class="flex flex-col min-h-screen bg-[#090d16] text-slate-100 antialiased overflow-hidden select-none">
  <!-- Top App Bar with Safe Area -->
  <header class="glass-header sticky top-0 z-40 px-5 pt-safe pb-3 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
        <svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
        </svg>
      </div>
      <div>
        <h1 class="text-base font-bold tracking-tight text-white leading-none">Mobile Starter</h1>
        <p class="text-[11px] font-medium text-cyan-400/90 leading-tight mt-0.5">Capacitor v8 + Svelte 5</p>
      </div>
    </div>

    <!-- Non-invasive Version & OTA Status Chip -->
    <VersionBadge variant="chip" />
  </header>

  <!-- Notification Banner if Update Ready -->
  {#if otaState.updateReadyToApply}
    <div class="mx-4 mt-3 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/80 to-cyan-950/80 border border-emerald-500/40 shadow-xl flex items-center justify-between gap-3 animate-fade-in">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        </div>
        <div>
          <p class="text-xs font-bold text-white">Actualización v{otaState.availableVersion} lista</p>
          <p class="text-[11px] text-emerald-200/80">Reinicia la app para aplicar los cambios sin tienda.</p>
        </div>
      </div>
      <button
        onclick={handleApplyUpdate}
        class="touch-target px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active-press text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/30 whitespace-nowrap"
      >
        Reiniciar
      </button>
    </div>
  {/if}

  <!-- Main Scrollable Screen Content -->
  <main class="flex-1 overflow-y-auto px-5 py-4 space-y-5 pb-28">
    {#if currentTab === 'dashboard'}
      <!-- Hero Welcome Card -->
      <section class="glass-card rounded-3xl p-5 border border-cyan-500/20 relative overflow-hidden">
        <div class="absolute -right-8 -top-8 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none"></div>
        <div class="relative z-10">
          <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-[11px] font-semibold border border-cyan-500/20 mb-3">
            <span>✨</span> Template de Producción
          </div>
          <h2 class="text-xl font-bold text-white tracking-tight leading-tight">
            Arquitectura Híbrida de Máximo Rendimiento
          </h2>
          <p class="text-xs text-slate-300 mt-2 leading-relaxed">
            Frontend reactivo ultraligero con Astro y Svelte 5 compilado a SPA estática, acelerado por Capacitor v8 con auto-actualizaciones instantáneas Over-The-Air (OTA).
          </p>
        </div>
      </section>

      <!-- Key Metrics & Stack Badges -->
      <section class="grid grid-cols-2 gap-3">
        <div class="glass-card p-4 rounded-2xl border border-slate-800">
          <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Motor Frontend</div>
          <div class="text-base font-bold text-white mt-1">Astro + Svelte 5</div>
          <div class="text-[11px] text-cyan-400 mt-1">Runes `$state` & Static SPA</div>
        </div>

        <div class="glass-card p-4 rounded-2xl border border-slate-800">
          <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Estilos & UI</div>
          <div class="text-base font-bold text-white mt-1">Tailwind CSS v4</div>
          <div class="text-[11px] text-indigo-400 mt-1">Safe Areas & Blur FX</div>
        </div>

        <div class="glass-card p-4 rounded-2xl border border-slate-800">
          <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Bridge Nativo</div>
          <div class="text-base font-bold text-white mt-1">Capacitor v8</div>
          <div class="text-[11px] text-emerald-400 mt-1">Haptics, App, StatusBar</div>
        </div>

        <div class="glass-card p-4 rounded-2xl border border-slate-800">
          <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Despliegue OTA</div>
          <div class="text-base font-bold text-white mt-1">Capgo + Workers</div>
          <div class="text-[11px] text-amber-400 mt-1">Multi-tenant Cloudflare</div>
        </div>
      </section>

      <!-- Architecture Quick Tip -->
      <section class="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
        <h3 class="text-xs font-bold text-slate-200 flex items-center gap-2">
          <span class="text-cyan-400">💡</span> Regla de Oro OTA vs. APK
        </h3>
        <p class="text-[11px] text-slate-400 leading-relaxed">
          • <strong class="text-slate-200">Vía OTA:</strong> Cualquier cambio en archivos <code class="text-cyan-300">src/</code> (HTML, CSS, Svelte, JS, imágenes). Se publica en segundos sin pasar por Google Play o App Store.
        </p>
        <p class="text-[11px] text-slate-400 leading-relaxed">
          • <strong class="text-slate-200">Vía Nuevo APK/IPA:</strong> Instalación de nuevos plugins nativos de Capacitor, cambios en <code class="text-cyan-300">capacitor.config.ts</code> o carpetas nativas <code class="text-cyan-300">android/</code> y <code class="text-cyan-300">ios/</code>.
        </p>
      </section>

    {:else if currentTab === 'ota'}
      <!-- OTA Control Center -->
      <section class="glass-card rounded-3xl p-5 border border-slate-800 space-y-4">
        <div>
          <h2 class="text-lg font-bold text-white">Centro de Actualizaciones OTA</h2>
          <p class="text-xs text-slate-400 mt-1">
            Canal conectado a Cloudflare Worker multi-tenant:
          </p>
          <div class="mt-2 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-cyan-300 break-all select-text">
            mobile-ota-updater.fede-eagle.workers.dev?app={DEFAULT_APP_NAME}
          </div>
        </div>

        <!-- Current State Info -->
        <div class="space-y-2 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
          <div class="flex justify-between items-center text-xs">
            <span class="text-slate-400">Versión instalada:</span>
            <span class="font-bold text-white">v{currentVersion}</span>
          </div>
          <div class="flex justify-between items-center text-xs">
            <span class="text-slate-400">Estado del sincronizador:</span>
            <span class="font-bold capitalize text-cyan-400">{otaState.status}</span>
          </div>
          {#if otaState.availableVersion}
            <div class="flex justify-between items-center text-xs">
              <span class="text-slate-400">Última versión detectada:</span>
              <span class="font-bold text-emerald-400">v{otaState.availableVersion}</span>
            </div>
          {/if}
          {#if otaState.error}
            <div class="text-[11px] text-rose-400 bg-rose-950/30 p-2 rounded-lg border border-rose-800/40">
              Error: {otaState.error}
            </div>
          {/if}
        </div>

        <!-- Manual Check Button -->
        <button
          onclick={handleManualCheck}
          disabled={isCheckingManual}
          class="w-full touch-target rounded-2xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs active-press shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-2"
        >
          {#if isCheckingManual}
            <svg class="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            <span>Buscando en Cloudflare Worker...</span>
          {:else}
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            <span>Buscar Actualizaciones Ahora</span>
          {/if}
        </button>

        <!-- Emergency Rollback Trigger -->
        <div class="pt-2 border-t border-slate-800/80">
          <button
            onclick={() => (showResetModal = true)}
            class="w-full touch-target rounded-2xl bg-slate-900 hover:bg-slate-800 text-rose-400 text-xs font-semibold active-press border border-rose-950 flex items-center justify-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
            <span>Restaurar Bundle de Fábrica (Rollback)</span>
          </button>
        </div>
      </section>

    {:else if currentTab === 'haptics'}
      <!-- Mobile UX / Haptics Showcase -->
      <section class="glass-card rounded-3xl p-5 border border-slate-800 space-y-4">
        <div>
          <h2 class="text-lg font-bold text-white">Laboratorio Táctil & Háptico</h2>
          <p class="text-xs text-slate-400 mt-1">
            Prueba la respuesta sensorial en dispositivos móviles reales (Capacitor Haptics):
          </p>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <button
            onclick={async () => { await hapticImpactLight(); }}
            class="touch-target p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 active-press font-semibold text-xs text-slate-200 border border-slate-700/60 flex flex-col items-center justify-center gap-1.5"
          >
            <span class="text-base">🪶</span>
            <span>Impacto Ligero</span>
          </button>

          <button
            onclick={async () => { await hapticImpactMedium(); }}
            class="touch-target p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 active-press font-semibold text-xs text-slate-200 border border-slate-700/60 flex flex-col items-center justify-center gap-1.5"
          >
            <span class="text-base">🔨</span>
            <span>Impacto Medio</span>
          </button>

          <button
            onclick={async () => { await hapticImpactHeavy(); }}
            class="touch-target p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 active-press font-semibold text-xs text-slate-200 border border-slate-700/60 flex flex-col items-center justify-center gap-1.5"
          >
            <span class="text-base">💥</span>
            <span>Impacto Fuerte</span>
          </button>

          <button
            onclick={async () => { await hapticSuccess(); }}
            class="touch-target p-3.5 rounded-2xl bg-emerald-950/40 hover:bg-emerald-900/50 active-press font-semibold text-xs text-emerald-300 border border-emerald-800/40 flex flex-col items-center justify-center gap-1.5"
          >
            <span class="text-base">✅</span>
            <span>Notif. Éxito</span>
          </button>
        </div>

        <div class="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 space-y-1">
          <p class="font-semibold text-slate-200">Buenas prácticas táctiles:</p>
          <p>• Los botones tienen una altura táctil mínima de 48px (<code class="text-cyan-300">touch-target</code>).</p>
          <p>• Retorno visual de pulsación instantáneo con <code class="text-cyan-300">active-press</code>.</p>
          <p>• Eliminación del destello azul estándar de WebKit.</p>
        </div>
      </section>
    {/if}

    <!-- Non-invasive Bottom Version Footer -->
    <VersionBadge variant="footer" />
  </main>

  <!-- Bottom Floating Glass Navigation Dock (Safe Area Bottom) -->
  <nav class="glass-nav fixed bottom-0 left-0 right-0 z-40 px-6 pt-2 pb-safe border-t border-slate-800/60">
    <div class="flex items-center justify-around max-w-md mx-auto">
      <button
        onclick={() => handleTabChange('dashboard')}
        class="touch-target flex flex-col items-center justify-center gap-1 transition-colors {currentTab === 'dashboard' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'}"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
        <span class="text-[10px] font-semibold">Inicio</span>
      </button>

      <button
        onclick={() => handleTabChange('ota')}
        class="touch-target flex flex-col items-center justify-center gap-1 transition-colors {currentTab === 'ota' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'}"
      >
        <div class="relative">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9.75v6.75m0 0l-3-3m3 3l3-3m-8.25 6h10.5A2.25 2.25 0 0021 17.25V6.75A2.25 2.25 0 0018.75 4.5H5.25A2.25 2.25 0 003 6.75v10.5A2.25 2.25 0 005.25 21z" />
          </svg>
          {#if otaState.updateReadyToApply}
            <span class="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          {/if}
        </div>
        <span class="text-[10px] font-semibold">OTA Update</span>
      </button>

      <button
        onclick={() => handleTabChange('haptics')}
        class="touch-target flex flex-col items-center justify-center gap-1 transition-colors {currentTab === 'haptics' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'}"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.416l-1.59 1.591M20.25 10.5H18M7.756 6.507l-1.59-1.59M6 10.5H3.75" />
        </svg>
        <span class="text-[10px] font-semibold">Hápticos</span>
      </button>
    </div>
  </nav>

  <!-- Factory Reset Confirmation Dialog -->
  {#if showResetModal}
    <div class="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-5">
      <div class="glass-card max-w-sm w-full p-5 rounded-3xl border border-rose-500/30 space-y-4">
        <h3 class="text-base font-bold text-white">¿Restaurar a versión inicial?</h3>
        <p class="text-xs text-slate-300 leading-relaxed">
          Esto eliminará cualquier versión OTA descargada y forzará la ejecución del código original compilado dentro del binario nativo.
        </p>
        <div class="flex gap-2">
          <button
            onclick={() => (showResetModal = false)}
            class="flex-1 touch-target rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs active-press"
          >
            Cancelar
          </button>
          <button
            onclick={handleFactoryReset}
            class="flex-1 touch-target rounded-xl bg-rose-600 text-white font-bold text-xs active-press shadow-lg shadow-rose-600/30"
          >
            Confirmar Reset
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
