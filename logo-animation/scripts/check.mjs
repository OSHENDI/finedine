// Re-composites all layers to verify the split; writes previews to out/.
import sharp from 'sharp';
import L from '../src/layers.json' with { type: 'json' };
const ov = (list) => list.map((l) => ({ input: 'public/' + l.src, left: l.x, top: l.y }));
const flat = async (bg, list, file, crop) => {
  const buf = await sharp({ create: { width: L.width, height: L.height, channels: 3, background: bg } }).composite(ov(list)).png().toBuffer();
  await (crop ? sharp(buf).extract(crop) : sharp(buf)).toFile(file);
};
const cream = { r: L.bg[0], g: L.bg[1], b: L.bg[2] }, dark = { r: 30, g: 30, b: 40 };
await flat(cream, [...L.confetti, L.badge, L.swirl, ...L.letters, ...L.tagline], 'out/recomposite.png');
await flat(dark, [L.badge, L.swirl, ...L.letters, ...L.tagline], 'out/logo-on-dark.png', { left: 380, top: 280, width: 1240, height: 1340 });
await flat(dark, [L.swirl], 'out/swirl-on-dark.png', { left: 580, top: 280, width: 840, height: 640 });
