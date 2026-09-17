import { expect, test } from "@playwright/test";

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
