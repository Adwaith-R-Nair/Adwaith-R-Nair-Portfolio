import { expect, test } from "@playwright/test";

const FLAGSHIPS = ["praman", "honora", "aegisai", "assetize"];
const NAMES = ["Praman", "Honora", "AegisAI", "Assetize", "Nexus", "Zyra"];

test("home renders every section", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("Adwaith R Nair");
  for (const id of ["thesis", "graph", "cases", "also", "oss", "stack", "how", "contact"]) {
    await expect(page.locator(`#${id}`)).toBeVisible();
  }
});

test("home is complete without javascript", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto("/");
  const html = await page.content();
  for (const name of NAMES) expect(html).toContain(name);
  for (const slug of FLAGSHIPS) expect(html).toContain(`/work/${slug}`);
  expect(html).toContain("mailto:adwaith.r.nair189@gmail.com");
  expect(html).toContain("/resume.pdf");
  expect(html).toContain("What I owned");
  await ctx.close();
});

for (const slug of FLAGSHIPS) {
  test(`case study ${slug} renders with owned line and limits`, async ({ page }) => {
    const res = await page.goto(`/work/${slug}`);
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByText("What I owned", { exact: true })).toBeVisible();
    await expect(page.locator("#limits-t")).toHaveText("Honest limits");
  });
}

test("honora links to the verified sepolia contract", async ({ page }) => {
  await page.goto("/work/honora");
  const link = page.locator('a[href*="sepolia.etherscan.io"]');
  await expect(link).toContainText("0xf4e1c0179acC2A54C195e8687621ee070be06B3C");
});

test("unknown work slug is a 404", async ({ page }) => {
  const res = await page.goto("/work/nothing");
  expect(res?.status()).toBe(404);
});

test("reduced motion removes transitions", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("/");
  const longest = await page.evaluate(() => {
    let max = 0;
    for (const el of Array.from(document.querySelectorAll("body *"))) {
      const d = getComputedStyle(el).transitionDuration.split(",").map((s) => parseFloat(s) || 0);
      max = Math.max(max, ...d);
    }
    return max;
  });
  expect(longest).toBe(0);
  await ctx.close();
});

test("no horizontal overflow", async ({ page }) => {
  for (const url of ["/", "/work/praman", "/work/honora"]) {
    await page.goto(url);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, url).toBeLessThanOrEqual(0);
  }
});

test("stack highlighting works from the keyboard", async ({ page }) => {
  await page.goto("/");
  await page.locator('#stack [data-tech="postgresql"]').focus();
  await expect(page.locator('#stack [data-project="praman"]')).toHaveCSS("opacity", "1");
  await expect(page.locator('#stack [data-project="honora"]')).toHaveCSS("opacity", "0.3");
});
