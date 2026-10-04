import fs from 'node:fs';
import path from 'node:path';
import archiver from 'archiver';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');
const outputFile = path.resolve(rootDir, 'dist.zip');

async function bundleOta() {
  console.log('📦 Starting OTA bundle creation...');

  if (!fs.existsSync(distDir)) {
    console.error('❌ Error: dist/ directory not found. Please run "npm run build" first.');
    process.exit(1);
  }

  // Remove existing dist.zip if present
  if (fs.existsSync(outputFile)) {
    fs.unlinkSync(outputFile);
    console.log('🗑️ Removed old dist.zip');
  }

  const output = fs.createWriteStream(outputFile);
  const archive = archiver('zip', {
    zlib: { level: 9 } // Maximum compression for mobile transfers
  });

  return new Promise((resolve, reject) => {
    output.on('close', () => {
      const sizeMb = (archive.pointer() / (1024 * 1024)).toFixed(2);
      console.log(`✅ OTA bundle created successfully: dist.zip (${sizeMb} MB)`);
      resolve();
    });

    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn('⚠️ Archive warning:', err);
      } else {
        reject(err);
      }
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);

    // Append all contents inside dist/ to root of archive
    archive.directory(distDir, false);

    archive.finalize();
  });
}

bundleOta().catch((err) => {
  console.error('❌ Failed to create OTA bundle:', err);
  process.exit(1);
});
