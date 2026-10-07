// Derive Android artwork from the official vector. No separate brand design.
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

async function generate() {
  const source = await fs.readFile('apps/web/public/favicon.svg', 'utf8');
  const mark = source.match(/<path[^>]*\sd="([^"]+)"[^>]*\/>/)[1];
  const root = 'android/app/src/main/res';
  // Artwork occupies at most 66dp of the 108dp adaptive canvas.
  const vector = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">
    <group android:translateX="21" android:translateY="21" android:scaleX="0.12890625" android:scaleY="0.12890625">
        <path android:fillColor="#1F646D" android:pathData="${mark}" />
    </group>
</vector>
`;
  await fs.writeFile(path.join(root, 'drawable/ic_launcher_foreground.xml'), vector);
  const densities = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
  for (const [density, size] of Object.entries(densities)) {
    const inset = Math.round(size * .12);
    const foreground = await sharp(Buffer.from(source)).resize(size - inset * 2).png().toBuffer();
    const icon = await sharp({ create: { width: size, height: size, channels: 4, background: '#ffffff' } })
      .composite([{ input: foreground, left: inset, top: inset }]).png().toBuffer();
    const roundMask = Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`);
    const folder = path.join(root, `mipmap-${density}`);
    await fs.writeFile(path.join(folder, 'ic_launcher.png'), icon);
    await sharp(icon).composite([{ input: roundMask, blend: 'dest-in' }]).png().toFile(path.join(folder, 'ic_launcher_round.png'));
  }
}
generate().catch(error => { console.error(error); process.exitCode = 1; });
