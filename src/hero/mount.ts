import { edges as contentEdges, projects } from "@/content";
import { browserStore, clearPending, markLost, markPending, resetGuard, shouldSkip } from "./guard";
import { CONTEXT_ATTRIBUTES, createRenderer, type GlHandle, type HeroRenderer, type Offsets } from "./renderer";
import {
  alphaCandidates, sampleConstellation, sampleLine, sampleMask, samplePortrait, type Vec2,
} from "./sampling";
import { weightsFor, type Layout, type Rect } from "./scroll";
import { rasteriseText } from "./text";
import { DISCRETE_GL, FrameStepper, NONE, SOFTWARE_GL, TIERS, guessTier, startTier, type DeviceHints } from "./tiers";

const NAME = "ADWAITH";
const IMAGE_URL = "/hero-crop.webp";
const WORKER_TIMEOUT_MS = 4000;
const FADE_MS = 600;
/** Draw at most 60 times a second; the motion is slow, and a 144 Hz screen gains nothing visible. */
const ACTIVE_FPS = 60;
/** With no scroll or pointer movement for IDLE_MS, the slow drift is drawn at 30. */
const IDLE_FPS = 30;
const IDLE_MS = 2000;

type Window_ = Window & { __heroForce?: boolean; __hero?: unknown };

/** Device facts that need no WebGL context, so weak devices bail before one is ever created. */
function baseHints(): DeviceHints {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  return {
    memory: nav.deviceMemory,
    cores: nav.hardwareConcurrency,
    finePointer: matchMedia("(pointer: fine)").matches,
    minSide: Math.min(innerWidth, innerHeight),
    saveData: nav.connection?.saveData === true,
    webgl: true,
    softwareGl: false,
    discreteGpu: false,
  };
}

interface Probe extends GlHandle {
  name: string;
}

/**
 * Creates the layer's one and only WebGL context and reads the GPU's name from it. The same
 * context is later handed to three.js; there is no throwaway probe context.
 * `failIfMajorPerformanceCaveat` makes the browser refuse when it would fall back to software.
 */
function createContext(forced: boolean): Probe | null {
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2", {
      ...CONTEXT_ATTRIBUTES,
      failIfMajorPerformanceCaveat: !forced,
    }) as WebGL2RenderingContext | null;
    if (!context) return null;
    const ext = context.getExtension("WEBGL_debug_renderer_info");
    const name = String(ext ? context.getParameter(ext.UNMASKED_RENDERER_WEBGL) : context.getParameter(context.RENDERER));
    return { canvas, context, name };
  } catch {
    return null;
  }
}

function release(gl: GlHandle): void {
  try {
    gl.context.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    /* already gone */
  }
}

interface PortraitData {
  pos: Float32Array;
  col: Float32Array;
}

function portraitFromWorker(n: number): Promise<PortraitData> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error("worker timeout"));
    }, WORKER_TIMEOUT_MS);
    worker.onmessage = (e: MessageEvent<PortraitData | { error: string }>) => {
      clearTimeout(timer);
      worker.terminate();
      if ("error" in e.data) reject(new Error(e.data.error));
      else resolve(e.data);
    };
    worker.onerror = (e) => {
      clearTimeout(timer);
      worker.terminate();
      reject(new Error(e.message));
    };
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
    if (getComputedStyle(s).display !== "none") {
      svgEl = s;
      break;
    }
  }
  const nodesDoc: Vec2[] = [];
  const index = new Map<string, number>();
  if (svgEl) {
    for (const p of projects) {
      const c = svgEl.querySelector(`[data-graph-node="${p.slug}"] circle`);
      if (!c) continue;
      const r = c.getBoundingClientRect();
      index.set(p.slug, nodesDoc.length);
      nodesDoc.push({ x: r.left + r.width / 2 + scrollX, y: r.top + r.height / 2 + scrollY });
    }
  }
  const edgeIdx: [number, number][] = [];
  for (const e of contentEdges) {
    const a = index.get(e.from);
    const b = index.get(e.to);
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
  const radius = cache.svg.width * upp * 0.032;
  return sampleConstellation(count, nodes, cache.edgeIdx, radius);
}

export async function mount(): Promise<() => void> {
  const noop = () => {};
  const store = browserStore();
  if (new URLSearchParams(location.search).get("hero") === "reset") resetGuard(store);
  if (shouldSkip(store, Date.now())) return noop;

  const forced = (window as Window_).__heroForce === true;
  const dom = findDom();
  if (!dom) return noop;
  if (guessTier(baseHints()) === NONE) return noop;

  // From here, whenever the tab is visible, a browser crash leaves this set. Hidden tabs draw
  // nothing and cannot fault the GPU, so hiding or closing the tab clears it.
  markPending(store, Date.now());
  const onPageHide = (): void => clearPending(store);
  const onPendingVisibility = (): void => {
    if (document.hidden) clearPending(store);
    else markPending(store, Date.now());
  };
  addEventListener("pagehide", onPageHide);
  document.addEventListener("visibilitychange", onPendingVisibility);
  const unwatchPending = (): void => {
    removeEventListener("pagehide", onPageHide);
    document.removeEventListener("visibilitychange", onPendingVisibility);
  };

  const probe = createContext(forced);
  const hints: DeviceHints = {
    ...baseHints(),
    webgl: !!probe,
    softwareGl: !forced && !!probe && SOFTWARE_GL.test(probe.name),
    discreteGpu: !!probe && DISCRETE_GL.test(probe.name),
  };
  const ceiling = guessTier(hints);
  const tierIdx = startTier(ceiling, hints);
  if (!probe || ceiling === NONE) {
    if (probe) release(probe);
    unwatchPending();
    clearPending(store);
    return noop;
  }

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Allocate for the ceiling so a proven-fast device can step up without new geometry.
  const count = TIERS[ceiling]!.count;
  let disposed = false;
  let renderer: HeroRenderer | null = null;
  let raf = 0;
  const cleanups: (() => void)[] = [unwatchPending];

  function dispose(reason: "lost" | "normal" = "normal"): void {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf);
    for (const c of cleanups) c();
    if (renderer) renderer.dispose();
    else release(probe!);
    renderer = null;
    if (reason === "lost") markLost(store, Date.now());
    else clearPending(store);
    delete document.documentElement.dataset.particles;
    delete document.documentElement.dataset.heroTier;
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
      dom.stage,
      probe,
      { p0: portrait.pos, col: portrait.col, p1, p2: new Float32Array(count * 3), p3 },
      count,
      tierIdx,
      reduced,
    );
    renderer.resize(innerWidth, innerHeight);

    let cache = readLayout(dom);
    renderer.replaceTarget(2, buildConstellation(cache, count, renderer.unitsPerPixel()));

    const stepper = new FrameStepper(tierIdx, { ceiling });
    let lastTick = 0;
    let lastRender = 0;
    let acc = 0;
    let lastActivity = performance.now();
    let lastScrollY = scrollY;
    let fade = 0;
    let curAlpha = 1;
    let lastWeights = weightsFor(scrollY, cache.layout);
    let lastOffsets: Offsets | null = null;
    // Read-only debug hook for device testing. Never written to by the page.
    (window as Window_).__hero = {
      get state() {
        return {
          gpu: probe.name, ceiling, tier: stepper.tier, settled: stepper.settled,
          weights: lastWeights, offsets: lastOffsets, cache, fade, curAlpha,
        };
      },
    };

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
        // The name sits in the upper third; the thesis text is pushed to the bottom while live.
        off1: [0, vis.h * 0.2],
        s1: Math.min((0.62 * vis.w) / textWidthUnits, 0.5 * vis.h),
        off2: svg ? toWorld(svg.left + svg.width / 2, svg.top + svg.height / 2) : [0, 0],
        off3: toWorld(ct.left + ct.width / 2, ct.top + ct.height * 0.2),
        s3: 0.8 * vis.w,
      };
    }

    function loop(t: number): void {
      if (disposed || !renderer) return;
      if (document.hidden) {
        raf = 0;
        lastTick = 0;
        lastRender = 0;
        return;
      }
      const tick = lastTick ? t - lastTick : 1000 / ACTIVE_FPS;
      lastTick = t;
      // Never draw into a minimised or zero-size window.
      if (innerWidth < 2 || innerHeight < 2) {
        raf = requestAnimationFrame(loop);
        return;
      }
      if (scrollY !== lastScrollY) {
        lastScrollY = scrollY;
        lastActivity = t;
      }

      // The stepper sees every browser frame while the layer is on screen, slow ones included:
      // a slow tick is exactly the signal it exists to catch.
      if (fade < 1 || fade * curAlpha > 0.005) {
        const step = stepper.push(tick);
        if (step === NONE) {
          dispose();
          return;
        }
        if (step !== null) {
          renderer.setTier(step);
          document.documentElement.dataset.heroTier = TIERS[step]?.name ?? "";
        }
      }

      // Pace drawing to 60 fps, or 30 when idle, carrying the remainder so the average holds.
      const idle = fade >= 1 && t - lastActivity > IDLE_MS;
      const interval = 1000 / (idle ? IDLE_FPS : ACTIVE_FPS);
      acc += tick;
      if (acc < interval - 0.5) {
        raf = requestAnimationFrame(loop);
        return;
      }
      acc = Math.min(acc - interval, interval);
      const dt = Math.min(80, lastRender ? t - lastRender : interval);
      lastRender = t;

      const w = weightsFor(scrollY, cache.layout);
      const o = offsets();
      lastWeights = w;
      lastOffsets = o;
      renderer.setWeights(w);
      renderer.setOffsets(o);
      fade = reduced ? 1 : Math.min(1, fade + dt / FADE_MS);
      curAlpha += (w.alpha - curAlpha) * (reduced ? 1 : 1 - Math.exp(-dt / 140));
      const a = fade * curAlpha;
      dom!.stage.style.opacity = a.toFixed(3);
      if (a > 0.005) renderer.frame(t, dt);
      raf = requestAnimationFrame(loop);
    }

    const start = (): void => {
      if (!raf && !disposed) {
        lastTick = 0;
        lastRender = 0;
        acc = 0;
        raf = requestAnimationFrame(loop);
      }
    };

    let resizeTimer = 0;
    const onResize = (): void => {
      lastActivity = performance.now();
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        if (disposed || !renderer) return;
        renderer.resize(innerWidth, innerHeight);
        cache = readLayout(dom);
        renderer.replaceTarget(2, buildConstellation(cache, count, renderer.unitsPerPixel()));
      }, 150);
    };
    const onMove = (e: PointerEvent): void => {
      lastActivity = performance.now();
      renderer?.setPointer(e.clientX, e.clientY);
    };
    const onLeave = (): void => {
      renderer?.clearPointer();
    };
    const onVisibility = (): void => {
      if (!document.hidden) start();
    };
    const onLost = (e: Event): void => {
      e.preventDefault();
      dispose("lost");
    };

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
    document.documentElement.dataset.heroTier = TIERS[tierIdx]?.name ?? "";
    start();
    return dispose;
  } catch {
    dispose();
    return dispose;
  }
}
