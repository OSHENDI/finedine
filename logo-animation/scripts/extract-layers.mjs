// Splits source.jpg into clean animatable layers (unblended against the cream background):
// confetti sprites, badge (pink), swirl (yellow), "families" letters, tagline letters.
// Writes PNGs to public/layers and a manifest to src/layers.json.
import sharp from 'sharp';
import fs from 'node:fs';

const OUT = 'public/layers';
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const { data, info } = await sharp('source.jpg').raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, C = info.channels, N = W * H;
const BG = [255, 253, 240];
const PINK = [236, 106, 154];
const YELLOW = [255, 209, 2];

const px = (i) => [data[i * C], data[i * C + 1], data[i * C + 2]];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

// --- 1. logo coverage: projection toward pink from cream, full inside solid areas
const d = new Float32Array(N);
for (let i = 0; i < N; i++) d[i] = dist(px(i), BG);
const PINK_D = dist(PINK, BG);
const solid = new Uint8Array(N);
for (let i = 0; i < N; i++) solid[i] = d[i] > 70 ? 1 : 0; // confetti is pale, logo is not

// connected components (4-neighbour) on a mask
function label(mask) {
  const lab = new Int32Array(N).fill(-1);
  const comps = [];
  const stack = new Int32Array(N);
  for (let s = 0; s < N; s++) {
    if (!mask[s] || lab[s] !== -1) continue;
    const id = comps.length;
    let sp = 0, n = 0, x0 = W, y0 = H, x1 = 0, y1 = 0;
    stack[sp++] = s; lab[s] = id;
    while (sp) {
      const p = stack[--sp]; n++;
      const x = p % W, y = (p / W) | 0;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      const nb = [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1];
      for (const q of nb) if (q >= 0 && mask[q] && lab[q] === -1) { lab[q] = id; stack[sp++] = q; }
    }
    comps.push({ id, n, x0, y0, x1, y1 });
  }
  return { lab, comps };
}

function dilate(mask, r) {
  let cur = mask;
  for (let k = 0; k < r; k++) {
    const nx = new Uint8Array(N);
    for (let p = 0; p < N; p++) {
      if (cur[p]) { nx[p] = 1; continue; }
      const x = p % W;
      if ((x > 0 && cur[p - 1]) || (x < W - 1 && cur[p + 1]) || (p >= W && cur[p - W]) || (p < N - W && cur[p + W])) nx[p] = 1;
    }
    cur = nx;
  }
  return cur;
}

// keep only big solid components = logo parts (drops JPEG specks and stray marks)
const solidLab = label(solid);
const logoCore = new Uint8Array(N);
for (let p = 0; p < N; p++) {
  const l = solidLab.lab[p];
  if (l >= 0 && solidLab.comps[l].n > 150) logoCore[p] = 1;
}
const logoZone = dilate(logoCore, 3); // anti-aliased rim belongs to the logo

// alpha + straight colour for logo pixels
const la = new Float32Array(N);
for (let p = 0; p < N; p++) {
  if (!logoZone[p]) continue;
  if (logoCore[p]) { la[p] = 1; continue; }
  const c = px(p);
  // edge pixels: project onto cream->pink (only pink touches cream)
  const v = [PINK[0] - BG[0], PINK[1] - BG[1], PINK[2] - BG[2]];
  const t = ((c[0] - BG[0]) * v[0] + (c[1] - BG[1]) * v[1] + (c[2] - BG[2]) * v[2]) / (PINK_D * PINK_D);
  la[p] = clamp01((t - 0.06) / 0.94);
}

// --- 2. regions
const BADGE_Y1 = 1212, TEXT_Y0 = 1212, TEXT_Y1 = 1500, TAG_Y0 = 1500;
const SWIRL_Y1 = 862; // swirl sits fully above the cone

function writeLayer(name, rgba, box) {
  const { x0, y0, x1, y1 } = box;
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const buf = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = (y + y0) * W + (x + x0), o = (y * w + x) * 4;
    const r = rgba(p);
    if (!r) continue;
    buf[o] = r[0]; buf[o + 1] = r[1]; buf[o + 2] = r[2]; buf[o + 3] = Math.round(clamp01(r[3]) * 255);
  }
  return sharp(buf, { raw: { width: w, height: h, channels: 4 } }).png({ compressionLevel: 9 }).toFile(`${OUT}/${name}.png`)
    .then(() => ({ src: `layers/${name}.png`, x: x0, y: y0, w, h }));
}

const pad = (b, k = 2) => ({ x0: Math.max(0, b.x0 - k), y0: Math.max(0, b.y0 - k), x1: Math.min(W - 1, b.x1 + k), y1: Math.min(H - 1, b.y1 + k) });
function bbox(test) {
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let p = 0; p < N; p++) if (test(p)) {
    const x = p % W, y = (p / W) | 0;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1 };
}
const yOf = (p) => (p / W) | 0;

// yellow scoop core; the swirl layer lives only near it
const yCore = new Uint8Array(N);
for (let p = 0; p < N; p++) { const c = px(p); if (c[1] > 170 && c[2] < 60 && yOf(p) <= SWIRL_Y1) yCore[p] = 1; }
const swirlZone = dilate(yCore, 14);

// swirl amount: 0 = pink, 1 = yellow (G channel separates them; highlights read as yellow)
const swirlT = (p) => {
  if (!swirlZone[p] || !logoCore[p]) return 0;
  const c = px(p);
  // pink-to-cream blends keep a high blue channel; yellow and its highlights do not
  return clamp01((c[1] - PINK[1]) / (YELLOW[1] - PINK[1])) * clamp01((168 - c[2]) / 24);
};

const manifest = { width: W, height: H, bg: BG, letters: [], tagline: [], confetti: [] };

// badge: pink silhouette, pink fill under the swirl
const inBadge = (p) => yOf(p) < BADGE_Y1 && la[p] > 0;
manifest.badge = await writeLayer('badge', (p) => {
  if (!inBadge(p)) return null;
  // the source has a small stray lump on the badge's top edge; trim it back to the arc
  const top = clamp01((yOf(p) - 312) / 5);
  return [...PINK, (swirlT(p) > 0 ? 1 : la[p]) * top];
}, pad(bbox(inBadge)));

// swirl: unblended from pink
const inSwirl = (p) => swirlT(p) > 0.02;
manifest.swirl = await writeLayer('swirl', (p) => {
  const t = swirlT(p);
  if (t <= 0.02) return null;
  const c = px(p);
  if (t >= 0.98) return [...c, 1];
  return [0, 1, 2].map((k) => Math.round(Math.max(0, Math.min(255, (c[k] - (1 - t) * PINK[k]) / t)))).concat(t);
}, pad(bbox(inSwirl)));

// swirl highlight stripes (pale yellow inside the scoop). Core = brighter than the yellow;
// grown 4px so its pink-side edge overshoots and is trimmed by the swirl outline at render time.
const hlCore = new Uint8Array(N);
for (let p = 0; p < N; p++) { const c = px(p); if (swirlZone[p] && c[1] > 222 && c[2] > 80 && c[0] > 235) hlCore[p] = 1; }
const hlZone = dilate(hlCore, 4);
manifest.swirlHL = await writeLayer('swirl-hl', (p) => {
  if (!hlZone[p]) return null;
  const c = px(p);
  // fade toward the solid yellow (blue channel ~0); pink side stays opaque
  const a = c[1] < 200 ? 1 : clamp01((c[2] - 30) / 60);
  return a > 0 ? [254, 233, 128, a] : null;
}, pad(bbox(inSwirl)));

// letters: one layer per glyph; i-dots join their stems. Each layer holds only its own
// components (+3px anti-aliased rim) so neighbouring glyphs never leak into each other.
async function lettersIn(y0, y1, prefix) {
  const mask = new Uint8Array(N);
  for (let p = 0; p < N; p++) { const y = yOf(p); if (y >= y0 && y < y1 && logoCore[p]) mask[p] = 1; }
  const { lab, comps } = label(mask);
  const groups = [];
  for (const c of comps.filter((c) => c.n > 20).sort((a, b) => a.x0 - b.x0)) {
    // join marks stacked above/below a glyph (i-dots) or nested inside its span; neighbours that merely overlap stay apart
    const stacked = (g) => c.x0 <= g.x1 - 2 && c.x1 >= g.x0 + 2 && (c.y1 < g.y0 || c.y0 > g.y1);
    const nested = (g) => (c.x0 >= g.x0 - 4 && c.x1 <= g.x1 + 4) || (g.x0 >= c.x0 - 4 && g.x1 <= c.x1 + 4);
    const g = groups.find((g) => stacked(g) || nested(g));
    if (g) Object.assign(g, { x0: Math.min(g.x0, c.x0), x1: Math.max(g.x1, c.x1), y0: Math.min(g.y0, c.y0), y1: Math.max(g.y1, c.y1), ids: [...g.ids, c.id] });
    else groups.push({ ...c, ids: [c.id] });
  }
  const out = [];
  for (const [k, g] of groups.entries()) {
    const own = new Uint8Array(N);
    for (let p = 0; p < N; p++) if (lab[p] >= 0 && g.ids.includes(lab[p])) own[p] = 1;
    const zone = dilate(own, 3);
    out.push(await writeLayer(`${prefix}-${k}`, (p) => (zone[p] && la[p] > 0 ? [...PINK, la[p]] : null), pad(g, 4)));
  }
  return out;
}
manifest.letters = await lettersIn(TEXT_Y0, TEXT_Y1, 'word');
manifest.tagline = await lettersIn(TAG_Y0, H, 'tag');

// --- 3. confetti: pale marks away from the logo, each its own sprite
const near = dilate(logoZone, 6);
const pale = new Uint8Array(N);
for (let p = 0; p < N; p++) if (d[p] > 6 && !logoZone[p]) pale[p] = 1;
const conf = label(pale);
let ci = 0;
for (const c of conf.comps) {
  if (c.n < 120) continue; // specks / jpeg noise
  if (c.x0 < 90 || c.y0 < 90 || c.y1 > 1590) continue; // clipped by the source pattern frame
  // skip marks bitten by the logo (they would show a hole once the logo is gone)
  let touches = false, peak = 0, peakP = -1;
  for (let y = c.y0; y <= c.y1 && !touches; y++) for (let x = c.x0; x <= c.x1; x++) {
    const p = y * W + x;
    if (conf.lab[p] !== c.id) continue;
    if (near[p]) { touches = true; break; }
    if (d[p] > peak) { peak = d[p]; peakP = p; }
  }
  if (touches) continue;
  const tone = px(peakP);
  const toneD = dist(tone, BG);
  const id = c.id;
  manifest.confetti.push(await writeLayer(`confetti-${ci++}`, (p) => {
    if (conf.lab[p] !== id) return null;
    return [...tone, clamp01(d[p] / toneD)];
  }, pad(c, 2)));
}

fs.writeFileSync('src/layers.json', JSON.stringify(manifest, null, 1));
console.log('badge', manifest.badge, 'swirl', manifest.swirl);
console.log('letters', manifest.letters.length, 'tagline', manifest.tagline.length, 'confetti', manifest.confetti.length);
