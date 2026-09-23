/**
 * On-device readout for the particle layer, shown only with `?hero=debug`.
 *
 * Phones have no developer tools worth the name, so the page reports its own state: which tier
 * it settled on, how many points that is, the drawn frame rate against the display's own rate,
 * and the GPU the browser picked. Nothing is created without the query parameter.
 */

export interface DebugInfo {
  tier: string;
  points: number;
  /** Frames actually drawn in the last second. */
  fps: number;
  /** Frames the browser offered in the last second, which is the display's rate. */
  ticks: number;
  gpu: string;
  dpr: number;
}

export interface Debug {
  update(info: DebugInfo): void;
  destroy(): void;
}

export function debugRequested(search: string): boolean {
  return new URLSearchParams(search).get("hero") === "debug";
}

const STYLE = [
  "position:fixed",
  "left:8px",
  "bottom:8px",
  "z-index:50",
  "max-width:calc(100vw - 16px)",
  "padding:8px 10px",
  "background:var(--ground-2)",
  "border:1px solid var(--hairline)",
  "color:var(--muted)",
  "font-family:var(--font-mono)",
  "font-size:11px",
  "line-height:1.5",
  "letter-spacing:0.04em",
  "white-space:pre",
  "pointer-events:none",
  "overflow:hidden",
  "text-overflow:ellipsis",
].join(";");

/** Returns null unless `?hero=debug` is present. */
export function createDebug(search: string = location.search): Debug | null {
  if (!debugRequested(search)) return null;
  const el = document.createElement("div");
  el.setAttribute("style", STYLE);
  el.setAttribute("aria-hidden", "true");
  el.textContent = "hero: starting";
  document.body.appendChild(el);

  let last = 0;
  return {
    update(info) {
      // Four updates a second is enough to read, and keeps the readout off the hot path.
      const now = performance.now();
      if (now - last < 250) return;
      last = now;
      const gpu = info.gpu.replace(/^ANGLE \(|\)$/g, "").slice(0, 46);
      el.textContent =
        `tier ${info.tier}  ${(info.points / 1000).toFixed(0)}k points\n` +
        `${info.fps} fps drawn of ${info.ticks} offered  dpr ${info.dpr}\n` +
        `${gpu}`;
    },
    destroy() {
      el.remove();
    },
  };
}
