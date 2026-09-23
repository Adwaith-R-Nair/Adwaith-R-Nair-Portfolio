import { expect, test } from "@playwright/test";

test("the particle layer never loads when webgl is software rendered", async ({ page }) => {
  // Playwright's headless Chromium is exactly that device. No hints spoofed.
  await page.goto("/");
  await page.waitForTimeout(2500);
  expect(await page.locator("#hero-stage canvas").count()).toBe(0);
  await expect(page.locator("html")).not.toHaveAttribute("data-particles", "on");
  // Bailing out leaves no crash sentinel behind.
  expect(await page.evaluate(() => localStorage.getItem("hero:v1"))).toBeNull();
});

test("the particle layer never loads on a low-memory device", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "deviceMemory", { get: () => 2 });
  });
  await page.goto("/");
  await page.waitForTimeout(2500);
  expect(await page.locator("#hero-stage canvas").count()).toBe(0);
  await expect(page.locator("html")).not.toHaveAttribute("data-particles", "on");
  await expect(page.locator("#hero-portrait")).toHaveCSS("opacity", "1");
});

test("the particle layer mounts over the portrait when the device allows it", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "deviceMemory", { get: () => 8 });
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 });
    // Headless Chromium only has software GL, which the layer refuses. Force past that check.
    (window as Window & { __heroForce?: boolean }).__heroForce = true;
  });
  await page.goto("/");
  const webgl = await page.evaluate(() => {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") ?? c.getContext("webgl"));
  });
  test.skip(!webgl, "no WebGL in this browser");
  await expect(page.locator("html")).toHaveAttribute("data-particles", "on", { timeout: 20_000 });
  await expect(page.locator("#hero-stage canvas")).toHaveCount(1);
  await expect(page.locator("#hero-portrait")).toHaveCSS("opacity", "0");
});

test("the home page logs no console errors with the layer active", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/");
  await page.waitForTimeout(3000);
  await page.mouse.wheel(0, 4000);
  await page.waitForTimeout(1000);
  expect(errors).toEqual([]);
});

/* ---- crash memory ------------------------------------------------------------------------ */

const forceCapable = () => {
  Object.defineProperty(navigator, "deviceMemory", { get: () => 8 });
  Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 });
  (window as Window & { __heroForce?: boolean }).__heroForce = true;
};

const readGuard = (page: import("@playwright/test").Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("hero:v1") ?? "{}") as { pending?: number; disabledUntil?: number });

test("a visit that died while drawing keeps the particles off next time", async ({ page }) => {
  await page.addInitScript(forceCapable);
  await page.addInitScript(() => {
    // What a browser crash mid-draw leaves behind.
    localStorage.setItem("hero:v1", JSON.stringify({ pending: Date.now() - 60_000 }));
  });
  await page.goto("/");
  await page.waitForTimeout(3000);
  expect(await page.locator("#hero-stage canvas").count()).toBe(0);
  await expect(page.locator("#hero-portrait")).toHaveCSS("opacity", "1");
  const g = await readGuard(page);
  expect(g.pending).toBeUndefined();
  expect(g.disabledUntil ?? 0).toBeGreaterThan(Date.now() + 6 * 24 * 3600_000);
});

test("?hero=reset clears the crash memory", async ({ page }) => {
  await page.addInitScript(forceCapable);
  await page.addInitScript(() => {
    localStorage.setItem("hero:v1", JSON.stringify({ disabledUntil: Date.now() + 86_400_000 }));
  });
  await page.goto("/?hero=reset");
  await expect(page.locator("html")).toHaveAttribute("data-particles", "on", { timeout: 20_000 });
});

test("the sentinel is set while drawing and cleared by a normal navigation", async ({ page }) => {
  await page.addInitScript(forceCapable);
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-particles", "on", { timeout: 20_000 });
  expect((await readGuard(page)).pending).toBeGreaterThan(0);
  await page.goto("/work/praman");
  const g = await readGuard(page);
  expect(g.pending).toBeUndefined();
  expect(g.disabledUntil).toBeUndefined();
});

test("a lost WebGL context removes the layer and keeps it off for a week", async ({ page }) => {
  await page.addInitScript(forceCapable);
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-particles", "on", { timeout: 20_000 });
  await page.evaluate(() => {
    const c = document.querySelector("#hero-stage canvas") as HTMLCanvasElement;
    (c.getContext("webgl2") as WebGL2RenderingContext).getExtension("WEBGL_lose_context")!.loseContext();
  });
  await expect(page.locator("html")).not.toHaveAttribute("data-particles", "on");
  expect(await page.locator("#hero-stage canvas").count()).toBe(0);
  const g = await readGuard(page);
  expect(g.disabledUntil ?? 0).toBeGreaterThan(Date.now() + 6 * 24 * 3600_000);
});

test("integrated and unknown GPUs start below the top tier", async ({ page }) => {
  await page.addInitScript(forceCapable);
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-particles", "on", { timeout: 20_000 });
  await expect(page.locator("html")).toHaveAttribute("data-hero-tier", "balanced");
});

test("the debug readout appears only with ?hero=debug", async ({ page }) => {
  await page.addInitScript(forceCapable);
  const readoutCount = () =>
    page.evaluate(() => [...document.body.children].filter((e) => (e.textContent ?? "").startsWith("tier ")).length);

  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-particles", "on", { timeout: 20_000 });
  expect(await readoutCount(), "a normal visit shows nothing").toBe(0);

  await page.goto("/?hero=debug");
  await expect(page.locator("html")).toHaveAttribute("data-particles", "on", { timeout: 20_000 });
  await page.waitForTimeout(1500);
  expect(await readoutCount(), "the readout is present").toBe(1);
  const text = await page.evaluate(
    () => [...document.body.children].map((e) => e.textContent ?? "").find((t) => t.startsWith("tier ")) ?? "",
  );
  expect(text).toMatch(/tier (high|balanced|light|minimal)\s+\d+k points/);
  expect(text).toMatch(/\d+ fps drawn of \d+ offered/);
});
