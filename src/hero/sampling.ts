export type Rng = () => number;

/** Small seeded generator so tests are deterministic. Production passes Math.random. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export interface Sampled {
  pos: Float32Array;
  col: Float32Array;
}

/**
 * Importance-sampled portrait. Uniform sampling spends points in proportion to area, so a
 * flat cheek gets as many points as an eye and the face turns to mush. Weighting by local
 * gradient sends points where detail lives; a vertical prior keeps the face ahead of the
 * shoulders. Output has image height 1, centred at the origin, y up. Depth comes from
 * luminance, scaled so that it is ±0.22 world units once the portrait is scaled to height 5.
 */
export function samplePortrait(
  rgba: Uint8ClampedArray, w: number, h: number, n: number, rng: Rng = Math.random,
): Sampled {
  const size = w * h;
  const lum = new Float32Array(size);
  for (let p = 0, i = 0; p < size; p++, i += 4) {
    lum[p] = (rgba[i + 3] ?? 0) > 120
      ? ((rgba[i] ?? 0) * 0.299 + (rgba[i + 1] ?? 0) * 0.587 + (rgba[i + 2] ?? 0) * 0.114) / 255
      : -1;
  }

  const grad = new Float32Array(size);
  let maxG = 1e-6;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const k = y * w + x;
      const c = lum[k] ?? -1;
      if (c < 0) continue;
      const l = lum[k - 1] ?? -1, r = lum[k + 1] ?? -1, u = lum[k - w] ?? -1, d = lum[k + w] ?? -1;
      const gx = (r < 0 ? c : r) - (l < 0 ? c : l);
      const gy = (d < 0 ? c : d) - (u < 0 ? c : u);
      const g = Math.hypot(gx, gy);
      grad[k] = g;
      if (g > maxG) maxG = g;
    }
  }

  const cdf = new Float64Array(size);
  let total = 0;
  for (let q = 0; q < size; q++) {
    let wgt = 0;
    if ((lum[q] ?? -1) >= 0) {
      const yy = Math.floor(q / w) / h;
      const prior = 1 - smoothstep(0.35, 1, yy) * 0.45;
      wgt = (0.22 + 0.78 * ((grad[q] ?? 0) / maxG)) * prior;
    }
    total += wgt;
    cdf[q] = total;
  }

  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const sc = 1 / h;
  for (let m = 0; m < n; m++) {
    const r = rng() * total;
    let lo = 0, hi = size - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if ((cdf[mid] ?? 0) < r) lo = mid + 1;
      else hi = mid;
    }
    const px = lo % w, py = Math.floor(lo / w), si = lo * 4;
    pos[m * 3] = (px + 0.5 - w / 2) * sc;
    pos[m * 3 + 1] = (h / 2 - py - 0.5) * sc;
    pos[m * 3 + 2] = ((lum[lo] ?? 0.5) - 0.5) * 0.044 + (rng() - 0.5) * 0.006;
    col[m * 3] = Math.pow((rgba[si] ?? 0) / 255, 1.08);
    col[m * 3 + 1] = Math.pow((rgba[si + 1] ?? 0) / 255, 1.08);
    col[m * 3 + 2] = Math.pow((rgba[si + 2] ?? 0) / 255, 1.08);
  }
  return { pos, col };
}

/** Indexes of pixels whose alpha exceeds the threshold. */
export function alphaCandidates(rgba: Uint8ClampedArray, w: number, h: number, threshold = 140): Uint32Array {
  const out: number[] = [];
  for (let p = 0, i = 3; p < w * h; p++, i += 4) if ((rgba[i] ?? 0) > threshold) out.push(p);
  return Uint32Array.from(out);
}

/** Uniform samples over the candidate pixels. Height 1, centred, y up. */
export function sampleMask(cand: Uint32Array, w: number, h: number, n: number, rng: Rng = Math.random): Float32Array {
  const pos = new Float32Array(n * 3);
  if (cand.length === 0) return pos;
  const sc = 1 / h;
  for (let m = 0; m < n; m++) {
    const k = cand[Math.floor(rng() * cand.length)] ?? 0;
    pos[m * 3] = ((k % w) + 0.5 - w / 2) * sc;
    pos[m * 3 + 1] = (h / 2 - Math.floor(k / w) - 0.5) * sc;
    pos[m * 3 + 2] = (rng() - 0.5) * 0.03;
  }
  return pos;
}

export interface Vec2 {
  x: number;
  y: number;
}

/** 55% of points cluster on nodes, the rest scatter along edges. Units are whatever the nodes use. */
export function sampleConstellation(
  n: number, nodes: Vec2[], edges: [number, number][], nodeRadius: number, rng: Rng = Math.random,
): Float32Array {
  const pos = new Float32Array(n * 3);
  if (nodes.length === 0) return pos;
  const jitter = nodeRadius * 0.13;
  for (let k = 0; k < n; k++) {
    const o = k * 3;
    if (edges.length === 0 || rng() < 0.55) {
      const nd = nodes[Math.floor(rng() * nodes.length)] ?? nodes[0]!;
      const r = Math.pow(rng(), 0.6) * nodeRadius;
      const th = rng() * Math.PI * 2;
      pos[o] = nd.x + Math.cos(th) * r;
      pos[o + 1] = nd.y + Math.sin(th) * r * 0.9;
      pos[o + 2] = (rng() - 0.5) * nodeRadius * 0.7;
    } else {
      const e = edges[Math.floor(rng() * edges.length)] ?? edges[0]!;
      const a = nodes[e[0]] ?? nodes[0]!, b = nodes[e[1]] ?? nodes[0]!;
      const t = rng();
      pos[o] = a.x + (b.x - a.x) * t + (rng() - 0.5) * jitter;
      pos[o + 1] = a.y + (b.y - a.y) * t + (rng() - 0.5) * jitter;
      pos[o + 2] = (rng() - 0.5) * nodeRadius * 0.3;
    }
  }
  return pos;
}

/** A horizontal line from x = -0.5 to 0.5 with a hair of vertical jitter. */
export function sampleLine(n: number, rng: Rng = Math.random): Float32Array {
  const pos = new Float32Array(n * 3);
  for (let k = 0; k < n; k++) {
    pos[k * 3] = rng() - 0.5;
    pos[k * 3 + 1] = (rng() - 0.5) * 0.006;
    pos[k * 3 + 2] = (rng() - 0.5) * 0.02;
  }
  return pos;
}
