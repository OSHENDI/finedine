import { useMemo } from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { CameraMotionBlur } from '@remotion/motion-blur';
import { getLength, getPointAtLength } from '@remotion/paths';
import V from './vectors.json';
import S from './spines.json';

// ---------------------------------------------------------------------------
// Frame & palette
// ---------------------------------------------------------------------------
const ANCHOR = { x: 1000, y: 948 }; // centre of the lockup, source px
const UNITS_W = 1588; // source px visible across the frame (lockup ~70% of width)
const CREAM = `rgb(${V.bg.join(',')})`;
const PINK = '#ec6a9a';
const YELLOW = '#ffd102';
const HIGHLIGHT = '#fee980';
const TIP = { x: 1030, y: 1208 }; // point of the pin

// ---------------------------------------------------------------------------
// Timing — frames @ 60fps
// ---------------------------------------------------------------------------
const T = {
  outline: [4, 56],
  flood: [36, 92],
  strokeOut: [82, 96],
  swirlA: [60, 118],
  swirlB: [82, 134],
  word: { start: 104, stagger: 3.5, dur: 48 },
  dotDelay: 20,
  dotDur: 30,
  tag: { start: 142, dur: 62, stagger: 1.6 },
  camera: [0, 240],
} as const;

const EASE = {
  draw: Easing.bezier(0.45, 0, 0.25, 1),
  flood: Easing.bezier(0.45, 0, 0.15, 1),
  pour: Easing.bezier(0.5, 0, 0.2, 1),
  settle: Easing.bezier(0.16, 1, 0.3, 1),
  camera: Easing.bezier(0.3, 0, 0.15, 1),
};

const prog = (f: number, a: number, b: number, e: (t: number) => number) =>
  interpolate(f, [a, b], [0, 1], { easing: e, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------
type Pt = [number, number];

// Catmull-Rom through the points as a cubic bezier path
const smoothPath = (p: Pt[]) => {
  let d = `M ${p[0][0]} ${p[0][1]}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[Math.max(0, i - 1)], p1 = p[i], p2 = p[i + 1], p3 = p[Math.min(p.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${p2[0]} ${p2[1]}`;
  }
  return d;
};

// Spines of the two soft-serve strokes, traced off the artwork (source px)
const SPINE_A = smoothPath(S.A as Pt[]);
const SPINE_B = smoothPath(S.B as Pt[]);

// Dash pattern that shows [start, end] intervals of a closed path (wrapping past 0)
const dashFor = (len: number, centre: number, half: number) => {
  if (half <= 0) return { dash: `0 ${len * 2}`, offset: 0 };
  if (half >= len / 2) return { dash: `${len * 2} 0`, offset: 0 };
  const a = centre - half, b = centre + half;
  const ivs: [number, number][] = [];
  if (a < 0) ivs.push([0, b], [len + a, len]);
  else if (b > len) ivs.push([0, b - len], [a, len]);
  else ivs.push([a, b]);
  ivs.sort((x, y) => x[0] - y[0]);
  const parts: number[] = [];
  let cur = 0;
  if (ivs[0][0] > 0) parts.push(0, ivs[0][0]), (cur = ivs[0][0]);
  ivs.forEach(([s, e], i) => {
    if (s > cur) parts.push(0, s - cur);
    parts.push(e - s);
    const next = ivs[i + 1]?.[0] ?? len * 2;
    parts.push(next - e);
    cur = next;
  });
  return { dash: parts.join(' '), offset: 0 };
};

// Deterministic noise
const rnd = (i: number, k: number) => {
  const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// Confetti: original marks plus mirrored copies to fill the taller 9:16 frame
type Mark = (typeof V.confetti)[number] & { x: number; y: number; flip: boolean };
const SHIFT = 760;
const MARKS: Mark[] = [
  ...V.confetti.map((c) => ({ ...c, x: c.cx, y: c.cy, flip: false })),
  ...V.confetti.filter((c) => c.cy < ANCHOR.y).map((c) => ({ ...c, x: 2000 - c.cx, y: c.cy - SHIFT, flip: true })).filter((c) => c.y < 40),
  ...V.confetti.filter((c) => c.cy > ANCHOR.y).map((c) => ({ ...c, x: 2000 - c.cx, y: c.cy + SHIFT, flip: true })).filter((c) => c.y > 1650),
];

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------
const Scene: React.FC<{ f: number }> = ({ f }) => {
  const { width, height, fps } = useVideoConfig();
  const unitsH = (UNITS_W * height) / width;

  const geo = useMemo(() => {
    const len = getLength(V.badge.outline);
    // arc position of the pin's tip on the outline
    let best = 0, bestD = Infinity;
    for (let i = 0; i < 800; i++) {
      const at = (len * i) / 800;
      const p = getPointAtLength(V.badge.outline, at);
      if (!p) continue;
      const dd = (p.x - TIP.x) ** 2 + (p.y - TIP.y) ** 2;
      if (dd < bestD) (bestD = dd), (best = at);
    }
    return { len, tipAt: best, lenA: getLength(SPINE_A), lenB: getLength(SPINE_B) };
  }, []);

  const t = f / fps;
  const cam = prog(f, T.camera[0], T.camera[1], EASE.camera);
  const logoScale = 1.035 - 0.035 * cam;
  const confettiScale = 1.075 - 0.075 * cam; // nearer layer moves more: depth

  // Pin: outline draws out of the tip both ways, fill blooms from the tip
  const draw = prog(f, T.outline[0], T.outline[1], EASE.draw);
  const dash = dashFor(geo.len, geo.tipAt, (draw * geo.len) / 2);
  const flood = prog(f, T.flood[0], T.flood[1], EASE.flood);
  const strokeAlpha = 1 - prog(f, T.strokeOut[0], T.strokeOut[1], Easing.linear);

  // Swirl: two pours along their spines
  const pa = prog(f, T.swirlA[0], T.swirlA[1], EASE.pour);
  const pb = prog(f, T.swirlB[0], T.swirlB[1], EASE.pour);

  // Lettering
  const baseline = Math.max(...V.letters.map((l) => l.y1)) + 1.5;
  const tagMid = (V.tagline[0].x0 + V.tagline[V.tagline.length - 1].x1) / 2;
  const tagCentreIdx = (V.tagline.length - 1) / 2;

  const scaleAbout = (s: number, x = ANCHOR.x, y = ANCHOR.y) => `translate(${x} ${y}) scale(${s}) translate(${-x} ${-y})`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`${ANCHOR.x - UNITS_W / 2} ${ANCHOR.y - unitsH / 2} ${UNITS_W} ${unitsH}`}
      style={{ position: 'absolute', inset: 0 }}
    >
      <defs>
        <radialGradient id="floodGrad">
          <stop offset="0.992" stopColor="#fff" />
          <stop offset="1" stopColor="#000" />
        </radialGradient>
        <mask id="flood" maskUnits="userSpaceOnUse" x="0" y="0" width="2000" height="2000">
          <circle cx={TIP.x} cy={TIP.y} r={Math.max(0.01, flood * 1000)} fill="url(#floodGrad)" />
        </mask>
        <filter id="soft" filterUnits="userSpaceOnUse" x="0" y="0" width="2000" height="2000">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
        <mask id="pourA" maskUnits="userSpaceOnUse" x="0" y="0" width="2000" height="2000">
          <rect x="0" y="0" width="2000" height="2000" fill="#fff" opacity={interpolate(pa, [0.93, 1], [0, 1], { extrapolateLeft: 'clamp' })} />
          <path d={SPINE_A} fill="none" stroke="#fff" strokeWidth={S.widthA} strokeLinecap="round" filter="url(#soft)"
            strokeDasharray={`${geo.lenA} ${geo.lenA}`} strokeDashoffset={geo.lenA * (1 - pa)} opacity={pa > 0 ? 1 : 0} />
        </mask>
        <mask id="pourB" maskUnits="userSpaceOnUse" x="0" y="0" width="2000" height="2000">
          <rect x="0" y="0" width="2000" height="2000" fill="#fff" opacity={interpolate(pb, [0.93, 1], [0, 1], { extrapolateLeft: 'clamp' })} />
          <path d={SPINE_B} fill="none" stroke="#fff" strokeWidth={S.widthB} strokeLinecap="round" filter="url(#soft)"
            strokeDasharray={`${geo.lenB} ${geo.lenB}`} strokeDashoffset={geo.lenB * (1 - pb)} opacity={pb > 0 ? 1 : 0} />
          {/* the stroke's round start sits close to the curl; keep the curl hidden until the pour gets there */}
          <circle cx="1000" cy="535" fill="#000" r={44 * (1 - interpolate(pb, [0.62, 0.76], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }))} />
        </mask>
        <clipPath id="partA"><path d={V.swirlParts[0].d} clipRule="evenodd" /></clipPath>
        <clipPath id="partB"><path d={V.swirlParts[1].d} clipRule="evenodd" /></clipPath>
        <clipPath id="wordLine"><rect x="300" y="1100" width="1400" height={baseline - 1100} /></clipPath>
      </defs>

      <rect x="-2000" y="-2000" width="6000" height="6000" fill={CREAM} />

      {/* background marks: always present, drifting slowly */}
      <g transform={scaleAbout(confettiScale)}>
        {MARKS.map((m, i) => {
          const period = 3.4 + rnd(i, 1) * 2.2;
          const ph = rnd(i, 2) * Math.PI * 2;
          const amp = 4 + rnd(i, 3) * 5;
          const dx = Math.cos((t * 2 * Math.PI) / (period * 1.3) + ph) * amp * 0.6;
          const dy = Math.sin((t * 2 * Math.PI) / period + ph) * amp;
          const rot = Math.sin((t * 2 * Math.PI) / (period * 1.7) + ph) * 4;
          return (
            <path
              key={i}
              d={m.d}
              fill={m.color}
              fillRule="evenodd"
              opacity={m.opacity}
              transform={`translate(${m.x + dx} ${m.y + dy}) rotate(${rot}) scale(${m.flip ? -1 : 1} 1) translate(${-m.cx} ${-m.cy})`}
            />
          );
        })}
      </g>

      <g transform={scaleAbout(logoScale)}>
        {/* pin */}
        <path d={V.badge.d} fill={PINK} fillRule="evenodd" mask="url(#flood)" />
        <path
          d={V.badge.outline}
          fill="none"
          stroke={PINK}
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={dash.dash}
          strokeDashoffset={dash.offset}
          opacity={draw > 0 ? strokeAlpha : 0}
        />

        {/* soft-serve */}
        {(['A', 'B'] as const).map((k, i) => (
          <g key={k} clipPath={`url(#part${k})`} mask={`url(#pour${k})`}>
            <path d={V.swirlParts[i].d} fill={YELLOW} fillRule="evenodd" />
            <path d={V.swirlHL.d} fill={HIGHLIGHT} fillRule="evenodd" />
          </g>
        ))}

        {/* "families": each glyph rises out of the baseline */}
        <g clipPath="url(#wordLine)">
          {V.letters.map((l, i) => {
            const from = T.word.start + i * T.word.stagger;
            const p = prog(f, from, from + T.word.dur, EASE.settle);
            const rise = (1 - p) * (l.y1 - l.y0 + 24);
            return <path key={i} d={l.d} fill={PINK} fillRule="evenodd" transform={`translate(0 ${rise})`} />;
          })}
        </g>
        {V.letters.map((l, i) => {
          if (!l.dot) return null;
          const from = T.word.start + i * T.word.stagger + T.dotDelay;
          const p = prog(f, from, from + T.dotDur, EASE.settle);
          const cx = (l.dot.x0 + l.dot.x1) / 2, cy = (l.dot.y0 + l.dot.y1) / 2;
          return (
            <path key={`dot${i}`} d={l.dot.d} fill={PINK} fillRule="evenodd" opacity={Math.min(1, p * 2.5)}
              transform={`translate(0 ${(1 - p) * -26}) ${scaleAbout(0.35 + 0.65 * p, cx, cy)}`} />
          );
        })}

        {/* tagline: letter-spacing settles in from the centre outward */}
        {V.tagline.map((l, i) => {
          const from = T.tag.start + Math.abs(i - tagCentreIdx) * T.tag.stagger;
          const p = prog(f, from, from + T.tag.dur, EASE.settle);
          const cx = (l.x0 + l.x1) / 2;
          const dx = (cx - tagMid) * 0.42 * (1 - p);
          const op = interpolate(f, [from, from + T.tag.dur * 0.45], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad) });
          return <path key={i} d={l.d} fill={PINK} fillRule="evenodd" opacity={op} transform={`translate(${dx} ${(1 - p) * 10})`} />;
        })}
      </g>
    </svg>
  );
};

export const FamiliesLogo: React.FC<{ motionBlur: boolean }> = ({ motionBlur }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: CREAM }}>
      {motionBlur ? (
        <CameraMotionBlur shutterAngle={180} samples={8}>
          <SceneAtFrame />
        </CameraMotionBlur>
      ) : (
        <Scene f={f} />
      )}
    </AbsoluteFill>
  );
};

// CameraMotionBlur re-renders children at sub-frame times; read the frame inside it
const SceneAtFrame: React.FC = () => <Scene f={useCurrentFrame()} />;
