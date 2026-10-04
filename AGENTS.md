# 🤖 Guía de Instrucciones para Agentes de IA (AGENTS.md)

Este documento contiene las reglas fundamentales, directrices de arquitectura y restricciones técnicas para cualquier Inteligencia Artificial o asistente de código (Antigravity, Cursor, Claude, Copilot, ChatGPT) que trabaje en esta base de código.

---

## 🏛️ 1. Arquitectura y Stack Tecnológico

El proyecto es una **aplicación móvil híbrida de alto rendimiento** empaquetada como Single-Page Application (SPA) dentro de un contenedor webview nativo:

- **Motor Frontend:** Astro v5 + Svelte 5 (`output: 'static'`, renderizado puramente del lado del cliente vía `client:only="svelte"` o SPA mounts).
- **Reactividad:** Svelte 5 Runes exclusivamente (`$state`, `$derived`, `$effect`, `$props`). No usar la sintaxis legacy de Svelte 3/4 (`export let`, `$: reactive`).
- **Sistema de Estilos:** Tailwind CSS v4 (`@import "tailwindcss";` con `@tailwindcss/vite`).
- **Capa Nativa:** Capacitor v8 (`@capacitor/core`, `@capacitor/cli`, `@capacitor/app`, `@capacitor/haptics`, etc.).
- **Canal de Actualizaciones OTA:** `@capgo/capacitor-updater` conectado a Cloudflare Worker multi-tenant (`mobile-ota-updater.fede-eagle.workers.dev`).

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

### ⚠️ Regla Crítica: Prevención de Rollback
`@capgo/capacitor-updater` implementa un mecanismo de seguridad anti-brick: si un bundle web descargado crashea o no confirma su salud tras iniciar, el contenedor nativo revierte automáticamente la app al bundle anterior.
- **Obligatorio:** Cada vez que la aplicación se monta en el cliente (`onMount` en `App.svelte`), se **debe** invocar `notifyAppReady()` desde `src/lib/otaUpdater.js`.
- **Nunca** elimines ni pospongas la llamada a `notifyAppReady()`.

### Flujo de Actualización en Segundo Plano
1. Al abrir la app, tras `notifyAppReady()`, se ejecuta `checkForOtaUpdates()`.
2. El cliente consulta al Cloudflare Worker con el nombre de la app y la versión actual:
   `https://mobile-ota-updater.fede-eagle.workers.dev?app=<appName>&version=<version>`
3. Si el worker indica que hay un release superior en GitHub, Capgo descarga el archivo `dist.zip`.
4. El paquete se instala con `CapacitorUpdater.set()`.
5. Gracias a la configuración `resetWhenUpdate: false` en `capacitor.config.ts`, la experiencia del usuario no se interrumpe; el nuevo código se activará en la siguiente apertura o cuando el usuario pulse "Reiniciar".

### 🏷️ Visualización de Versión en la UI (No Invasiva)
Para auditar la versión activa sin perjudicar la UX ni confundir al usuario final:
- Usa el componente `<VersionBadge variant="chip" />` (para la barra superior o cabecera) o `<VersionBadge variant="footer" />` (pie de página sutil con scroll).
- La versión inyectada en compilación (`__APP_VERSION__` / `import.meta.env.PUBLIC_APP_VERSION`) y el runtime nativo se resuelven a través de `getAppVersionInfo()` en `src/lib/otaUpdater.js`, distinguiendo bundles OTA (`v1.0.1 (OTA)`) vs binario nativo base (`v1.0.0 (Base)`).
- Al pulsar el badge, se dispara retroalimentación háptica y se despliega un diálogo de diagnóstico con opción de comprobación manual.

---

## ⚖️ 3. Regla Fundamental: ¿Cambio OTA o Nuevo Binario (APK/IPA)?

Cuando planifiques o realices cambios en el código, distingue estrictamente la vía de entrega:

| Tipo de Cambio | ¿Viaja por OTA? | ¿Requiere Nuevo APK / Tienda? |
| :--- | :---: | :---: |
| Modificaciones en `src/**/*.svelte`, `src/**/*.js`, `src/**/*.css` | ✅ **SÍ (Instantáneo)** | ❌ No |
| Nuevas vistas, lógica de negocio, fixes de UI, textos | ✅ **SÍ (Instantáneo)** | ❌ No |
| Imágenes o assets web en `public/` o `src/assets/` | ✅ **SÍ (Instantáneo)** | ❌ No |
| Cambios en iconos de launcher (`assets/`, `mipmap-*`) o Splash Screen nativo | ❌ No | ✅ **SÍ (Obligatorio)** |
| Instalación de nuevos plugins Capacitor (`npm i @capacitor/...`) | ❌ No | ✅ **SÍ (Obligatorio)** |
| Cambios en código nativo Java/Kotlin (`android/`) o Swift (`ios/`) | ❌ No | ✅ **SÍ (Obligatorio)** |
| Modificaciones en permisos de `AndroidManifest.xml` o `Info.plist` | ❌ No | ✅ **SÍ (Obligatorio)** |
| Modificaciones en `capacitor.config.ts` (appId, scheme, native splash) | ❌ No | ✅ **SÍ (Obligatorio)** |

> [!CAUTION]
> 1. Si añades un nuevo plugin nativo de Capacitor y solo publicas una actualización OTA, los usuarios que tengan el APK viejo sufrirán un crash de `Plugin not implemented`.
> 2. Si cambias los iconos de la app en `assets/` y corres `npm run assets:generate`, estos reemplazan los archivos compilados en `android/app/src/main/res/`. El sistema operativo Android solo lee estos iconos al instalar o actualizar el APK. Por lo tanto, ¡los iconos no cambian por OTA! En ese caso, debes compilar y distribuir un nuevo APK.

---

## 📱 4. Reglas Estrictas de Diseño Móvil (UX / UI Mobile-First)

Cualquier pantalla o componente nuevo debe seguir estas directrices móviles inquebrantables:

1. **Objetivo Táctil Mínimo (Touch Targets de 48px):**
   - Todo elemento cliqueable o interactivo (botones, iconos, selectores) debe tener un área táctil mínima de `48x48px` (usa la clase `.touch-target` definida en `global.css`).
2. **Safe Areas (Muescas, Cámaras e Isla Dinámica):**
   - Nunca sitúes contenido vital pegado al borde superior o inferior.
   - Utiliza `.pt-safe` para cabeceras y `.pb-safe` para barras de navegación inferiores.
   - El contenedor HTML utiliza `viewport-fit=cover`.
3. **Feedback Háptico Táctil:**
   - Incorpora retroalimentación háptica en interacciones clave (cambios de tab, confirmaciones, acciones de éxito o error) usando `src/lib/haptics.js`.
4. **Respuesta Visual al Toque (Active States):**
   - Usa la clase `.active-press` (`scale(0.96)`) en botones para dar sensación táctil responsiva nativa.
   - Mantén `-webkit-tap-highlight-color: transparent;` para erradicar el parpadeo gris o azul de los navegadores de escritorio.
5. **Comportamiento del Teclado y Formularios:**
   - En campos de texto, usa tipos semánticos (`type="email"`, `inputmode="numeric"`, `enterkeyhint="next"`).
   - Asegura que el scroll no quede tapado por el teclado virtual nativo.
6. **Evitar Gestos Conflictivos:**
   - Desactiva el rebote accidental del navegador con `overscroll-behavior-y: none;`.

---

## 🏷️ 5. Flujo de Versionado para CI/CD

### 🚀 Regla de Oro: Cómo Publicar una Actualización OTA
Para lanzar una actualización instantánea Over-The-Air que llegue a todos los dispositivos instalados sin pasar por las tiendas:

1. Modifica tu código en `src/` (Svelte, JS, CSS, assets).
2. Incrementa la versión en `package.json`:
   ```bash
   npm version patch   # O usa el alias: npm run bump:patch
   ```
3. Realiza commit y push a la rama `main`:
   ```bash
   git add .
   git commit -m "fix: mi nueva mejora en la app"
   git push origin main
   ```
4. **Eso es todo:** GitHub Actions compilará automáticamente el proyecto, creará `dist.zip` y publicará el GitHub Release con el tag `v<version>`. El Cloudflare Worker multi-tenant detectará el nuevo release y los usuarios recibirán la actualización en segundo plano.
