# 🚀 Mobile Hybrid Starter Template

Template oficial de alto rendimiento para el desarrollo de aplicaciones móviles híbridas (Android & iOS) con **Astro**, **Svelte 5**, **Tailwind CSS v4** y **Capacitor v8**, equipado con un sistema nativo y gratuito de **Auto-Actualizaciones Over-The-Air (OTA)** mediante **Cloudflare Workers** y **GitHub Actions**.

---

## ⚡ Stack Tecnológico

| Capa | Tecnología | Características |
| :--- | :--- | :--- |
| **Framework Web** | [Astro v5](https://astro.build/) | Modo SPA estático optimizado (`output: 'static'`) |
| **Componentes UI** | [Svelte 5](https://svelte.dev/) | Reactividad moderna mediante Runes (`$state`, `$derived`, `$effect`) |
| **Estilos & FX** | [Tailwind CSS v4](https://tailwindcss.com/) | Safe areas dinámicas (`pt-safe`, `pb-safe`), glassmorphism y toque nativo |
| **Runtime Nativo** | [Capacitor v8](https://capacitorjs.com/) | Acceso al hardware, Haptics, StatusBar, App Lifecycle |
| **Actualizaciones OTA** | [@capgo/capacitor-updater](https://capgo.app/) | Actualizaciones instantáneas sin pasar por tiendas ni costes de servidores |
| **Distribución Cloud** | [Cloudflare Workers](https://workers.cloudflare.com/) | Worker multi-tenant (`mobile-ota-updater.fede-eagle.workers.dev/:repo/version`) |
| **CI / CD** | GitHub Actions | Compilación de `dist.zip`, generación de `app-debug.apk` y GitHub Releases automáticos |

---

## 🏎️ Quickstart: Cómo usar este Template para una nueva App

### 1. Clonar o utilizar como Template
Crea un nuevo repositorio en GitHub a partir de este template y clónalo en tu equipo:
```bash
git clone https://github.com/TU_USUARIO/TU_NUEVA_APP.git
cd TU_NUEVA_APP
npm install
```

### 2. Personalizar y Renombrar la Aplicación
Para adaptar el template a tu nueva app, modifica únicamente 3 archivos clave:

1. **`capacitor.config.ts`**:
   ```typescript
   const config: CapacitorConfig = {
     appId: 'com.tuempresa.tuapp', // 👈 ID único de tu paquete Android/iOS
     appName: 'Mi App Increíble',   // 👈 Nombre visible en la pantalla de inicio
     webDir: 'dist',
     // ...
   };
   ```

2. **`src/lib/otaUpdater.js`**:
   Configura el nombre exacto de tu repositorio en GitHub (el Cloudflare Worker multi-tenant usa la ruta `/:repo/version` y `/:repo/download`):
   ```javascript
   export const DEFAULT_APP_NAME = 'nombre-exacto-del-repo'; // 👈 Debe coincidir con el nombre del repo en GitHub
   ```

3. **`package.json`**:
   Actualiza el `name`, `description` y la versión inicial (`1.0.0`).

### 3. Generar Iconos y Splash Screens Nativos desde el Día 1 🎨
Para evitar que tu app se compile con el icono y splash screen de Android por defecto:
1. Coloca tu logotipo o iconos en la carpeta `assets/` (el template ya incluye placeholders listos):
   - `assets/icon-only.png` (1024x1024)
   - `assets/icon-foreground.png` y `assets/icon-background.png` (1024x1024)
   - `assets/splash.png` y `assets/splash-dark.png` (2732x2732)
2. Ejecuta el generador nativo:
   ```bash
   npm run assets:generate
   ```
   *Esto generará automáticamente todas las densidades de iconos adaptativos (`mipmap-*`) y splash screens (`drawable-*`) en Android e iOS.*

### 4. Configurar Permisos en GitHub Actions ⚠️ *(Paso Crítico)*
Para que el pipeline de CI/CD pueda crear GitHub Releases y subir los archivos `dist.zip` y `app-debug.apk`:

1. Ve a tu repositorio en GitHub: **Settings** > **Actions** > **General**.
2. Desplázate hasta la sección **Workflow permissions**.
3. Selecciona: **Read and write permissions**.
4. Marca la casilla **Allow GitHub Actions to create and approve pull requests** (opcional pero recomendado).
5. Haz clic en **Save**.

---

## 🔄 ¿Cómo funciona el Sistema OTA Gratuito?

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Desarrollador
    participant GH as GitHub Actions (CI/CD)
    participant Rel as GitHub Releases
    participant CF as Cloudflare Worker (Multi-tenant)
    participant App as App Móvil del Usuario

    Dev->>GH: git push origin main (v1.0.1)
    GH->>GH: Compila Astro/Svelte 5 (dist/)
    GH->>GH: Empaqueta dist.zip
    GH->>GH: Compila app-debug.apk
    GH->>Rel: Publica Release v1.0.1 con dist.zip y APK
    
    Note over App: El usuario abre la app
    App->>App: notifyAppReady() [Previene Rollback]
    App->>CF: GET /<repo>/version
    CF->>Rel: Consulta última versión disponible (con GITHUB_TOKEN)
    CF-->>App: Retorna { version: 'v1.0.1', downloadUrl: '.../<repo>/download' }
    App->>CF: Descarga dist.zip en segundo plano desde /<repo>/download
    App->>App: CapacitorUpdater.set({ id: '1.0.1' })
    Note over App: Listo para aplicar al reiniciar la app
```

### 💡 Ciclo de Vida: `notifyAppReady()`
Capgo cuenta con un mecanismo que **revierte automáticamente al bundle anterior** si la nueva versión falla al arrancar. Por ello, el módulo `src/lib/otaUpdater.js` invoca `notifyAppReady()` en el montaje inicial del componente raíz (`App.svelte`).

---

## 🛠️ Comandos de Desarrollo

| Comando | Descripción |
| :--- | :--- |
| `npm run dev` | Inicia el servidor de desarrollo local de Astro (`http://localhost:4321`) |
| `npm run build` | Compila el frontend estático SPA a la carpeta `dist/` |
| `npm run bundle:ota` | Compila y genera el archivo comprimido `dist.zip` para OTA |
| `npm run assets:generate` | Genera todos los iconos adaptativos y splash screens en `android/` y `ios/` |
| `npm run cap:sync` | Compila el frontend y sincroniza los cambios con las carpetas nativas |
| `npm run cap:open:android` | Abre el proyecto en Android Studio |
| `npm run cap:open:ios` | Abre el proyecto en Xcode (requiere macOS) |
| `npm run bump:patch` | Incrementa versión de parche en `package.json` (ej: 1.0.0 ➔ 1.0.1) |
| `npm run bump:minor` | Incrementa versión menor (ej: 1.0.0 ➔ 1.1.0) |
| `npm run bump:major` | Incrementa versión mayor (ej: 1.0.0 ➔ 2.0.0) |

---

## 🚀 Cómo Publicar una Actualización OTA en Segundos

Para enviar una actualización instantánea a todos los usuarios sin pasar por revisión de Google Play o App Store:

1. Realiza tus cambios en el código (`src/components/`, `src/lib/`, estilos, etc.).
2. Incrementa la versión:
   ```bash
   npm version patch   # O usa: npm run bump:patch
   ```
3. Sube los cambios a GitHub:
   ```bash
   git add .
   git commit -m "feat: nueva mejora en la aplicación"
   git push origin main
   ```
4. **Automático:** GitHub Actions compilará `dist.zip`, creará el Release con la nueva versión y el Cloudflare Worker distribuirá la actualización a todos los dispositivos en segundo plano a través de `/:repo/version` y `/:repo/download`.
