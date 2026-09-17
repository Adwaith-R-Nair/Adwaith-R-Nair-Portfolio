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
