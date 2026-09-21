export type TierName = "high" | "balanced" | "light" | "minimal";

export interface Tier {
  name: TierName;
  count: number;
  dpr: number;
}

/** From docs/build-spec.md section 5. Allocate once, then measure. */
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
  /** WebGL is present but rasterised on the CPU (SwiftShader, llvmpipe). Every frame is a long task. */
  softwareGl: boolean;
  /** The renderer string names a discrete GPU. Anything unrecognised is treated as integrated. */
  discreteGpu: boolean;
}

/** Matches the renderer strings of CPU rasterisers. Anything else is assumed to be a GPU. */
export const SOFTWARE_GL = /swiftshader|llvmpipe|softpipe|software|mesa offscreen|microsoft basic render/i;

/** Matches discrete GPUs. Integrated parts (Radeon 680M, Intel Iris, Apple M) deliberately do not match. */
export const DISCRETE_GL = /nvidia|geforce|quadro|\brtx\b|\bgtx\b|radeon\s*(rx|pro)\b|\barc(\(tm\))?\s*a\d/i;

/** The highest tier this device may ever reach. Geometry is allocated for this tier. */
export function guessTier(h: DeviceHints): number {
  if (!h.webgl || h.softwareGl || h.saveData) return NONE;
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

/**
 * The tier to start drawing at. Integrated GPUs start no higher than "balanced" and must earn
 * the top tier by measurement; a GPU fault on first load crashed a desktop session on an
 * integrated Radeon 680M (docs/decisions/0004).
 */
export function startTier(ceiling: number, h: Pick<DeviceHints, "discreteGpu">): number {
  if (ceiling === NONE) return NONE;
  return h.discreteGpu ? ceiling : Math.max(ceiling, 1);
}

export interface StepperOptions {
  /** Ticks ignored at start while shaders compile. */
  warmup: number;
  /** Ticks per measurement window. */
  window: number;
  /** A window whose median tick exceeds this steps down. 21 ms is roughly 48 fps. */
  budgetMs: number;
  /** Highest tier (lowest index) a step up may reach. Defaults to the starting tier: no step up. */
  ceiling: number;
  /** A window whose median tick is at or under this shows real headroom (a fast display keeping up). */
  headroomMs: number;
  /** Consecutive headroom windows needed before stepping up. */
  upWindows: number;
  /** Minimum measured time, in ms, before any step up. Keeps the heavy tier out of the fragile first seconds. */
  upAfterMs: number;
  /** Consecutive ticks above this many ms trigger the emergency exit. */
  emergencyMs: number;
  emergencyTicks: number;
}

const DEFAULTS: Omit<StepperOptions, "ceiling"> = {
  warmup: 40,
  window: 50,
  budgetMs: 21,
  headroomMs: 9,
  upWindows: 2,
  upAfterMs: 6000,
  emergencyMs: 200,
  emergencyTicks: 10,
};

/**
 * Feed it every animation-frame tick interval while the layer is visible. Tick intervals are the
 * browser's real frame cadence, so they reveal an overloaded GPU regardless of how often the
 * layer chooses to draw.
 *
 * - Emergency: `emergencyTicks` consecutive ticks over `emergencyMs` return NONE at once, even
 *   during warm-up. A page at a few frames per second is already hurting the machine.
 * - Down: after warm-up, a window whose median exceeds the budget steps down one tier. At the
 *   floor, a median over twice the budget returns NONE.
 * - Up: while below the ceiling and never having stepped down, `upWindows` consecutive windows
 *   with a median at or under `headroomMs`, after `upAfterMs` of measurement, step up one tier.
 * - Settle: a window within budget with no step up available settles. After settling only the
 *   emergency rule remains active.
 *
 * The median, not the mean, so isolated spikes (a GC pause, a tab switch) do not move the tier.
 */
export class FrameStepper {
  tier: number;
  settled = false;
  private warm = false;
  private frames: number[] = [];
  private readonly opts: StepperOptions;
  private slowRun = 0;
  private elapsed = 0;
  private goodWindows = 0;
  private steppedDown = false;

  constructor(tier: number, opts: Partial<StepperOptions> = {}) {
    this.tier = tier;
    this.opts = { ...DEFAULTS, ceiling: tier, ...opts };
  }

  push(tickMs: number): number | null {
    this.slowRun = tickMs > this.opts.emergencyMs ? this.slowRun + 1 : 0;
    if (this.slowRun >= this.opts.emergencyTicks) {
      this.settled = true;
      this.slowRun = 0;
      return NONE;
    }
    if (this.settled) return null;
    this.elapsed += tickMs;
    this.frames.push(tickMs);
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

    if (median > this.opts.budgetMs) {
      this.goodWindows = 0;
      if (this.tier < TIERS.length - 1) {
        this.tier += 1;
        this.steppedDown = true;
        return this.tier;
      }
      this.settled = true;
      return median > this.opts.budgetMs * 2 ? NONE : null;
    }

    const canGoUp = !this.steppedDown && this.tier > this.opts.ceiling;
    if (canGoUp && median <= this.opts.headroomMs) {
      this.goodWindows += 1;
      if (this.goodWindows >= this.opts.upWindows && this.elapsed >= this.opts.upAfterMs) {
        this.goodWindows = 0;
        this.tier -= 1;
        return this.tier;
      }
      return null;
    }
    this.settled = true;
    return null;
  }
}
