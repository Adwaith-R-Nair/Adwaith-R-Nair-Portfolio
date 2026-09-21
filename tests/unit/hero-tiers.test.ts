import { describe, expect, it } from "vitest";
import {
  DISCRETE_GL, FrameStepper, NONE, SOFTWARE_GL, TIERS, guessTier, startTier, type DeviceHints,
} from "@/hero/tiers";

const base: DeviceHints = {
  memory: 8, cores: 8, finePointer: true, minSide: 900, saveData: false, webgl: true, softwareGl: false, discreteGpu: false,
};

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
  it("returns none when webgl is software rendered", () => {
    expect(guessTier({ ...base, softwareGl: true })).toBe(NONE);
    for (const r of ["Google SwiftShader", "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)))", "llvmpipe (LLVM 15.0.7, 256 bits)", "Microsoft Basic Render Driver"]) {
      expect(SOFTWARE_GL.test(r), r).toBe(true);
    }
    for (const r of ["ANGLE (Apple, Apple M2, OpenGL 4.1)", "Mali-G78", "Adreno (TM) 730", "NVIDIA GeForce RTX 3060/PCIe/SSE2"]) {
      expect(SOFTWARE_GL.test(r), r).toBe(false);
    }
  });
  it("treats unknown memory and cores as 4", () =>
    expect(guessTier({ ...base, memory: undefined, cores: undefined })).toBe(1));
});

describe("startTier", () => {
  it("starts integrated GPUs no higher than balanced", () => {
    expect(startTier(0, { discreteGpu: false })).toBe(1);
    expect(startTier(2, { discreteGpu: false })).toBe(2);
  });
  it("lets discrete GPUs start at their ceiling", () => expect(startTier(0, { discreteGpu: true })).toBe(0));
  it("passes none through", () => expect(startTier(NONE, { discreteGpu: true })).toBe(NONE));
  it("recognises discrete and integrated renderer strings", () => {
    for (const r of ["NVIDIA GeForce RTX 3060/PCIe/SSE2", "ANGLE (NVIDIA, NVIDIA GeForce GTX 1650)", "AMD Radeon RX 6700 XT", "AMD Radeon Pro 5500M", "Intel(R) Arc(TM) A770 Graphics"]) {
      expect(DISCRETE_GL.test(r), r).toBe(true);
    }
    for (const r of ["ANGLE (AMD, AMD Radeon 680M (radeonsi rembrandt ACO), OpenGL ES 3.2)", "AMD Radeon Graphics", "Intel(R) Iris(R) Xe Graphics", "ANGLE (Apple, Apple M2, OpenGL 4.1)", "Adreno (TM) 730"]) {
      expect(DISCRETE_GL.test(r), r).toBe(false);
    }
  });
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

  it("settles at the floor when frames are only a little over budget", () => {
    const s = new FrameStepper(TIERS.length - 1);
    feed(s, 10, 40);
    expect(feed(s, 30, 50)).toEqual([]);
    expect(s.settled).toBe(true);
  });

  it("gives up at the floor when frames are over twice the budget", () => {
    const s = new FrameStepper(TIERS.length - 1);
    feed(s, 10, 40);
    expect(feed(s, 60, 50)).toEqual([NONE]);
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

  it("exits at once at 2 fps, even during warm-up (the 2026-09-19 crash)", () => {
    const s = new FrameStepper(1);
    const steps = feed(s, 500, 10);
    expect(steps).toEqual([NONE]);
  });

  it("does not trip the emergency exit on a few slow frames at startup", () => {
    const s = new FrameStepper(1);
    expect(feed(s, 400, 5)).toEqual([]);
    expect(feed(s, 7, 100)).toEqual([]);
  });

  it("steps up to the ceiling only after sustained headroom and enough time", () => {
    const s = new FrameStepper(1, { ceiling: 0 });
    // 144 Hz display keeping up: 6.9 ms ticks.
    const steps = feed(s, 6.9, 40 + 50 * 20);
    expect(steps).toEqual([0]);
    expect(s.tier).toBe(0);
  });

  it("does not step up before the minimum time has passed", () => {
    const s = new FrameStepper(1, { ceiling: 0 });
    // 40 + 100 ticks at 6.9 ms is under 1 s of measurement.
    expect(feed(s, 6.9, 140)).toEqual([]);
    expect(s.tier).toBe(1);
  });

  it("never steps up on a 60 Hz display, where there is no measurable headroom", () => {
    const s = new FrameStepper(1, { ceiling: 0 });
    expect(feed(s, 16.7, 40 + 50 * 20)).toEqual([]);
    expect(s.settled).toBe(true);
    expect(s.tier).toBe(1);
  });

  it("never steps back up after having stepped down", () => {
    const s = new FrameStepper(1, { ceiling: 0 });
    feed(s, 10, 40);
    expect(feed(s, 30, 50)).toEqual([2]);
    expect(feed(s, 6.9, 50 * 20)).toEqual([]);
    expect(s.tier).toBe(2);
  });
});
