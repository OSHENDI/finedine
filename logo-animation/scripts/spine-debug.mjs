// Shows swirl pieces vs. pour spines (stroke at mask width) to check coverage.
import sharp from 'sharp';
import fs from 'node:fs';
import V from '../src/vectors.json' with { type: 'json' };
import S from '../src/spines.json' with { type: 'json' };
const smooth = (p) => {
  let d = `M ${p[0][0]} ${p[0][1]}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[Math.max(0, i - 1)], p1 = p[i], p2 = p[i + 1], p3 = p[Math.min(p.length - 1, i + 2)];
    d += ` C ${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]} ${p2[1]}`;
  }
  return d;
};
const [wA, wB] = [S.widthA, S.widthB];
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="750 340 480 520" width="960" height="1040">
<rect x="0" y="0" width="3000" height="3000" fill="#fff"/>
<path d="${V.swirlParts[0].d}" fill="#f4a" fill-rule="evenodd"/><path d="${V.swirlParts[1].d}" fill="#4af" fill-rule="evenodd"/>
<path d="${smooth(S.A)}" fill="none" stroke="#000" stroke-opacity="0.25" stroke-width="${wA}" stroke-linecap="round"/>
<path d="${smooth(S.B)}" fill="none" stroke="#080" stroke-opacity="0.3" stroke-width="${wB}" stroke-linecap="round"/>
<path d="${smooth(S.A)}" fill="none" stroke="#000" stroke-width="1.5"/><path d="${smooth(S.B)}" fill="none" stroke="#060" stroke-width="1.5"/>
</svg>`;
await sharp(Buffer.from(svg)).png().toFile('out/spines.png');
