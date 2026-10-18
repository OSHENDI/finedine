// Traces every raster layer from src/layers.json into SVG paths (source-pixel coordinates)
// so the logo renders razor sharp at 4K and can be animated as real paths.
// Writes src/vectors.json.
import sharp from 'sharp';
import potrace from 'potrace';
import fs from 'node:fs';
import L from '../src/layers.json' with { type: 'json' };

const UP = 3; // trace at 3x for smooth curves
const PAD = 12;

// blur (source px) irons out JPEG wobble before tracing
async function trace(layer, cutoff = 0.5, blur = 1) {
  const { data, info } = await sharp('public/' + layer.src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  // alpha -> black-on-white, peak-normalised (confetti marks are pale)
  let peak = 0;
  for (let i = 3; i < data.length; i += 4) peak = Math.max(peak, data[i]);
  const g = Buffer.alloc(info.width * info.height);
  for (let i = 0; i < g.length; i++) g[i] = 255 - Math.round((data[i * 4 + 3] / peak) * 255);
  // sharp always applies extend after resize, so pad in its own pass
  const padded = await sharp(g, { raw: { width: info.width, height: info.height, channels: 1 } })
    .extend({ top: PAD, bottom: PAD, left: PAD, right: PAD, background: '#ffffff' })
    .png().toBuffer();
  const png = await sharp(padded)
    .resize((info.width + PAD * 2) * UP, (info.height + PAD * 2) * UP, { kernel: 'cubic' })
    .blur(blur * UP)
    .png().toBuffer();
  const tag = await new Promise((res, rej) => {
    const t = new potrace.Potrace();
    t.setParameters({ threshold: Math.round(255 * (1 - cutoff)), turdSize: 30, optTolerance: 0.25, alphaMax: 1.0 });
    t.loadImage(png, (err) => (err ? rej(err) : res(t.getPathTag())));
  });
  const d = tag.match(/ d="([^"]+)"/)[1];
  // potrace emits absolute M/L/C only, so every number pair is a point
  let k = 0;
  return d.replace(/-?\d+(\.\d+)?/g, (n) => {
    const v = parseFloat(n) / UP - PAD + (k++ % 2 === 0 ? layer.x : layer.y);
    return v.toFixed(2);
  });
}

// split a compound path (potrace = even-odd) into outer shapes, each with its holes.
// Nesting is decided by point-in-polygon, not bounding boxes (the inner swirl sits inside the outer one's box).
function shapes(d) {
  const subs = d.split(/(?=M)/).map((s) => s.trim()).filter(Boolean).map((s) => {
    const nums = s.match(/-?\d+(\.\d+)?/g).map(Number);
    const pts = [];
    for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    return { d: s, pts, x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  });
  const pip = ([x, y], poly) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const depth = (s) => subs.filter((o) => o !== s && pip(s.pts[0], o.pts)).length;
  const outers = subs.filter((s) => depth(s) % 2 === 0);
  return outers.map((o) => {
    const holes = subs.filter((s) => depth(s) % 2 === 1 && pip(s.pts[0], o.pts) && !outers.some((q) => q !== o && pip(s.pts[0], q.pts) && pip(q.pts[0], o.pts)));
    return { d: [o.d, ...holes.map((h) => h.d)].join(' '), outer: o.d, x0: o.x0, x1: o.x1, y0: o.y0, y1: o.y1 };
  });
}

const box = (s) => ({ x0: s.x0, y0: s.y0, x1: s.x1, y1: s.y1 });

async function glyph(layer) {
  const parts = shapes(await trace(layer)).sort((a, b) => a.y0 - b.y0);
  // i-dots: a small shape sitting entirely above the stem
  const body = parts.filter((p) => !(parts.length > 1 && p === parts[0] && p.y1 < parts[1].y0));
  const dot = parts.length > 1 && parts[0].y1 < parts[1].y0 ? parts[0] : null;
  const all = body.concat(dot ? [dot] : []);
  return {
    d: body.map((p) => p.d).join(' '),
    dot: dot ? { d: dot.d, ...box(dot) } : null,
    x0: Math.min(...all.map((p) => p.x0)), x1: Math.max(...all.map((p) => p.x1)),
    y0: Math.min(...body.map((p) => p.y0)), y1: Math.max(...body.map((p) => p.y1)),
  };
}

const out = { bg: L.bg };
const badge = shapes(await trace(L.badge));
const main = badge.sort((a, b) => (b.x1 - b.x0) * (b.y1 - b.y0) - (a.x1 - a.x0) * (a.y1 - a.y0))[0];
out.badge = { d: badge.map((s) => s.d).join(' '), outline: main.outer, ...box(main) };
const swirlD = await trace(L.swirl, 0.5, 2.5);
out.swirl = { d: swirlD, ...box(shapes(swirlD)[0]) };
// two strokes of soft-serve: outer (tail -> drip) and inner curl
out.swirlParts = shapes(swirlD).filter((s) => (s.x1 - s.x0) * (s.y1 - s.y0) > 5000).sort((a, b) => a.x0 - b.x0).map((s) => ({ d: s.d, ...box(s) }));
out.swirlHL = { d: await trace(L.swirlHL, 0.5, 6) };
out.letters = [];
for (const l of L.letters) out.letters.push(await glyph(l));
out.tagline = [];
for (const l of L.tagline) out.tagline.push(await glyph(l));

out.confetti = [];
for (const c of L.confetti) {
  const { data } = await sharp('public/' + c.src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let best = 0, col = [0, 0, 0];
  for (let i = 0; i < data.length; i += 4) if (data[i + 3] > best) { best = data[i + 3]; col = [data[i], data[i + 1], data[i + 2]]; }
  const s = shapes(await trace(c));
  out.confetti.push({ d: s.map((x) => x.d).join(' '), color: `rgb(${col.join(',')})`, opacity: +(best / 255).toFixed(3),
    cx: c.x + c.w / 2, cy: c.y + c.h / 2 });
}

fs.writeFileSync('src/vectors.json', JSON.stringify(out));
console.log('badge outline pts', out.badge.outline.length, 'letters', out.letters.map((l) => (l.dot ? 'i' : '.')).join(''),
  'tag', out.tagline.length, 'confetti', out.confetti.length);
