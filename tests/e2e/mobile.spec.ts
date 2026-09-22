import { expect, test, type Page } from "@playwright/test";

const PAGES = ["/", "/work/praman", "/work/honora", "/work/zyra"];

/**
 * Links that are not inline in a sentence must be at least 44 px in both directions.
 * WCAG 2.2 exempts inline links, and the graph legend reads as a sentence.
 */
async function undersizedTargets(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    for (const el of document.querySelectorAll("a")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      const inline = !!el.closest("p") || String(el.parentElement?.getAttribute("class") ?? "").includes("pair");
      if (inline) continue;
      if (r.width < 44 || r.height < 44) {
        out.push(`${(el.textContent ?? "?").trim().slice(0, 24)} ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
    }
    return out;
  });
}

test.describe("phone widths", () => {
  for (const width of [375, 412]) {
    test(`every standalone link is thumb sized at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      for (const path of PAGES) {
        await page.goto(path);
        expect(await undersizedTargets(page), `${path} at ${width}px`).toEqual([]);
      }
    });
  }

  test("the graph nodes carry a tappable area, not just the dot", async ({ page }) => {
    await page.setViewportSize({ width: 412, height: 900 });
    await page.goto("/");
    const box = await page.locator('#graph svg:visible [data-graph-node="praman"] rect').boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });

  test("labels stay readable on phones", async ({ page }) => {
    await page.setViewportSize({ width: 412, height: 900 });
    await page.goto("/");
    const size = await page.evaluate(() =>
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--text-label")),
    );
    expect(size).toBeGreaterThanOrEqual(11);
  });
});
