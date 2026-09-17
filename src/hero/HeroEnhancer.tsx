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
    // Idle, but with a deadline: without one Chrome can defer this for seconds on a busy page.
    const ric = window.requestIdleCallback
      ? (cb: () => void) => window.requestIdleCallback(cb, { timeout: 1200 })
      : (cb: () => void) => window.setTimeout(cb, 200);
    const cic = window.cancelIdleCallback ?? window.clearTimeout;
    const handle = ric(() => {
      import("./mount")
        .then(async (m) => {
          if (!cancelled) dispose = await m.mount();
        })
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
