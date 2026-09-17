# Phase 2: Hero Particle Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mount a measured-quality WebGL particle portrait over the static hero image that dissolves into the name over the thesis, settles onto the SVG graph, disappears through the quiet stretch, and collapses to a line at contact.

**Architecture:** One `Points` mesh with four target position attributes and scroll-driven weights, rendered by imperative three.js in a fixed full-bleed canvas behind `main`. Importance sampling of the portrait runs in a Web Worker; text, constellation and line targets are cheap and run on the main thread. A `"none"` tier below `"minimal"` never loads the chunk. The static image stays in the HTML and is faded out only when the canvas is live.

**Tech Stack:** three 0.186, Web Worker via `new Worker(new URL(..., import.meta.url), { type: "module" })` (bundled by Turbopack), Vitest, Playwright.

**Spec:** [docs/design.md](../design.md) section 7 and [docs/build-spec.md](../build-spec.md) section 5. Reference implementation: [docs/hero-reference.html](../hero-reference.html). The algorithm carries over unchanged; only the packaging differs.

## Global Constraints

- Everything in Phase 1 keeps working with the chunk absent. No content moves into client code.
- `prefers-reduced-motion: reduce`: drift off, parallax off, weight changes instant.
- The face is never displaced. Cursor repulsion force is `1 - w0`.
- Tier stepping changes only `setDrawRange` and `setPixelRatio`. Geometry is allocated once.
- No layout reads inside the frame loop. Section rects are cached in document coordinates and combined with `scrollY`.
- Render loop stops on `document.hidden`. Rendering is skipped while the canvas is fully transparent.
- Initial JavaScript on `/` stays under 90 KB gzipped. The hero chunk is lazy.
- Commit messages: `type(scope): summary`, short, no trailer. Adwaith runs git.

## Coordinate conventions

- Sampled targets are **normalised**: the portrait and the text have height 1 and are centred at the origin, y up. The line runs from x = -0.5 to 0.5. The constellation is in world units relative to the visible graph SVG's centre.
- The shader applies a per-target scale (`uS0`, `uS1`, `uS3`) and a per-target world offset (`uOff0` to `uOff3`) before blending. Resizing updates uniforms; only the constellation is rebuilt.
- World units per screen pixel: `2 * 8.2 * tan(21°) / viewportHeight`. World origin is the viewport centre.
- The portrait offset tracks the static image's document rect each frame, so the particles sit exactly on the image at fade-in and scroll with the page until they dissolve.

## File structure

```
src/hero/tiers.ts          pure: TIERS, guessTier, FrameStepper
src/hero/sampling.ts       pure: samplePortrait, alphaCandidates, sampleMask, sampleConstellation, sampleLine, mulberry32
src/hero/scroll.ts         pure: weightsFor(scrollY, layout)
src/hero/shaders.ts        VERTEX, FRAGMENT strings
src/hero/renderer.ts       createRenderer: three.js setup, uniforms, frame(), no React
src/hero/text.ts           rasteriseText on a 2d canvas (DOM)
src/hero/worker.ts         fetch + decode + samplePortrait off the main thread
src/hero/mount.ts          orchestration: hints, worker, targets, layout cache, loop, fallbacks
src/hero/HeroEnhancer.tsx  "use client": idle-loads mount(), renders #hero-stage
src/app/page.tsx           renders <HeroEnhancer /> before <main>
src/styles/globals.css     #hero-stage, main stacking, portrait fade hook
src/components/graph/Graph.module.css, src/components/thesis/Thesis.module.css   data-particles hooks
scripts/budget.mjs         initial JS budget check, run in CI after build
tests/unit/hero-tiers.test.ts, hero-sampling.test.ts, hero-scroll.test.ts
tests/e2e/hero.spec.ts
```

---

### Task 1: Quality tiers and the frame-time stepper

**Files:**
- Create: `src/hero/tiers.ts`, `tests/unit/hero-tiers.test.ts`

**Interfaces:**
- Produces: `TIERS`, `NONE = -1`, `guessTier(hints): number`, `class FrameStepper { constructor(tier: number); tier: number; settled: boolean; push(dtMs): number | null }`. `push` returns the new tier index when it steps down, otherwise null.

- [ ] **Step 1: Failing test**

```ts
// tests/unit/hero-tiers.test.ts
import { describe, expect, it } from "vitest";
import { FrameStepper, NONE, TIERS, guessTier, type DeviceHints } from "@/hero/tiers";

const base: DeviceHints = { memory: 8, cores: 8, finePointer: true, minSide: 900, saveData: false, webgl: true };

describe("guessTier", () => {
  it("picks high for a strong desktop", () => expect(guessTier(base)).toBe(0));
  it("picks balanced for a 4-core laptop", () => expect(guessTier({ ...base, cores: 4, memory: 8 })).toBe(1));
  it("picks light for a 4-core phone", () =>
    expect(guessTier({ ...base, cores: 4, memory: 3, finePointer: false, minSide: 390 })).toBe(2));
  it("picks minimal when little is known", () =>
    expect(guessTier({ ...base, cores: 3, memory: 3, finePointer: false, minSide: 360 })).toBe(3));
  it("returns none for 2 GB, 2 cores, data saver or no webgl", () => {
    expect(guessTier({ ...base, memory: 2 })).toBe(NONE);
    expect(guessTier({ ...base, cores: 2 })).toBe(NONE);
    expect(guessTier({ ...base, saveData: true })).toBe(NONE);
    expect(guessTier({ ...base, webgl: false })).toBe(NONE);
  });
  it("treats unknown memory and cores as 4", () =>
    expect(guessTier({ ...base, memory: undefined, cores: undefined })).toBe(1));
});

describe("FrameStepper", () => {
  const feed = (s: FrameStepper, dt: number, n: number) => {
    const steps: number[] = [];
    for (let i = 0; i < n; i++) {
      const r = s.push(dt);
      if (r !== null) steps.push(r);
    }
    return steps;
  };

  it("ignores the warm-up frames", () => {
    const s = new FrameStepper(0);
    expect(feed(s, 100, 40)).toEqual([]);
    expect(feed(s, 10, 50)).toEqual([]);
    expect(s.settled).toBe(true);
    expect(s.tier).toBe(0);
  });

  it("steps down one tier per slow window until it holds", () => {
    const s = new FrameStepper(0);
    feed(s, 10, 40);
    expect(feed(s, 30, 50)).toEqual([1]);
    expect(feed(s, 30, 50)).toEqual([2]);
    expect(feed(s, 12, 50)).toEqual([]);
    expect(s.settled).toBe(true);
    expect(s.tier).toBe(2);
  });

  it("settles at the floor instead of stepping past it", () => {
    const s = new FrameStepper(TIERS.length - 1);
    feed(s, 10, 40);
    expect(feed(s, 40, 50)).toEqual([]);
    expect(s.settled).toBe(true);
  });

  it("uses the median, so a few spikes do not step down", () => {
    const s = new FrameStepper(0);
    feed(s, 10, 40);
    const steps: number[] = [];
    for (let i = 0; i < 50; i++) {
      const r = s.push(i % 10 === 0 ? 80 : 12);
      if (r !== null) steps.push(r);
    }
    expect(steps).toEqual([]);
    expect(s.settled).toBe(true);
  });
});
```

Run: `pnpm test tests/unit/hero-tiers.test.ts`
Expected: FAIL, cannot resolve `@/hero/tiers`.

- [ ] **Step 2: Implement**

```ts
// src/hero/tiers.ts
export type TierName = "high" | "balanced" | "light" | "minimal";

export interface Tier {
  name: TierName;
  count: number;
  dpr: number;
}

/** From docs/build-spec.md section 5. Allocate once at the guessed tier, then measure and step down. */
export const TIERS: readonly Tier[] = [
  { name: "high", count: 170_000, dpr: 2 },
  { name: "balanced", count: 95_000, dpr: 1.6 },
  { name: "light", count: 46_000, dpr: 1.25 },
  { name: "minimal", count: 20_000, dpr: 1 },
];

/** Below minimal: the chunk is never loaded and the static hero stays. */
export const NONE = -1;

export interface DeviceHints {
  memory: number | undefined;
  cores: number | undefined;
  finePointer: boolean;
  minSide: number;
  saveData: boolean;
  webgl: boolean;
}

export function guessTier(h: DeviceHints): number {
  if (!h.webgl || h.saveData) return NONE;
  const mem = h.memory ?? 4;
  const cores = h.cores ?? 4;
  if (mem <= 2 || cores <= 2) return NONE;
  const wide = h.minSide >= 700;
  if (h.finePointer && wide && cores >= 8 && mem >= 8) return 0;
  if (h.finePointer && wide && cores >= 4) return 1;
  if (cores >= 6 && mem >= 4) return 1;
  if (cores >= 4) return 2;
  return 3;
}

export interface StepperOptions {
  warmup: number;
  window: number;
  budgetMs: number;
}

const DEFAULTS: StepperOptions = { warmup: 40, window: 50, budgetMs: 21 };

/**
 * Feed one frame time per rendered frame. After the warm-up (shader compilation), every
 * `window` frames the median is checked: above budget steps down one tier, at or under
 * budget settles. Never steps up.
 */
export class FrameStepper {
  tier: number;
  settled = false;
  private warm = false;
  private frames: number[] = [];
  private readonly opts: StepperOptions;

  constructor(tier: number, opts: Partial<StepperOptions> = {}) {
    this.tier = tier;
    this.opts = { ...DEFAULTS, ...opts };
  }

  push(dtMs: number): number | null {
    if (this.settled) return null;
    this.frames.push(dtMs);
    if (!this.warm) {
      if (this.frames.length >= this.opts.warmup) {
        this.warm = true;
        this.frames = [];
      }
      return null;
    }
    if (this.frames.length < this.opts.window) return null;
    const sorted = [...this.frames].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
    this.frames = [];
    if (median > this.opts.budgetMs && this.tier < TIERS.length - 1) {
      this.tier += 1;
      return this.tier;
    }
    this.settled = true;
    return null;
  }
}
```

Run: `pnpm test tests/unit/hero-tiers.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 3: Commit**

```bash
git add src/hero/tiers.ts tests/unit/hero-tiers.test.ts
git commit -m "feat(hero): add quality tiers and the frame-time stepper"
git push
```

---

### Task 2: Importance sampling and target generators

**Files:**
- Create: `src/hero/sampling.ts`, `tests/unit/hero-sampling.test.ts`

**Interfaces:**
- Produces: `type Rng = () => number`, `mulberry32(seed)`, `smoothstep(a,b,x)`, `samplePortrait(rgba, w, h, n, rng?): { pos: Float32Array; col: Float32Array }`, `alphaCandidates(rgba, w, h, threshold?): Uint32Array`, `sampleMask(candidates, w, h, n, rng?): Float32Array`, `sampleConstellation(n, nodes: {x,y}[], edges: [number,number][], nodeRadius, rng?): Float32Array`, `sampleLine(n, rng?): Float32Array`. All positions normalised as described in Coordinate conventions.

- [ ] **Step 1: Failing test**

```ts
// tests/unit/hero-sampling.test.ts
import { describe, expect, it } from "vitest";
import {
  alphaCandidates, mulberry32, sampleConstellation, sampleLine, sampleMask, samplePortrait,
} from "@/hero/sampling";

/** 16x16 RGBA. Left half flat grey, right half checkerboard, a transparent 4px border. */
function synthetic() {
  const w = 16, h = 16;
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const inside = x >= 4 && x < 12 && y >= 4 && y < 12;
      const v = x < 8 ? 128 : (x + y) % 2 ? 255 : 0;
      d[i] = v; d[i + 1] = v; d[i + 2] = v; d[i + 3] = inside ? 255 : 0;
    }
  }
  return { d, w, h };
}

const toPixel = (pos: Float32Array, i: number, w: number, h: number) => ({
  x: pos[i * 3]! * h + w / 2,
  y: h / 2 - pos[i * 3 + 1]! * h,
});

describe("samplePortrait", () => {
  it("never lands on a transparent pixel and is deterministic under a seeded rng", () => {
    const { d, w, h } = synthetic();
    const a = samplePortrait(d, w, h, 500, mulberry32(7));
    const b = samplePortrait(d, w, h, 500, mulberry32(7));
    expect(a.pos).toEqual(b.pos);
    for (let i = 0; i < 500; i++) {
      const { x, y } = toPixel(a.pos, i, w, h);
      expect(x).toBeGreaterThanOrEqual(4);
      expect(x).toBeLessThan(12);
      expect(y).toBeGreaterThanOrEqual(4);
      expect(y).toBeLessThan(12);
      expect(Number.isFinite(a.pos[i * 3 + 2]!)).toBe(true);
    }
  });

  it("spends more points where the gradient is", () => {
    const { d, w, h } = synthetic();
    const { pos } = samplePortrait(d, w, h, 4000, mulberry32(1));
    let right = 0;
    for (let i = 0; i < 4000; i++) if (toPixel(pos, i, w, h).x >= 8) right++;
    expect(right / 4000).toBeGreaterThan(0.65);
  });

  it("returns colours in 0..1", () => {
    const { d, w, h } = synthetic();
    const { col } = samplePortrait(d, w, h, 200, mulberry32(3));
    for (const c of col) {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(1);
    }
  });
});

describe("mask sampling", () => {
  it("samples only opaque candidates", () => {
    const { d, w, h } = synthetic();
    const cand = alphaCandidates(d, w, h);
    expect(cand.length).toBe(64);
    const pos = sampleMask(cand, w, h, 300, mulberry32(9));
    for (let i = 0; i < 300; i++) {
      const { x, y } = toPixel(pos, i, w, h);
      expect(x).toBeGreaterThanOrEqual(4);
      expect(x).toBeLessThan(12);
      expect(y).toBeGreaterThanOrEqual(4);
      expect(y).toBeLessThan(12);
    }
  });

  it("returns zeros when nothing is opaque", () => {
    const pos = sampleMask(new Uint32Array(0), 4, 4, 10, mulberry32(1));
    expect(Array.from(pos).every((v) => v === 0)).toBe(true);
  });
});

describe("constellation and line", () => {
  it("keeps constellation points near nodes or on edges", () => {
    const nodes = [{ x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1.5 }];
    const edges: [number, number][] = [[0, 1], [1, 2]];
    const pos = sampleConstellation(1000, nodes, edges, 0.2, mulberry32(4));
    for (let i = 0; i < 1000; i++) {
      const x = pos[i * 3]!, y = pos[i * 3 + 1]!;
      const nearNode = nodes.some((n) => Math.hypot(x - n.x, y - n.y) <= 0.2 * 1.05);
      const onEdge = edges.some(([a, b]) => {
        const A = nodes[a]!, B = nodes[b]!;
        const t = ((x - A.x) * (B.x - A.x) + (y - A.y) * (B.y - A.y)) / ((B.x - A.x) ** 2 + (B.y - A.y) ** 2);
        if (t < -0.01 || t > 1.01) return false;
        const px = A.x + (B.x - A.x) * t, py = A.y + (B.y - A.y) * t;
        return Math.hypot(x - px, y - py) <= 0.03;
      });
      expect(nearNode || onEdge).toBe(true);
    }
  });

  it("line points lie on a thin horizontal band of width 1", () => {
    const pos = sampleLine(500, mulberry32(2));
    for (let i = 0; i < 500; i++) {
      expect(Math.abs(pos[i * 3]!)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(pos[i * 3 + 1]!)).toBeLessThanOrEqual(0.006);
    }
  });
});
```

Run: `pnpm test tests/unit/hero-sampling.test.ts`
Expected: FAIL, cannot resolve `@/hero/sampling`.

- [ ] **Step 2: Implement**

```ts
// src/hero/sampling.ts
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
    pos[k * 3 + 1] = (rng() - 0.5) * 0.01;
    pos[k * 3 + 2] = (rng() - 0.5) * 0.02;
  }
  return pos;
}
```

Run: `pnpm test tests/unit/hero-sampling.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 3: Commit**

```bash
git add src/hero/sampling.ts tests/unit/hero-sampling.test.ts
git commit -m "feat(hero): add importance sampling and target generators"
git push
```

---

### Task 3: Scroll position to state weights

**Files:**
- Create: `src/hero/scroll.ts`, `tests/unit/hero-scroll.test.ts`

**Interfaces:**
- Produces: `interface Rect { top; height; left; width }` (document px), `interface Layout { vh; thesis; graph; also; contact }`, `interface Weights { w0; w1; w2; w3; alpha }`, `weightsFor(scrollY, layout): Weights`, `centerScroll(rect, vh)`.

- [ ] **Step 1: Failing test**

```ts
// tests/unit/hero-scroll.test.ts
import { describe, expect, it } from "vitest";
import { centerScroll, weightsFor, type Layout } from "@/hero/scroll";

const r = (top: number, height: number) => ({ top, height, left: 0, width: 1000 });
const L: Layout = {
  vh: 800,
  thesis: r(900, 600),
  graph: r(1600, 900),
  also: r(3200, 500),
  contact: r(6000, 700),
};
const sum = (w: ReturnType<typeof weightsFor>) => w.w0 + w.w1 + w.w2 + w.w3;

describe("weightsFor", () => {
  it("is the portrait at the top, fully visible", () => {
    const w = weightsFor(0, L);
    expect(w.w0).toBeCloseTo(1, 5);
    expect(w.alpha).toBe(1);
  });

  it("is the name when the thesis is centred", () => {
    const w = weightsFor(centerScroll(L.thesis, L.vh), L);
    expect(w.w1).toBeCloseTo(1, 5);
    expect(w.alpha).toBe(1);
  });

  it("is the constellation when the graph is centred", () => {
    const w = weightsFor(centerScroll(L.graph, L.vh), L);
    expect(w.w2).toBeCloseTo(1, 5);
    expect(w.alpha).toBe(1);
  });

  it("has gone to the line and faded out by the time also-built is centred", () => {
    const w = weightsFor(centerScroll(L.also, L.vh), L);
    expect(w.w3).toBeCloseTo(1, 5);
    expect(w.alpha).toBe(0);
  });

  it("is the line, visible, when contact is centred", () => {
    const w = weightsFor(centerScroll(L.contact, L.vh), L);
    expect(w.w3).toBeCloseTo(1, 5);
    expect(w.alpha).toBe(1);
  });

  it("weights always sum to one and stay in range", () => {
    for (let y = -200; y < 8000; y += 37) {
      const w = weightsFor(y, L);
      expect(sum(w)).toBeCloseTo(1, 6);
      for (const v of [w.w0, w.w1, w.w2, w.w3, w.alpha]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});
```

Run: `pnpm test tests/unit/hero-scroll.test.ts`
Expected: FAIL, cannot resolve `@/hero/scroll`.

- [ ] **Step 2: Implement**

```ts
// src/hero/scroll.ts
import { smoothstep } from "./sampling";

/** Document-space rectangle in CSS pixels. */
export interface Rect {
  top: number;
  height: number;
  left: number;
  width: number;
}

export interface Layout {
  vh: number;
  thesis: Rect;
  graph: Rect;
  also: Rect;
  contact: Rect;
}

export interface Weights {
  w0: number;
  w1: number;
  w2: number;
  w3: number;
  /** Canvas opacity target. */
  alpha: number;
}

/** The scrollY at which a rect is vertically centred in the viewport. */
export const centerScroll = (r: Rect, vh: number): number => r.top + r.height / 2 - vh / 2;

const ramp = (a: number, b: number, x: number): number => (b <= a ? 1 : Math.min(1, Math.max(0, (x - a) / (b - a))));

/**
 * Portrait over the hero, name over the thesis, constellation over the graph, then the points
 * drift to the line while the canvas fades out through the quiet stretch, and fade back in at contact.
 */
export function weightsFor(scrollY: number, L: Layout): Weights {
  const a1 = centerScroll(L.thesis, L.vh);
  const a2 = centerScroll(L.graph, L.vh);
  const a3 = centerScroll(L.also, L.vh);
  const a4 = centerScroll(L.contact, L.vh);

  // 0 at the top, 1 with the thesis centred, 2 with the graph centred. Same curve as the reference.
  const seg = scrollY <= a1 ? ramp(0, a1, scrollY) : 1 + ramp(a1, a2, scrollY);
  let w0 = 1 - smoothstep(0, 0.9, seg);
  let w1 = seg < 1 ? smoothstep(0.1, 1, seg) : 1 - smoothstep(1, 1.9, seg);
  let w2 = smoothstep(1.05, 2, seg);

  // After the graph, move to the line.
  const post = ramp(a2, a3, scrollY);
  let w3 = smoothstep(0.2, 1, post);
  w2 *= 1 - w3;

  const fadeOut = 1 - smoothstep(0, 0.6, post);
  const fadeIn = ramp(a4 - L.vh, a4 - L.vh * 0.35, scrollY);
  const alpha = Math.max(fadeOut, fadeIn);

  const s = w0 + w1 + w2 + w3 || 1;
  w0 /= s; w1 /= s; w2 /= s; w3 /= s;
  return { w0, w1, w2, w3, alpha };
}
```

Run: `pnpm test tests/unit/hero-scroll.test.ts`
Expected: PASS, 6 tests. If "also-built centred" fails on alpha, `fadeIn` is starting too early for this layout; the test layout has contact a full 2800px below also, so `fadeIn` must be 0 there. Check `a4 - L.vh` is greater than `centerScroll(L.also)`.

- [ ] **Step 3: Commit**

```bash
git add src/hero/scroll.ts tests/unit/hero-scroll.test.ts
git commit -m "feat(hero): map scroll position to particle state weights"
git push
```

---

### Task 4: Shaders and the three.js renderer

**Files:**
- Create: `src/hero/shaders.ts`, `src/hero/renderer.ts`
- Modify: `package.json` (add `three`, `@types/three`)

**Interfaces:**
- Consumes: `TIERS`, `Weights`.
- Produces: `createRenderer(container, targets, count, tierIdx, reduced): HeroRenderer` with methods `setWeights`, `setOffsets`, `setPointer`, `clearPointer`, `setTier`, `replaceTarget`, `resize`, `unitsPerPixel`, `visibleSize`, `frame`, `dispose`, and `canvas`.

- [ ] **Step 1: Install**

Run: `pnpm add three@0.186.0 && pnpm add -D @types/three@0.186.0`

- [ ] **Step 2: Shaders**

The vertex shader is the reference shader plus per-target scale and offset, a parallax rotation applied only to the portrait about its own centre, and an elliptical alpha fade on the portrait that matches the CSS mask on the static image so the crossfade is seamless.

```ts
// src/hero/shaders.ts
export const VERTEX = /* glsl */ `
attribute vec3 aP0;
attribute vec3 aP1;
attribute vec3 aP2;
attribute vec3 aP3;
attribute vec3 aColor;
attribute float aRand;
attribute float aSize;

uniform float uW0, uW1, uW2, uW3;
uniform float uS0, uS1, uS3;
uniform vec2 uOff0, uOff1, uOff2, uOff3;
uniform vec2 uRot;
uniform float uTime, uDpr, uSize, uReduced;
uniform vec3 uMouse, uAccent, uGold;

varying vec3 vCol;
varying float vAlpha;

void main() {
  // Portrait: scale, parallax about its own centre, then offset to the image's position.
  vec3 p0 = aP0 * uS0;
  float cy = cos(uRot.x), sy = sin(uRot.x);
  float cx = cos(uRot.y), sx = sin(uRot.y);
  p0 = vec3(p0.x * cy + p0.z * sy, p0.y, -p0.x * sy + p0.z * cy);
  p0 = vec3(p0.x, p0.y * cx - p0.z * sx, p0.y * sx + p0.z * cx);
  p0.xy += uOff0;

  vec3 p1 = aP1 * uS1; p1.xy += uOff1;
  vec3 p2 = aP2;       p2.xy += uOff2;
  vec3 p3 = aP3 * uS3; p3.xy += uOff3;

  vec3 p = p0 * uW0 + p1 * uW1 + p2 * uW2 + p3 * uW3;

  float disp = 1.0 - uW0;
  if (uReduced < 0.5) {
    float ph = aRand * 6.2831;
    p.x += sin(uTime * 0.42 + ph) * 0.030 * (0.12 + disp);
    p.y += cos(uTime * 0.37 + ph * 1.7) * 0.030 * (0.12 + disp);
    p.z += sin(uTime * 0.30 + ph * 2.3) * 0.040 * (0.12 + disp);
  }

  // The cursor never deforms the portrait. Repulsion fades in exactly as the face dissolves.
  vec2 d = p.xy - uMouse.xy;
  float l = length(d);
  float force = 1.0 - uW0;
  if (l < 1.05 && force > 0.001) { p.xy += normalize(d) * (1.05 - l) * 0.5 * force; }

  // Over the portrait the cursor carries a soft light instead.
  float glow = (1.0 - smoothstep(0.0, 1.5, l)) * uW0;

  // Elliptical fade at the shoulders, matching the CSS mask on the static image.
  float ed = length((aP0.xy - vec2(0.0, 0.14)) / vec2(0.51, 0.74));
  vAlpha = 1.0 - smoothstep(0.46, 0.96, ed) * uW0;

  vec3 c = mix(aColor, uAccent, clamp(uW1 * 0.9 + uW2 * 0.55 + uW3 * 0.9, 0.0, 1.0));
  vCol = mix(c, uGold, uW2 * 0.35) * (1.0 + glow * 0.75);

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = aSize * uSize * uDpr * (8.2 / -mv.z) * (1.0 + glow * 0.35);
  gl_Position = projectionMatrix * mv;
}
`;

export const FRAGMENT = /* glsl */ `
varying vec3 vCol;
varying float vAlpha;

void main() {
  vec2 u = gl_PointCoord - 0.5;
  float r = dot(u, u);
  if (r > 0.25) discard;
  // Tight falloff. A soft blobby edge destroys facial detail.
  gl_FragColor = vec4(vCol, smoothstep(0.25, 0.13, r) * vAlpha);
}
`;
```

- [ ] **Step 3: Renderer**

```ts
// src/hero/renderer.ts
import {
  BufferAttribute, BufferGeometry, Color, PerspectiveCamera, Points, Scene, ShaderMaterial,
  SRGBColorSpace, Vector2, Vector3, WebGLRenderer,
} from "three";
import type { Weights } from "./scroll";
import { FRAGMENT, VERTEX } from "./shaders";
import { TIERS } from "./tiers";

const CAMERA_Z = 8.2;
const FOV = 42;

export interface Targets {
  p0: Float32Array;
  col: Float32Array;
  p1: Float32Array;
  p2: Float32Array;
  p3: Float32Array;
}

export interface Offsets {
  off0: [number, number];
  off1: [number, number];
  off2: [number, number];
  off3: [number, number];
  s0: number;
  s1: number;
  s3: number;
}

export interface HeroRenderer {
  readonly canvas: HTMLCanvasElement;
  setWeights(w: Weights): void;
  setOffsets(o: Offsets): void;
  setPointer(clientX: number, clientY: number): void;
  clearPointer(): void;
  setTier(idx: number): void;
  replaceTarget(which: 1 | 2 | 3, data: Float32Array): void;
  resize(width: number, height: number): void;
  unitsPerPixel(): number;
  visibleSize(): { w: number; h: number };
  frame(timeMs: number): void;
  dispose(): void;
}

/** Imperative three.js. No React, no layout reads. The caller owns the loop. */
export function createRenderer(
  container: HTMLElement, t: Targets, count: number, tierIdx: number, reduced: boolean,
): HeroRenderer {
  const tier = TIERS[tierIdx] ?? TIERS[TIERS.length - 1]!;

  const renderer = new WebGLRenderer({ antialias: false, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, tier.dpr));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 100);
  camera.position.z = CAMERA_Z;

  const rand = new Float32Array(count);
  const size = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    rand[i] = Math.random();
    size[i] = 0.8 + Math.random() * 0.55;
  }

  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(t.p0.slice(), 3));
  geo.setAttribute("aP0", new BufferAttribute(t.p0, 3));
  geo.setAttribute("aP1", new BufferAttribute(t.p1, 3));
  geo.setAttribute("aP2", new BufferAttribute(t.p2, 3));
  geo.setAttribute("aP3", new BufferAttribute(t.p3, 3));
  geo.setAttribute("aColor", new BufferAttribute(t.col, 3));
  geo.setAttribute("aRand", new BufferAttribute(rand, 1));
  geo.setAttribute("aSize", new BufferAttribute(size, 1));
  let active = Math.min(count, tier.count);
  geo.setDrawRange(0, active);

  const uniforms = {
    uW0: { value: 1 }, uW1: { value: 0 }, uW2: { value: 0 }, uW3: { value: 0 },
    uS0: { value: 5 }, uS1: { value: 1 }, uS3: { value: 1 },
    uOff0: { value: new Vector2() }, uOff1: { value: new Vector2() },
    uOff2: { value: new Vector2() }, uOff3: { value: new Vector2() },
    uRot: { value: new Vector2() },
    uTime: { value: 0 },
    uDpr: { value: renderer.getPixelRatio() },
    uSize: { value: 700 / Math.sqrt(active) },
    uReduced: { value: reduced ? 1 : 0 },
    uMouse: { value: new Vector3(999, 999, 0) },
    uAccent: { value: new Color(0xd3b2a0) },
    uGold: { value: new Color(0xc9a227) },
  };

  const material = new ShaderMaterial({
    uniforms, vertexShader: VERTEX, fragmentShader: FRAGMENT,
    transparent: true, depthTest: false, depthWrite: false,
  });
  const points = new Points(geo, material);
  points.frustumCulled = false;
  scene.add(points);

  let W = 1, H = 1;
  const target: Weights = { w0: 1, w1: 0, w2: 0, w3: 0, alpha: 1 };
  const cur = { w0: 1, w1: 0, w2: 0, w3: 0 };
  let mx = 0, my = 0, hasPointer = false, rotX = 0, rotY = 0;
  const v = new Vector3();

  function unitsPerPixel(): number {
    return (2 * CAMERA_Z * Math.tan((FOV / 2) * (Math.PI / 180))) / H;
  }

  function resize(width: number, height: number): void {
    W = width; H = height;
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    renderer.setSize(W, H);
  }

  function setPointer(clientX: number, clientY: number): void {
    mx = (clientX / W) * 2 - 1;
    my = -(clientY / H) * 2 + 1;
    hasPointer = true;
    v.set(mx, my, 0.5).unproject(camera).sub(camera.position).normalize();
    uniforms.uMouse.value.copy(camera.position).add(v.multiplyScalar(-camera.position.z / v.z));
  }

  function frame(timeMs: number): void {
    uniforms.uTime.value = timeMs * 0.001;
    const k = reduced ? 1 : 0.075;
    cur.w0 += (target.w0 - cur.w0) * k;
    cur.w1 += (target.w1 - cur.w1) * k;
    cur.w2 += (target.w2 - cur.w2) * k;
    cur.w3 += (target.w3 - cur.w3) * k;
    uniforms.uW0.value = cur.w0;
    uniforms.uW1.value = cur.w1;
    uniforms.uW2.value = cur.w2;
    uniforms.uW3.value = cur.w3;
    if (!reduced) {
      // Parallax replaces deformation: the portrait turns a few degrees toward the cursor.
      const amt = cur.w0 * 0.075;
      rotY += ((hasPointer ? mx : 0) * amt - rotY) * 0.06;
      rotX += ((hasPointer ? -my : 0) * amt * 0.7 - rotX) * 0.06;
      uniforms.uRot.value.set(rotY, rotX);
    }
    renderer.render(scene, camera);
  }

  return {
    canvas: renderer.domElement,
    setWeights(w) { target.w0 = w.w0; target.w1 = w.w1; target.w2 = w.w2; target.w3 = w.w3; },
    setOffsets(o) {
      uniforms.uOff0.value.set(o.off0[0], o.off0[1]);
      uniforms.uOff1.value.set(o.off1[0], o.off1[1]);
      uniforms.uOff2.value.set(o.off2[0], o.off2[1]);
      uniforms.uOff3.value.set(o.off3[0], o.off3[1]);
      uniforms.uS0.value = o.s0;
      uniforms.uS1.value = o.s1;
      uniforms.uS3.value = o.s3;
    },
    setPointer,
    clearPointer() { hasPointer = false; uniforms.uMouse.value.set(999, 999, 0); },
    setTier(idx) {
      const nt = TIERS[idx] ?? TIERS[TIERS.length - 1]!;
      active = Math.min(count, nt.count);
      geo.setDrawRange(0, active);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, nt.dpr));
      uniforms.uDpr.value = renderer.getPixelRatio();
      uniforms.uSize.value = 700 / Math.sqrt(active);
    },
    replaceTarget(which, data) {
      const attr = geo.getAttribute(`aP${which}`) as BufferAttribute;
      (attr.array as Float32Array).set(data);
      attr.needsUpdate = true;
    },
    resize,
    unitsPerPixel,
    visibleSize() { const upp = unitsPerPixel(); return { w: W * upp, h: H * upp }; },
    frame,
    dispose() {
      geo.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
```

- [ ] **Step 4: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: clean. Nothing renders yet; `renderer.ts` is only imported by Task 5.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml src/hero/shaders.ts src/hero/renderer.ts
git commit -m "feat(hero): add three.js renderer and shaders"
git push
```

---

### Task 5: Mount the particle layer over the static hero

**Files:**
- Create: `src/hero/text.ts`, `src/hero/worker.ts`, `src/hero/mount.ts`, `src/hero/HeroEnhancer.tsx`
- Modify: `src/app/page.tsx`, `src/styles/globals.css`, `src/components/graph/Graph.module.css`, `src/components/thesis/Thesis.module.css`

**Interfaces:**
- Consumes: everything above, plus `edges` and `projects` from content for the constellation.
- Produces: `mount(): Promise<() => void>` (returns a dispose function), `<HeroEnhancer />` which renders `<div id="hero-stage">` and idle-loads `mount`. Sets `html[data-particles="on"]` when live.

- [ ] **Step 1: Text raster (main thread, after fonts are ready)**

```ts
// src/hero/text.ts
export interface TextRaster {
  rgba: Uint8ClampedArray;
  w: number;
  h: number;
  /** Rendered text width in canvas pixels, for scaling to the viewport. */
  textWidth: number;
}

/** One fillText on a 2048x512 canvas. Cheap, and it can use the page's loaded fonts. */
export function rasteriseText(text: string, font: string, w = 2048, h = 512): TextRaster {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) return { rgba: new Uint8ClampedArray(w * h * 4), w, h, textWidth: 1 };
  g.fillStyle = "#fff";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = font;
  g.fillText(text, w / 2, h / 2);
  return { rgba: g.getImageData(0, 0, w, h).data, w, h, textWidth: Math.max(1, g.measureText(text).width) };
}
```

- [ ] **Step 2: Worker**

```ts
// src/hero/worker.ts
import { samplePortrait } from "./sampling";

interface Req {
  url: string;
  n: number;
}

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = async (e: MessageEvent<Req>) => {
  try {
    const res = await fetch(e.data.url);
    if (!res.ok) throw new Error(`fetch ${res.status}`);
    const bmp = await createImageBitmap(await res.blob());
    const c = new OffscreenCanvas(bmp.width, bmp.height);
    const g = c.getContext("2d", { willReadFrequently: true });
    if (!g) throw new Error("no 2d context in worker");
    g.drawImage(bmp, 0, 0);
    const d = g.getImageData(0, 0, bmp.width, bmp.height);
    const out = samplePortrait(d.data, d.width, d.height, e.data.n);
    ctx.postMessage(out, [out.pos.buffer, out.col.buffer]);
  } catch (err) {
    ctx.postMessage({ error: String(err) });
  }
};
```

- [ ] **Step 3: Mount**

```ts
// src/hero/mount.ts
import { edges as contentEdges, projects } from "@/content";
import { createRenderer, type HeroRenderer, type Offsets } from "./renderer";
import {
  alphaCandidates, sampleConstellation, sampleLine, sampleMask, samplePortrait, type Vec2,
} from "./sampling";
import { weightsFor, type Layout, type Rect } from "./scroll";
import { rasteriseText } from "./text";
import { FrameStepper, NONE, TIERS, guessTier, type DeviceHints } from "./tiers";

const NAME = "ADWAITH";
const IMAGE_URL = "/hero-crop.webp";
const WORKER_TIMEOUT_MS = 4000;
const FADE_MS = 600;

export function hintsFromBrowser(): DeviceHints {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  let webgl = false;
  try {
    const c = document.createElement("canvas");
    webgl = !!(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    webgl = false;
  }
  return {
    memory: nav.deviceMemory,
    cores: nav.hardwareConcurrency,
    finePointer: matchMedia("(pointer: fine)").matches,
    minSide: Math.min(innerWidth, innerHeight),
    saveData: nav.connection?.saveData === true,
    webgl,
  };
}

interface PortraitData {
  pos: Float32Array;
  col: Float32Array;
}

function portraitFromWorker(n: number): Promise<PortraitData> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    const timer = setTimeout(() => { worker.terminate(); reject(new Error("worker timeout")); }, WORKER_TIMEOUT_MS);
    worker.onmessage = (e: MessageEvent<PortraitData | { error: string }>) => {
      clearTimeout(timer);
      worker.terminate();
      if ("error" in e.data) reject(new Error(e.data.error));
      else resolve(e.data);
    };
    worker.onerror = (e) => { clearTimeout(timer); worker.terminate(); reject(new Error(e.message)); };
    worker.postMessage({ url: IMAGE_URL, n });
  });
}

async function portraitOnMain(n: number): Promise<PortraitData> {
  const img = new Image();
  img.src = IMAGE_URL;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) throw new Error("no 2d context");
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height);
  return samplePortrait(d.data, d.width, d.height, n);
}

function docRect(el: Element): Rect {
  const r = el.getBoundingClientRect();
  return { top: r.top + scrollY, height: r.height, left: r.left + scrollX, width: r.width };
}

interface Dom {
  stage: HTMLElement;
  image: HTMLElement;
  thesis: Element;
  graph: Element;
  also: Element;
  contact: Element;
}

function findDom(): Dom | null {
  const stage = document.getElementById("hero-stage");
  const image = document.getElementById("hero-portrait");
  const thesis = document.getElementById("thesis");
  const graph = document.getElementById("graph");
  const also = document.getElementById("also");
  const contact = document.getElementById("contact");
  if (!stage || !image || !thesis || !graph || !also || !contact) return null;
  return { stage, image, thesis, graph, also, contact };
}

interface LayoutCache {
  layout: Layout;
  image: Rect;
  svg: Rect | null;
  nodesDoc: Vec2[];
  edgeIdx: [number, number][];
}

function readLayout(dom: Dom): LayoutCache {
  let svgEl: SVGSVGElement | null = null;
  for (const s of dom.graph.querySelectorAll("svg")) {
    if (getComputedStyle(s).display !== "none") { svgEl = s; break; }
  }
  const nodesDoc: Vec2[] = [];
  const index = new Map<string, number>();
  if (svgEl) {
    projects.forEach((p) => {
      const c = svgEl!.querySelector(`[data-graph-node="${p.slug}"] circle`);
      if (!c) return;
      const r = c.getBoundingClientRect();
      index.set(p.slug, nodesDoc.length);
      nodesDoc.push({ x: r.left + r.width / 2 + scrollX, y: r.top + r.height / 2 + scrollY });
    });
  }
  const edgeIdx: [number, number][] = [];
  for (const e of contentEdges) {
    const a = index.get(e.from), b = index.get(e.to);
    if (a !== undefined && b !== undefined) edgeIdx.push([a, b]);
  }
  return {
    layout: {
      vh: innerHeight,
      thesis: docRect(dom.thesis),
      graph: docRect(dom.graph),
      also: docRect(dom.also),
      contact: docRect(dom.contact),
    },
    image: docRect(dom.image),
    svg: svgEl ? docRect(svgEl) : null,
    nodesDoc,
    edgeIdx,
  };
}

/** Constellation in world units relative to the SVG centre, so an offset uniform can track scroll. */
function buildConstellation(cache: LayoutCache, count: number, upp: number): Float32Array {
  if (!cache.svg || cache.nodesDoc.length === 0) return new Float32Array(count * 3);
  const cx = cache.svg.left + cache.svg.width / 2;
  const cy = cache.svg.top + cache.svg.height / 2;
  const nodes = cache.nodesDoc.map((n) => ({ x: (n.x - cx) * upp, y: -(n.y - cy) * upp }));
  const radius = cache.svg.width * upp * 0.045;
  return sampleConstellation(count, nodes, cache.edgeIdx, radius);
}

export async function mount(): Promise<() => void> {
  const tierIdx = guessTier(hintsFromBrowser());
  if (tierIdx === NONE) return () => {};
  const dom = findDom();
  if (!dom) return () => {};

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const count = TIERS[tierIdx]!.count;
  let disposed = false;
  let renderer: HeroRenderer | null = null;
  let raf = 0;
  const cleanups: (() => void)[] = [];

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf);
    for (const c of cleanups) c();
    renderer?.dispose();
    renderer = null;
    delete document.documentElement.dataset.particles;
    dom!.stage.style.opacity = "0";
  }

  try {
    const canWorker = typeof Worker === "function" && typeof OffscreenCanvas === "function";
    const portraitPromise = (canWorker ? portraitFromWorker(count) : portraitOnMain(count))
      .catch(() => portraitOnMain(count));

    await document.fonts.ready;
    const family = getComputedStyle(document.documentElement).getPropertyValue("--font-instrument-serif").trim();
    const text = rasteriseText(NAME, `400 300px ${family || "Georgia"}, Georgia, serif`);
    const p1 = sampleMask(alphaCandidates(text.rgba, text.w, text.h), text.w, text.h, count);
    const textWidthUnits = text.textWidth / text.h;
    const p3 = sampleLine(count);

    const portrait = await portraitPromise;
    if (disposed) return dispose;

    renderer = createRenderer(
      dom.stage, { p0: portrait.pos, col: portrait.col, p1, p2: new Float32Array(count * 3), p3 },
      count, tierIdx, reduced,
    );
    renderer.resize(innerWidth, innerHeight);

    let cache = readLayout(dom);
    renderer.replaceTarget(2, buildConstellation(cache, count, renderer.unitsPerPixel()));

    const stepper = new FrameStepper(tierIdx);
    let last = 0;
    let fade = 0;
    let curAlpha = 1;

    function offsets(): Offsets {
      const r = renderer!;
      const upp = r.unitsPerPixel();
      const vis = r.visibleSize();
      const toWorld = (xDoc: number, yDoc: number): [number, number] => [
        (xDoc - scrollX - innerWidth / 2) * upp,
        -(yDoc - scrollY - innerHeight / 2) * upp,
      ];
      const im = cache.image;
      const svg = cache.svg;
      const ct = cache.layout.contact;
      return {
        off0: toWorld(im.left + im.width / 2, im.top + im.height / 2),
        s0: im.height * upp,
        off1: [0, vis.h * 0.12],
        s1: Math.min((0.8 * vis.w) / textWidthUnits, 0.85 * vis.h),
        off2: svg ? toWorld(svg.left + svg.width / 2, svg.top + svg.height / 2) : [0, 0],
        off3: toWorld(ct.left + ct.width / 2, ct.top + ct.height * 0.45),
        s3: 0.8 * vis.w,
      };
    }

    function loop(t: number): void {
      if (disposed || !renderer) return;
      if (document.hidden) { raf = 0; last = 0; return; }
      const dt = last ? Math.min(100, t - last) : 16;
      last = t;
      const w = weightsFor(scrollY, cache.layout);
      renderer.setWeights(w);
      renderer.setOffsets(offsets());
      fade = Math.min(1, fade + dt / FADE_MS);
      curAlpha += (w.alpha - curAlpha) * (reduced ? 1 : 0.12);
      const a = fade * curAlpha;
      dom!.stage.style.opacity = a.toFixed(3);
      if (a > 0.005) {
        const step = stepper.push(dt);
        if (step !== null) renderer.setTier(step);
        renderer.frame(t);
      }
      raf = requestAnimationFrame(loop);
    }

    const start = (): void => { if (!raf && !disposed) { last = 0; raf = requestAnimationFrame(loop); } };

    let resizeTimer = 0;
    const onResize = (): void => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        if (disposed || !renderer) return;
        renderer.resize(innerWidth, innerHeight);
        cache = readLayout(dom);
        renderer.replaceTarget(2, buildConstellation(cache, count, renderer.unitsPerPixel()));
      }, 150);
    };
    const onMove = (e: PointerEvent): void => { renderer?.setPointer(e.clientX, e.clientY); };
    const onLeave = (): void => { renderer?.clearPointer(); };
    const onVisibility = (): void => { if (!document.hidden) start(); };
    const onLost = (e: Event): void => { e.preventDefault(); dispose(); };

    addEventListener("resize", onResize);
    addEventListener("pointermove", onMove, { passive: true });
    addEventListener("pointerleave", onLeave);
    addEventListener("blur", onLeave);
    document.addEventListener("visibilitychange", onVisibility);
    renderer.canvas.addEventListener("webglcontextlost", onLost);
    const ro = new ResizeObserver(onResize);
    ro.observe(document.body);
    cleanups.push(
      () => removeEventListener("resize", onResize),
      () => removeEventListener("pointermove", onMove),
      () => removeEventListener("pointerleave", onLeave),
      () => removeEventListener("blur", onLeave),
      () => document.removeEventListener("visibilitychange", onVisibility),
      () => ro.disconnect(),
      () => clearTimeout(resizeTimer),
    );

    document.documentElement.dataset.particles = "on";
    start();
    return dispose;
  } catch {
    dispose();
    return dispose;
  }
}
```

- [ ] **Step 4: Client component and page wiring**

```tsx
// src/hero/HeroEnhancer.tsx
"use client";

import { useEffect } from "react";

/**
 * The only client component on the site. After first paint and on idle it loads the
 * particle layer; the static hero underneath is already complete. Renders the fixed stage.
 */
export function HeroEnhancer() {
  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | undefined;
    const ric = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200));
    const cic = window.cancelIdleCallback ?? window.clearTimeout;
    const handle = ric(() => {
      import("./mount")
        .then(async (m) => { if (!cancelled) dispose = await m.mount(); })
        .catch(() => undefined);
    });
    return () => {
      cancelled = true;
      cic(handle);
      dispose?.();
    };
  }, []);
  return <div id="hero-stage" aria-hidden="true" />;
}
```

In `src/app/page.tsx`, import it and render it between the header and `<main>`:

```tsx
import { HeroEnhancer } from "@/hero/HeroEnhancer";
// ...
      <SiteHeader />
      <HeroEnhancer />
      <main id="main">
```

- [ ] **Step 5: CSS hooks**

Append to `src/styles/globals.css`:

```css
/* Hero particle stage. Fixed behind main; opacity is driven per frame by the hero layer. */
#hero-stage {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0;
}

#hero-stage canvas {
  display: block;
  width: 100%;
  height: 100%;
}

main {
  position: relative;
  z-index: 1;
}

#hero-portrait {
  transition: opacity 0.6s ease;
}

html[data-particles="on"] #hero-portrait {
  opacity: 0;
}
```

Append to `src/components/graph/Graph.module.css`:

```css
/* When the particles have settled onto the graph, the drawn lines and dots step back. */
:global(html[data-particles="on"]) .edges line,
:global(html[data-particles="on"]) .node circle {
  opacity: 0.2;
}
```

Append to `src/components/thesis/Thesis.module.css`:

```css
/* The name forms above the thesis text, so the text sits low while particles are live. */
:global(html[data-particles="on"]) .thesis {
  justify-content: flex-end;
  padding-bottom: 12vh;
}
```

- [ ] **Step 6: Verify in Chrome**

Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` then `pnpm start`.

Open http://localhost:3000 at 1440px. Expected, in order:
1. The page paints with the static portrait immediately.
2. Within about a second the particle portrait fades in exactly over the image and the image fades out. The face is crisp, the shoulders dissolve.
3. Moving the mouse lights the face and tilts it a few degrees. Nothing on the face moves.
4. Scrolling: the portrait scrolls with the page, then dissolves into "ADWAITH" in the serif above the thesis text. The cursor now repels points.
5. Over the graph, the points settle onto the SVG nodes and edges; the SVG's own lines and dots go faint.
6. Past the graph the canvas fades out. Nothing renders through case studies, also built, open source, stack, how I build.
7. At contact a horizontal line of points fades in behind "Say hello."
8. DevTools console: no errors. Network: the three.js chunk loads after the page is interactive.
9. DevTools rendering panel, emulate `prefers-reduced-motion: reduce`, reload: no drift, no parallax, state changes are instant cuts.

Open at 500px: the same sequence; the constellation lands on the portrait graph layout.

If the Turbopack worker URL fails to resolve, change `"./worker.ts"` to `"./worker"` in `mount.ts`.

- [ ] **Step 7: Commit**

```bash
git add src/hero src/app/page.tsx src/styles/globals.css src/components/graph/Graph.module.css src/components/thesis/Thesis.module.css
git commit -m "feat(hero): mount the particle portrait over the static image with four scroll states"
git push
```

---

### Task 6: End-to-end coverage, JS budget check, docs

**Files:**
- Create: `tests/e2e/hero.spec.ts`, `scripts/budget.mjs`
- Modify: `package.json` (script `budget`), `.github/workflows/ci.yml`, `docs/design.md` section 7, `docs/plan.md` phase table

- [ ] **Step 1: Budget script**

```js
// scripts/budget.mjs
// Sums the gzipped size of every script the home page loads on first paint, and reports
// the largest lazy chunk (the hero layer). Fails the build over 90 KB initial.
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";

const LIMIT_KB = 90;
const html = readFileSync(".next/server/app/index.html", "utf8");
const initial = [...new Set([...html.matchAll(/src="(\/_next\/static\/chunks\/[^"]+\.js)"/g)].map((m) => m[1]))];

const gz = (rel) => gzipSync(readFileSync(path.join(".next", rel.replace(/^\/_next\//, "")))).length;
const initialBytes = initial.reduce((sum, s) => sum + gz(s), 0);

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? walk(path.join(dir, d.name)) : d.name.endsWith(".js") ? [path.join(dir, d.name)] : [],
  );
}
let lazy = { name: "", bytes: 0 };
for (const f of walk(".next/static/chunks")) {
  const rel = "/_next/" + path.relative(".next", f).split(path.sep).join("/");
  if (initial.includes(rel)) continue;
  const bytes = gzipSync(readFileSync(f)).length;
  if (bytes > lazy.bytes) lazy = { name: rel, bytes };
}

console.log(`initial JS on /: ${(initialBytes / 1024).toFixed(1)} KB gzipped in ${initial.length} chunks (limit ${LIMIT_KB} KB)`);
console.log(`largest lazy chunk: ${lazy.name} ${(lazy.bytes / 1024).toFixed(1)} KB gzipped`);
if (initialBytes > LIMIT_KB * 1024) {
  console.error("FAIL: initial JS over budget");
  process.exit(1);
}
```

Add to `package.json` scripts: `"budget": "node scripts/budget.mjs"`.

Run: `pnpm build && pnpm budget`
Expected: initial JS under 90 KB, largest lazy chunk somewhere between 100 and 160 KB (three.js core). Record both numbers in the commit message.

- [ ] **Step 2: E2E spec**

```ts
// tests/e2e/hero.spec.ts
import { expect, test } from "@playwright/test";

test("the particle layer never loads on a low-memory device", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "deviceMemory", { get: () => 2 });
  });
  await page.goto("/");
  await page.waitForTimeout(2500);
  expect(await page.locator("#hero-stage canvas").count()).toBe(0);
  await expect(page.locator("html")).not.toHaveAttribute("data-particles", "on");
  await expect(page.locator("#hero-portrait")).toHaveCSS("opacity", "1");
});

test("the particle layer mounts over the portrait when the device allows it", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "deviceMemory", { get: () => 8 });
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 });
  });
  await page.goto("/");
  const webgl = await page.evaluate(() => {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") ?? c.getContext("webgl"));
  });
  test.skip(!webgl, "no WebGL in this browser");
  await expect(page.locator("html")).toHaveAttribute("data-particles", "on", { timeout: 20_000 });
  await expect(page.locator("#hero-stage canvas")).toHaveCount(1);
  await expect(page.locator("#hero-portrait")).toHaveCSS("opacity", "0");
});

test("the home page logs no console errors with the layer active", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto("/");
  await page.waitForTimeout(3000);
  await page.mouse.wheel(0, 4000);
  await page.waitForTimeout(1000);
  expect(errors).toEqual([]);
});
```

Run: `pnpm build && pnpm test:e2e`
Expected: all Phase 1 tests still pass; the three new tests pass on desktop. On mobile (Pixel 7 profile) the mount test may skip if the emulated device reports no WebGL; skipping is acceptable, failing is not.

- [ ] **Step 3: CI**

In `.github/workflows/ci.yml`, after `- run: pnpm build` add `- run: pnpm budget`.

- [ ] **Step 4: Docs**

In `docs/design.md` section 7, update the mount sequence to match what was built: the worker handles only the portrait (fetch, decode, importance sampling); the text raster runs on the main thread after fonts are ready so it can use the loaded serif; the portrait offset tracks the static image; the shader carries an elliptical alpha fade matching the CSS mask. In `docs/plan.md`, mark Phase 2 done in the phase table with the measured budget numbers.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/hero.spec.ts scripts/budget.mjs package.json .github/workflows/ci.yml docs/design.md docs/plan.md docs/plans/phase-2-hero.md
git commit -m "test(hero): add e2e coverage and the initial js budget check; phase 2 complete"
git push
```

Phase 2 is done when: all unit and e2e tests pass, `pnpm budget` passes, CI is green, and the nine expectations in Task 5 Step 6 have been seen in Chrome at 1440px and 500px.
