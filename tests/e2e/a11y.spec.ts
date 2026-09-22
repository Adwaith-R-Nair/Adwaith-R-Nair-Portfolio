import { expect, test } from "@playwright/test";

const capable = () => {
  Object.defineProperty(navigator, "deviceMemory", { get: () => 8 });
  Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 });
  (window as Window & { __heroForce?: boolean }).__heroForce = true;
};

test("the skip link is the first stop and jumps to the content", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toHaveText("Skip to content");
  await page.keyboard.press("Enter");
  expect(page.url()).toContain("#main");
});

test("every keyboard stop shows a visible focus indicator", async ({ page }) => {
  await page.goto("/");
  const missing: string[] = [];
  for (let i = 0; i < 45; i++) {
    await page.keyboard.press("Tab");
    const stop = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      const outline = cs.outlineStyle !== "none" && (parseFloat(cs.outlineWidth) || 0) > 0;
      const shadow = cs.boxShadow !== "none";
      // SVG links draw their ring as a stroke on the hit area instead of a CSS outline.
      const stroked = [...el.querySelectorAll("rect, circle")].some((c) => {
        const s = getComputedStyle(c);
        return s.stroke !== "none" && (parseFloat(s.strokeWidth) || 0) > 0;
      });
      return {
        ok: outline || shadow || stroked,
        label: (el.getAttribute("aria-label") ?? el.textContent ?? el.tagName).trim().slice(0, 30),
      };
    });
    if (!stop) break;
    if (!stop.ok) missing.push(stop.label);
  }
  expect(missing).toEqual([]);
});

test("a focused graph node draws a ring around its target area", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    const svg = [...document.querySelectorAll("#graph svg")].find((s) => getComputedStyle(s).display !== "none");
    (svg!.querySelector('[data-graph-node="honora"]') as SVGElement).focus();
  });
  const ring = await page.evaluate(() => {
    const rect = document.activeElement!.querySelector("rect")!;
    const cs = getComputedStyle(rect);
    return { stroke: cs.stroke, width: parseFloat(cs.strokeWidth) };
  });
  expect(ring.stroke).not.toBe("none");
  expect(ring.width).toBeGreaterThanOrEqual(2);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("nothing transitions or animates, and scrolling is not smoothed", async ({ page }) => {
    await page.goto("/");
    const r = await page.evaluate(() => {
      let t = 0;
      let a = 0;
      for (const el of document.querySelectorAll("body *")) {
        const cs = getComputedStyle(el);
        for (const d of cs.transitionDuration.split(",")) t = Math.max(t, parseFloat(d) || 0);
        for (const d of cs.animationDuration.split(",")) a = Math.max(a, parseFloat(d) || 0);
      }
      return { t, a, scroll: getComputedStyle(document.documentElement).scrollBehavior };
    });
    expect(r.t).toBe(0);
    expect(r.a).toBe(0);
    expect(r.scroll).toBe("auto");
  });

  test("the particle portrait holds still", async ({ page }) => {
    await page.addInitScript(capable);
    await page.goto("/");
    const webgl = await page.evaluate(() => {
      const c = document.createElement("canvas");
      return !!c.getContext("webgl2");
    });
    test.skip(!webgl, "no WebGL in this browser");
    await expect(page.locator("html")).toHaveAttribute("data-particles", "on", { timeout: 30_000 });
    await page.waitForTimeout(1500);
    const still = await page.evaluate(async () => {
      const c = document.querySelector("#hero-stage canvas") as HTMLCanvasElement;
      const gl = c.getContext("webgl2") as WebGL2RenderingContext;
      const read = () => {
        const a = new Uint8Array(400 * 4);
        gl.readPixels(0, 0, 400, 1, gl.RGBA, gl.UNSIGNED_BYTE, a);
        return a.join(",");
      };
      const before = read();
      await new Promise((r) => setTimeout(r, 900));
      return before === read();
    });
    expect(still, "drift must stop under reduced motion").toBe(true);
  });
});
