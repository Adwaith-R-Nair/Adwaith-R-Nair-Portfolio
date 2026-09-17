import { expect, test } from "@playwright/test";

const FLAGSHIPS = ["praman", "honora", "aegisai", "assetize"];
const ALL = [...FLAGSHIPS, "nexus", "zyra"];

for (const slug of FLAGSHIPS) {
  test(`${slug} has a server-rendered, textual architecture diagram`, async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(`/work/${slug}`);
    const svg = page.locator(`figure[data-diagram="diagram-${slug}"] svg`);
    await expect(svg).toHaveCount(1);
    await expect(svg).toHaveAttribute("role", "img");
    expect(await svg.locator("text").count()).toBeGreaterThan(8);
    await ctx.close();
  });
}

test("honora's proof element links to the verified contract", async ({ page }) => {
  await page.goto("/work/honora");
  const proof = page.locator('a[href^="https://sepolia.etherscan.io/address/"]').first();
  await expect(proof).toContainText("Deployed and source-verified");
  await expect(proof).toContainText("Open on Etherscan");
});

test("neighbour navigation cycles through all six projects", async ({ page }) => {
  await page.goto("/work/praman");
  await page.getByRole("link", { name: /Next/ }).click();
  await expect(page).toHaveURL(/\/work\/honora$/);
  await page.getByRole("link", { name: /Previous/ }).click();
  await expect(page).toHaveURL(/\/work\/praman$/);
});

test("case studies never scroll sideways, diagram included", async ({ page }) => {
  for (const slug of ALL) {
    await page.goto(`/work/${slug}`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, slug).toBeLessThanOrEqual(0);
  }
});

test("print media renders black on white with no particle stage", async ({ page }) => {
  await page.goto("/work/honora");
  await page.emulateMedia({ media: "print" });
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe("rgb(255, 255, 255)");
  const stage = await page.evaluate(() => {
    const el = document.getElementById("hero-stage");
    return el ? getComputedStyle(el).display : "absent";
  });
  expect(["none", "absent"]).toContain(stage);
});
