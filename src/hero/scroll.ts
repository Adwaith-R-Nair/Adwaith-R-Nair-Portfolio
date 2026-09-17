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

const ramp = (a: number, b: number, x: number): number =>
  b <= a ? 1 : Math.min(1, Math.max(0, (x - a) / (b - a)));

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
  w0 /= s;
  w1 /= s;
  w2 /= s;
  w3 /= s;
  return { w0, w1, w2, w3, alpha };
}
