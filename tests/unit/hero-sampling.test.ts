import { describe, expect, it } from "vitest";
import {
  alphaCandidates, mulberry32, sampleConstellation, sampleLine, sampleMask, samplePortrait,
} from "@/hero/sampling";

/**
 * 16x16 RGBA. Left half flat grey, right half a brightness ramp (a real gradient under
 * central differences; a checkerboard would read as flat), a transparent 4px border.
 */
function synthetic() {
  const w = 16, h = 16;
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const inside = x >= 4 && x < 12 && y >= 4 && y < 12;
      const v = x < 8 ? 128 : 40 + (x - 8) * 40 + (y - 4) * 20;
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
    expect(right / 4000).toBeGreaterThan(0.7);
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
