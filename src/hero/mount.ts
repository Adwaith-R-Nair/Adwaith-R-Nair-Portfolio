import { edges as contentEdges, projects } from "@/content";
import { createRenderer, type HeroRenderer, type Offsets } from "./renderer";
import {
  alphaCandidates, sampleConstellation, sampleLine, sampleMask, samplePortrait, type Vec2,
} from "./sampling";
import { weightsFor, type Layout, type Rect } from "./scroll";
import { rasteriseText } from "./text";
import { FrameStepper, NONE, SOFTWARE_GL, TIERS, guessTier, type DeviceHints } from "./tiers";

const NAME = "ADWAITH";
const IMAGE_URL = "/hero-crop.webp";
const WORKER_TIMEOUT_MS = 4000;
const FADE_MS = 600;

export function hintsFromBrowser(): DeviceHints {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  let webgl = false;
  let softwareGl = false;
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") ?? c.getContext("webgl");
    webgl = !!gl;
    if (gl) {
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      const renderer = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
      softwareGl = SOFTWARE_GL.test(renderer);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
  } catch {
    webgl = false;
  }
  // Test hook: headless browsers only have software GL. Never set by the page itself.
  if ((window as Window & { __heroForce?: boolean }).__heroForce === true) softwareGl = false;
  return {
    memory: nav.deviceMemory,
    cores: nav.hardwareConcurrency,
    finePointer: matchMedia("(pointer: fine)").matches,
    minSide: Math.min(innerWidth, innerHeight),
    saveData: nav.connection?.saveData === true,
    webgl,
    softwareGl,
  };
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
  const tierIdx = guessTier(hintsFromBrowser());
  if (tierIdx === NONE) return () => {};
  const dom = findDom();
  if (!dom) return () => {};

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const count = TIERS[tierIdx]!.count;
  let disposed = false;
  let renderer: HeroRenderer | null = null;
  let raf = 0;
  const cleanups: (() => void)[] = [];

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf);
    for (const c of cleanups) c();
    renderer?.dispose();
    renderer = null;
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
      { p0: portrait.pos, col: portrait.col, p1, p2: new Float32Array(count * 3), p3 },
      count,
      tierIdx,
      reduced,
    );
    renderer.resize(innerWidth, innerHeight);

    let cache = readLayout(dom);
    renderer.replaceTarget(2, buildConstellation(cache, count, renderer.unitsPerPixel()));

    const stepper = new FrameStepper(tierIdx);
    let last = 0;
    let fade = 0;
    let curAlpha = 1;
    let lastWeights = weightsFor(scrollY, cache.layout);
    let lastOffsets: Offsets | null = null;
    // Read-only debug hook for device testing. Never written to by the page.
    (window as Window & { __hero?: unknown }).__hero = {
      get state() {
        return { tier: stepper.tier, settled: stepper.settled, weights: lastWeights, offsets: lastOffsets, cache, fade, curAlpha };
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
        last = 0;
        return;
      }
      const raw = last ? t - last : 16;
      last = t;
      // A frame over 80ms is a stall (throttled tab, GC pause), not GPU cost: do not let it step the tier.
      const stalled = raw > 80;
      const dt = Math.min(80, raw);
      const w = weightsFor(scrollY, cache.layout);
      const o = offsets();
      lastWeights = w;
      lastOffsets = o;
      renderer.setWeights(w);
      renderer.setOffsets(o);
      fade = Math.min(1, fade + dt / FADE_MS);
      curAlpha += (w.alpha - curAlpha) * (reduced ? 1 : 1 - Math.exp(-dt / 140));
      const a = fade * curAlpha;
      dom!.stage.style.opacity = a.toFixed(3);
      if (a > 0.005) {
        if (!stalled) {
          const step = stepper.push(dt);
          if (step === NONE) {
            // Even the minimal tier cannot hold the frame budget. Restore the static hero.
            dispose();
            return;
          }
          if (step !== null) {
            renderer.setTier(step);
            document.documentElement.dataset.heroTier = TIERS[step]?.name ?? "";
          }
        }
        renderer.frame(t, dt);
      }
      raf = requestAnimationFrame(loop);
    }

    const start = (): void => {
      if (!raf && !disposed) {
        last = 0;
        raf = requestAnimationFrame(loop);
      }
    };

    let resizeTimer = 0;
    const onResize = (): void => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        if (disposed || !renderer) return;
        renderer.resize(innerWidth, innerHeight);
        cache = readLayout(dom);
        renderer.replaceTarget(2, buildConstellation(cache, count, renderer.unitsPerPixel()));
      }, 150);
    };
    const onMove = (e: PointerEvent): void => {
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
      dispose();
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
