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
