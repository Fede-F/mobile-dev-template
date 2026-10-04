# Instrucciones para Inteligencia Artificial y Asistentes de Código

> Este proyecto incluye las directrices de arquitectura, ciclo de vida OTA y diseño móvil en el archivo oficial [`AGENTS.md`](./AGENTS.md).

Por favor, consulta [`AGENTS.md`](./AGENTS.md) para conocer en detalle:
1. **Stack Tecnológico:** Astro v5 + Svelte 5 (Runes) + Tailwind CSS v4 + Capacitor v8 + Capgo OTA.
2. **Ciclo de Vida OTA:** Regla crítica de `notifyAppReady()` en montaje inicial para evitar rollbacks automáticos.
3. **Frontera de Despliegue:** Qué cambios aplican por OTA (`src/`) y qué cambios requieren compilar un nuevo binario APK/IPA (plugins de Capacitor, permisos nativos, `capacitor.config.ts`).
4. **Directrices Móviles UX/UI:** Safe-areas (`.pt-safe`, `.pb-safe`), tamaño táctil de 48px (`.touch-target`), haptics (`@capacitor/haptics`) y estados de pulsación activa.
5. **Automatización CI/CD:** Versionado semántico en `package.json` y publicación en GitHub Actions.
