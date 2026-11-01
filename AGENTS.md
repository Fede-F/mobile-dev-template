# 🤖 Guía de Instrucciones para Agentes de IA (AGENTS.md)

Este documento contiene las reglas fundamentales, directrices de arquitectura y restricciones técnicas para cualquier Inteligencia Artificial o asistente de código (Antigravity, Cursor, Claude, Copilot, ChatGPT) que trabaje en esta base de código.

---

## 🏛️ 1. Arquitectura y Stack Tecnológico

El proyecto es una **aplicación móvil híbrida de alto rendimiento** empaquetada como Single-Page Application (SPA) dentro de un contenedor webview nativo:

- **Motor Frontend:** Astro v5 + Svelte 5 (`output: 'static'`, renderizado puramente del lado del cliente vía `client:only="svelte"` o SPA mounts).
- **Reactividad:** Svelte 5 Runes exclusivamente (`$state`, `$derived`, `$effect`, `$props`). No usar la sintaxis legacy de Svelte 3/4 (`export let`, `$: reactive`).
- **Sistema de Estilos:** Tailwind CSS v4 (`@import "tailwindcss";` con `@tailwindcss/vite`).
- **Capa Nativa:** Capacitor v8 (`@capacitor/core`, `@capacitor/cli`, `@capacitor/app`, `@capacitor/haptics`, etc.).
- **Canal de Actualizaciones OTA:** `@capgo/capacitor-updater` v8 conectado a Cloudflare Worker multi-tenant (`mobile-ota-updater.fede-eagle.workers.dev`).

### Estructura del Proyecto
```
├── .github/workflows/
│   └── mobile_build.yml    # CI/CD: build Astro, dist.zip, APK y GitHub Release
├── scripts/
│   └── bundle-ota.js       # Empaqueta dist/ en dist.zip con compresión máxima
├── src/
│   ├── components/         # Componentes reactivos en Svelte 5
│   │   ├── App.svelte      # Contenedor raíz y navegación móvil
│   │   └── VersionBadge.svelte # Indicador de versión no invasivo (chip/footer)
│   ├── lib/                # Módulos agnósticos y servicios
│   │   ├── otaUpdater.js   # Cliente OTA desacoplado para Capgo y Worker
│   │   └── haptics.js      # Helpers para vibración háptica nativa
│   ├── pages/
│   │   └── index.astro     # Punto de entrada HTML móvil con safe-areas
│   └── styles/
│       └── global.css      # Variables de safe-area, utilidades táctiles y glassmorphism
├── astro.config.mjs        # Configuración Astro + Vite Tailwind v4 + Version injection
├── capacitor.config.ts     # Configuración Capacitor y plugins Capgo
├── package.json            # Scripts de compilación y dependencias
└── svelte.config.js        # Preprocesador para Svelte 5
```

---

## 🔄 2. Ciclo de Vida y Versionado OTA (Over-The-Air)

### ⚠️ Regla Crítica 1: Prevención de Rollback (`notifyAppReady`)
`@capgo/capacitor-updater` implementa un mecanismo de seguridad anti-brick: si un bundle web descargado crashea o no confirma su salud tras iniciar, el contenedor nativo revierte automáticamente la app al bundle anterior.
- **Obligatorio:** Cada vez que la aplicación se monta en el cliente (`onMount` en `App.svelte`), se **debe** invocar `notifyAppReady()` desde `src/lib/otaUpdater.js`.
- **Nunca** elimines ni pospongas la llamada a `notifyAppReady()`.

### ⚠️ Regla Crítica 2: Manejo de `'builtin'` en `@capgo/capacitor-updater` v8
En Capgo v8, cuando la aplicación se ejecuta desde el APK nativo de fábrica (sin bundle OTA aplicado), `CapacitorUpdater.current()` devuelve:
```json
{
  "bundle": {
    "id": "builtin",
    "version": "builtin",
    "status": "success"
  }
}
```
- **Nunca** uses `current.bundle.id` como string de versión ni asumas que `bundle.id !== 'default'` significa OTA, ya que mostraría `vbuiltin (OTA)` en la UI y forzaría re-descargas infinitas.
- **Regla de resolución en `getAppVersionInfo()`:**
  1. Si `!bundleId || bundleId === 'builtin' || bundleId === 'default' || bundleVer === 'builtin'`, el origen es el **Binario Base (`isOta: false`, `channel: 'native'`)** y la versión debe leerse de `import.meta.env.PUBLIC_APP_VERSION` (inyectada desde `package.json`).
  2. Si hay un bundle OTA activo (`!isBuiltinBundle`), el origen es **OTA (`isOta: true`, `channel: 'ota'`)** y la versión semántica debe leerse de `current.bundle.version` (limpiando el prefijo `v`), nunca de `current.bundle.id` (que es un hash interno de Capgo).

### ⚠️ Regla Crítica 3: Contrato del Cloudflare Worker Multi-Tenant (`/:repo/version`)
1. En `src/lib/otaUpdater.js`, la constante `DEFAULT_APP_NAME` **debe coincidir exactamente con el nombre del repositorio en GitHub** (bajo la cuenta `Fede-F`).
2. El Worker expone dos rutas basadas en el nombre del repositorio:
   - **Consulta de versión:** `GET https://mobile-ota-updater.fede-eagle.workers.dev/<repo>/version`
     - Respuesta JSON:
       ```json
       {
         "version": "v1.0.1",
         "published_at": "2026-11-01T03:50:00Z",
         "downloadUrl": "https://mobile-ota-updater.fede-eagle.workers.dev/<repo>/download"
       }
       ```
   - **Descarga del bundle:** `GET https://mobile-ota-updater.fede-eagle.workers.dev/<repo>/download` (proxy directo de `dist.zip` autenticado con `GITHUB_TOKEN`, compatible con repos públicos y privados).
3. **Sin Preflight CORS (`OPTIONS`):** La petición `fetch` hacia `/<repo>/version` debe ser un `GET` simple **sin headers personalizados** como `'Cache-Control': 'no-cache'`, para no disparar un preflight `OPTIONS` en el WebView.
4. **Descarga y Activación en Capgo v8:**
   - Pasar únicamente `{ url: bundleUrl, version: latestVersion }` a `CapacitorUpdater.download()` (solo incluir `checksum` si viene definido) y pasar el objeto `bundle` retornado directamente a `await CapacitorUpdater.set(bundle)`.

---

## 🛠️ 3. Checklist de Inicialización para un Proyecto Nuevo (Día 1)

Cuando un agente de IA cree una nueva app a partir de este template, **debe** actualizar todos estos puntos antes del primer commit/push para que el APK `v1.0.0` salga listo desde la primera compilación:

1. **Identidad Web y OTA:**
   - `package.json`: Actualizar `"name"`, `"description"` y `"version": "1.0.0"`.
   - `src/lib/otaUpdater.js`: Actualizar `DEFAULT_APP_NAME = '<nombre-exacto-del-repo-github>'`.
2. **Identidad Nativa Android (Obligatorio sincronizar los 4 archivos):**
   - `capacitor.config.ts`: Actualizar `appId` (ej. `'ar.planner.miapp'`) y `appName` (ej. `'Mi App'`).
   - `android/app/build.gradle`: Actualizar `namespace = "ar.planner.miapp"`, `applicationId "ar.planner.miapp"` y `versionName "1.0.0"`.
   - `android/app/src/main/res/values/strings.xml`: Actualizar `app_name`, `title_activity_main`, `package_name` y `custom_url_scheme`.
   - `android/app/src/main/java/.../MainActivity.java`: Mover `MainActivity.java` a la ruta de carpetas correspondiente al nuevo `package ar.planner.miapp;` y eliminar la carpeta `com/template/mobiledev` anterior.
3. **Iconos y Splash Screens Nativos (Antes de compilar el primer APK):**
   - Generar los assets en `assets/` (`icon-only.png`, `icon-foreground.png`, `icon-background.png`, `splash.png`, `splash-dark.png`) y ejecutar:
     ```bash
     npm run assets:generate
     npx cap sync android
     ```
4. **Permisos de GitHub Actions antes del primer Push:**
   - Crear el repositorio en GitHub, habilitar **Settings → Actions → General → Workflow permissions → Read and write permissions** y recién entonces hacer `git push -u origin main`.

---

## ⚖️ 4. Regla Fundamental: ¿Cambio OTA o Nuevo Binario (APK/IPA)?

Cuando planifiques o realices cambios en el código, distingue estrictamente la vía de entrega:

| Tipo de Cambio | ¿Viaja por OTA? | ¿Requiere Nuevo APK / Tienda? |
| :--- | :---: | :---: |
| Modificaciones en `src/**/*.svelte`, `src/**/*.js`, `src/**/*.ts`, `src/**/*.css` | ✅ **SÍ (Instantáneo)** | ❌ No |
| Nuevas vistas, lógica de negocio, fixes de UI, textos, diccionarios locales | ✅ **SÍ (Instantáneo)** | ❌ No |
| Imágenes o assets web en `public/` o `src/assets/` | ✅ **SÍ (Instantáneo)** | ❌ No |
| Cambios en iconos de launcher (`assets/`, `mipmap-*`) o Splash Screen nativo | ❌ No | ✅ **SÍ (Obligatorio)** |
| Instalación de nuevos plugins Capacitor (`npm i @capacitor/...`) | ❌ No | ✅ **SÍ (Obligatorio)** |
| Cambios en código nativo Java/Kotlin (`android/`) o Swift (`ios/`) | ❌ No | ✅ **SÍ (Obligatorio)** |
| Modificaciones en permisos de `AndroidManifest.xml` o `Info.plist` | ❌ No | ✅ **SÍ (Obligatorio)** |
| Modificaciones en `capacitor.config.ts` (appId, scheme, native splash) | ❌ No | ✅ **SÍ (Obligatorio)** |

---

## 📱 5. Reglas Estrictas de Diseño Móvil (UX / UI Mobile-First)

1. **Objetivo Táctil Mínimo (Touch Targets de 48px):** Usa la clase `.touch-target` definida en `global.css`.
2. **Safe Areas:** Utiliza `.pt-safe` para cabeceras y `.pb-safe` para barras de navegación inferiores (`viewport-fit=cover`).
3. **Feedback Háptico Táctil:** Usa `src/lib/haptics.js` en cambios de tab, confirmaciones y acciones principales.
4. **Respuesta Visual al Toque:** Usa `.active-press` (`scale(0.96)`) y mantén `-webkit-tap-highlight-color: transparent;`.
5. **Evitar Gestos Conflictivos:** `overscroll-behavior-y: none;` en `body`.

---

## 🏷️ 6. Flujo de Versionado para CI/CD (Cómo Publicar un OTA)

1. Modifica tu código en `src/` (Svelte, JS/TS, CSS, assets web).
2. Incrementa la versión en `package.json`:
   ```bash
   npm run bump:patch
   ```
3. Realiza commit y push a la rama `main`:
   ```bash
   git add .
   git commit -m "feat: nueva mejora por OTA"
   git push origin main
   ```
4. **Automático:** GitHub Actions compilará el proyecto, creará `dist.zip` y publicará el GitHub Release `v<version>`. El Cloudflare Worker multi-tenant (`/:repo/version` y `/:repo/download`) servirá la actualización a todos los dispositivos en segundo plano.
