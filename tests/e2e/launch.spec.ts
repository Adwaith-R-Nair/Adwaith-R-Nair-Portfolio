import { expect, test } from "@playwright/test";

const PROJECTS = ["praman", "honora", "aegisai", "assetize", "nexus", "zyra"];

test("the sitemap lists the home page and every project", async ({ request }) => {
  const res = await request.get("/sitemap.xml");
  expect(res.status()).toBe(200);
  const xml = await res.text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]!).pathname);
  expect(locs).toHaveLength(PROJECTS.length + 1);
  expect(locs).toContain("/");
  for (const slug of PROJECTS) expect(locs).toContain(`/work/${slug}`);
});

test("robots allows every crawler and names the sitemap", async ({ request }) => {
  const res = await request.get("/robots.txt");
  expect(res.status()).toBe(200);
  const txt = await res.text();
  expect(txt).toMatch(/User-Agent: \*/i);
  expect(txt).toMatch(/Allow: \//);
  expect(txt).toMatch(/Sitemap: https?:\/\/[^\s]+\/sitemap\.xml/);
});

test("the home page carries social and canonical metadata", async ({ page }) => {
  await page.goto("/");
  const content = async (selector: string) => page.locator(selector).first().getAttribute("content");
  expect(await content('meta[property="og:title"]')).toContain("Adwaith R Nair");
  expect(await content('meta[property="og:image"]')).toContain("/opengraph-image");
  expect(await content('meta[property="og:image:width"]')).toBe("1200");
  expect(await content('meta[property="og:image:height"]')).toBe("630");
  expect(await content('meta[name="twitter:card"]')).toBe("summary_large_image");
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  await expect(page.locator('link[rel="icon"]')).not.toHaveCount(0);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
});

test("every project page names itself in its social metadata", async ({ page }) => {
  for (const slug of PROJECTS) {
    await page.goto(`/work/${slug}`);
    const title = await page.locator('meta[property="og:title"]').first().getAttribute("content");
    expect(title?.toLowerCase(), slug).toContain(slug === "aegisai" ? "aegisai" : slug);
    const image = await page.locator('meta[property="og:image"]').first().getAttribute("content");
    expect(image, slug).toContain(`/work/${slug}/opengraph-image`);
  }
});

test("generated images are real PNGs", async ({ request }) => {
  const urls = ["/opengraph-image", "/twitter-image", "/work/praman/opengraph-image", "/icon/small", "/icon/large", "/apple-icon"];
  for (const url of urls) {
    const res = await request.get(url);
    expect(res.status(), url).toBe(200);
    expect(res.headers()["content-type"], url).toContain("image/png");
    const body = await res.body();
    // PNG magic number, so a redirect to an HTML error page cannot pass.
    expect(body.subarray(0, 4).toString("hex"), url).toBe("89504e47");
  }
});

test("the page carries Person structured data", async ({ page }) => {
  await page.goto("/");
  const raw = await page.locator('script[type="application/ld+json"]').first().textContent();
  const data = JSON.parse(raw ?? "{}");
  expect(data["@type"]).toBe("Person");
  expect(data.name).toBe("Adwaith R Nair");
  expect(data.jobTitle).toBe("Blockchain and GenAI Engineer");
  expect(data.sameAs).toContain("https://github.com/Adwaith-R-Nair");
});

test("no analytics beacon outside vercel, so nothing 404s", async ({ page }) => {
  const failed: string[] = [];
  page.on("requestfailed", (r) => failed.push(r.url()));
  page.on("response", (r) => { if (r.status() === 404) failed.push(r.url()); });
  await page.goto("/");
  await page.waitForTimeout(1500);
  expect(failed).toEqual([]);
});
