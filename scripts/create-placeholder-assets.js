import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const assetsDir = path.resolve(rootDir, 'assets');

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Modern SVGs for placeholders
const iconSvg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0e1726" />
      <stop offset="100%" stop-color="#030712" />
    </linearGradient>
    <linearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#06b6d4" />
      <stop offset="50%" stop-color="#3b82f6" />
      <stop offset="100%" stop-color="#6366f1" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="30" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1024" height="1024" rx="224" fill="url(#bgGrad)" />
  <rect width="1016" height="1016" x="4" y="4" rx="220" fill="none" stroke="#1e293b" stroke-width="8" />

  <!-- Center Glow -->
  <circle cx="512" cy="512" r="280" fill="#06b6d4" opacity="0.12" filter="url(#glow)" />

  <!-- App Device Icon -->
  <g transform="translate(256, 256)" filter="url(#glow)">
    <!-- Phone Outline -->
    <rect x="76" y="32" width="360" height="448" rx="52" fill="none" stroke="url(#primaryGrad)" stroke-width="36" />
    <!-- Dynamic Island / Speaker -->
    <rect x="196" y="68" width="120" height="20" rx="10" fill="url(#primaryGrad)" />
    <!-- Home Bar -->
    <rect x="180" y="420" width="152" height="18" rx="9" fill="url(#primaryGrad)" />
    <!-- Lightning Bolt / Fast OTA Spark -->
    <path d="M268 150 L204 266 H268 L244 362 L324 234 H256 Z" fill="url(#primaryGrad)" />
  </g>
</svg>
`;

const foregroundSvg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="fgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22d3ee" />
      <stop offset="50%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#818cf8" />
    </linearGradient>
    <filter id="glowFg" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="20" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <g transform="translate(256, 256)" filter="url(#glowFg)">
    <rect x="76" y="32" width="360" height="448" rx="52" fill="none" stroke="url(#fgGrad)" stroke-width="36" />
    <rect x="196" y="68" width="120" height="20" rx="10" fill="url(#fgGrad)" />
    <rect x="180" y="420" width="152" height="18" rx="9" fill="url(#fgGrad)" />
    <path d="M268 150 L204 266 H268 L244 362 L324 234 H256 Z" fill="url(#fgGrad)" />
  </g>
</svg>
`;

const backgroundSvg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="1024" fill="#090d16" />
</svg>
`;

const splashDarkSvg = `
<svg width="2732" height="2732" viewBox="0 0 2732 2732" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="splashGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#06b6d4" />
      <stop offset="100%" stop-color="#6366f1" />
    </linearGradient>
  </defs>
  <rect width="2732" height="2732" fill="#090d16" />
  <circle cx="1366" cy="1366" r="380" fill="#06b6d4" opacity="0.08" />
  <!-- Centered App Icon -->
  <g transform="translate(1110, 1110)">
    <rect x="76" y="32" width="360" height="448" rx="52" fill="none" stroke="url(#splashGrad)" stroke-width="36" />
    <rect x="196" y="68" width="120" height="20" rx="10" fill="url(#splashGrad)" />
    <rect x="180" y="420" width="152" height="18" rx="9" fill="url(#splashGrad)" />
    <path d="M268 150 L204 266 H268 L244 362 L324 234 H256 Z" fill="url(#splashGrad)" />
  </g>
</svg>
`;

const splashSvg = splashDarkSvg;

async function generatePlaceholders() {
  console.log('🎨 Generating high-res assets placeholders in /assets...');

  await sharp(Buffer.from(iconSvg)).resize(1024, 1024).png().toFile(path.join(assetsDir, 'icon-only.png'));
  console.log('  ✓ icon-only.png (1024x1024)');

  await sharp(Buffer.from(iconSvg)).resize(1024, 1024).png().toFile(path.join(assetsDir, 'logo.png'));
  console.log('  ✓ logo.png (1024x1024)');

  await sharp(Buffer.from(foregroundSvg)).resize(1024, 1024).png().toFile(path.join(assetsDir, 'icon-foreground.png'));
  console.log('  ✓ icon-foreground.png (1024x1024)');

  await sharp(Buffer.from(backgroundSvg)).resize(1024, 1024).png().toFile(path.join(assetsDir, 'icon-background.png'));
  console.log('  ✓ icon-background.png (1024x1024)');

  await sharp(Buffer.from(splashSvg)).resize(2732, 2732).png().toFile(path.join(assetsDir, 'splash.png'));
  console.log('  ✓ splash.png (2732x2732)');

  await sharp(Buffer.from(splashDarkSvg)).resize(2732, 2732).png().toFile(path.join(assetsDir, 'splash-dark.png'));
  console.log('  ✓ splash-dark.png (2732x2732)');

  console.log('✅ Base placeholder assets created successfully in assets/');
}

generatePlaceholders().catch((err) => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
