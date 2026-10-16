// Creates responsive delivery copies; generation sources are retained separately.
// Usage: node scripts/prepare-auth-images.cjs <landscape-png> <portrait-png> [business]
const sharp = require('sharp');
const fs = require('node:fs/promises');
const path = require('node:path');

async function main() {
  const [desktop, mobile, audience] = process.argv.slice(2);
  if (!desktop || !mobile) throw new Error('Supply landscape and portrait source paths.');
  if (audience && audience !== 'business') throw new Error('Unknown artwork audience.');
  const output = path.join(__dirname, '../apps/web/public/images/auth');
  await fs.mkdir(output, { recursive: true });
  for (const [kind, source, widths, ratio] of [
    ['desktop', desktop, [1280, 1920, 2560, 3840], 16 / 9],
    ['mobile', mobile, [480, 960, 2160], 9 / 16],
  ]) {
    for (const width of widths) {
      const name = `loqme-${audience ? `${audience}-` : ''}${kind}-${width}.webp`;
      const result = await sharp(source).resize(width, Math.round(width / ratio), { fit: 'cover', kernel: 'lanczos3' }).webp({ quality: 86, effort: 6 }).toFile(path.join(output, name));
      console.log(`${name}: ${result.width}x${result.height}, ${Math.round(result.size / 1024)} KiB`);
    }
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
