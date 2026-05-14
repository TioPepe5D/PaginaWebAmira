/**
 * Optimiza imágenes JPG → WebP (1200px max, q80).
 * Borra el original tras convertir, excepto og.jpg / logo.* (social meta).
 *
 * Uso:
 *   node scripts/optimize-images.js          → procesa solo JPG sin .webp existente
 *   node scripts/optimize-images.js --force  → reprocesa todo
 *   node scripts/optimize-images.js --dry    → muestra qué haría sin tocar archivos
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const IMG_DIR    = path.join(__dirname, '..', 'img');
const MAX_WIDTH  = 1200;
const QUALITY    = 80;
const SKIP_NAMES = new Set(['og.jpg', 'logo.jpg', 'logo.jpeg']);

const force = process.argv.includes('--force');
const dry   = process.argv.includes('--dry');

async function main() {
  const archivos = fs.readdirSync(IMG_DIR)
    .filter(n => /\.(jpe?g|png)$/i.test(n) && !SKIP_NAMES.has(n));

  let bytesAntes = 0, bytesDespues = 0, convertidos = 0, saltados = 0;

  for (const nombre of archivos) {
    const inPath  = path.join(IMG_DIR, nombre);
    const outPath = path.join(IMG_DIR, nombre.replace(/\.(jpe?g|png)$/i, '.webp'));

    if (!force && fs.existsSync(outPath)) {
      saltados++;
      continue;
    }

    const sizeIn = fs.statSync(inPath).size;
    bytesAntes  += sizeIn;

    if (dry) {
      console.log(`[dry] ${nombre} → ${path.basename(outPath)}`);
      continue;
    }

    await sharp(inPath)
      .rotate()
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(outPath);

    const sizeOut = fs.statSync(outPath).size;
    bytesDespues += sizeOut;
    fs.unlinkSync(inPath);
    convertidos++;

    const pct = Math.round((1 - sizeOut / sizeIn) * 100);
    console.log(`${nombre.padEnd(45)} ${(sizeIn/1024).toFixed(0).padStart(6)} KB → ${(sizeOut/1024).toFixed(0).padStart(5)} KB  (-${pct}%)`);
  }

  console.log('\n────────────────────────────────────────');
  console.log(`Convertidos: ${convertidos}   Saltados: ${saltados}`);
  if (convertidos > 0 && !dry) {
    const mbIn  = (bytesAntes  / 1024 / 1024).toFixed(1);
    const mbOut = (bytesDespues / 1024 / 1024).toFixed(1);
    const ahorroPct = Math.round((1 - bytesDespues / bytesAntes) * 100);
    console.log(`Antes:  ${mbIn} MB`);
    console.log(`Ahora:  ${mbOut} MB`);
    console.log(`Ahorro: -${ahorroPct}%`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
