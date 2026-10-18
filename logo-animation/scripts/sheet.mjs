// Contact sheet of out/s<frame>.png stills: node scripts/sheet.mjs 0 20 40 ... > out/sheet.png
import sharp from 'sharp';
const frames = process.argv.slice(2);
const crop = { left: 60, top: 230, width: 420, height: 520 }; // lockup area at 0.25 scale
const tiles = await Promise.all(frames.map((f) => sharp(`out/s${f}.png`).extract(crop).toBuffer()));
const cols = 6, rows = Math.ceil(tiles.length / cols);
await sharp({ create: { width: cols * 430, height: rows * 530, channels: 3, background: '#444' } })
  .composite(tiles.map((t, i) => ({ input: t, left: (i % cols) * 430, top: Math.floor(i / cols) * 530 })))
  .png().toFile('out/sheet.png');
