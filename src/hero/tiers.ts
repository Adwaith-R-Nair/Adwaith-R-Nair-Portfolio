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
