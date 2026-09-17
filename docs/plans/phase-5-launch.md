# Phase 5: Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put the site live on Vercel with everything a link needs to travel well: a social card, icons, Open Graph and Twitter metadata, a sitemap, robots, structured data, and cookie-free analytics.

**Architecture:** Every launch asset is generated at build time by Next.js file conventions: `opengraph-image.tsx`, `twitter-image.tsx`, `icon.tsx`, `apple-icon.tsx`, `sitemap.ts`, `robots.ts`. Images are rendered with `ImageResponse` from vendored TTF fonts and a PNG of the hero crop. The site URL comes from one helper that reads `NEXT_PUBLIC_SITE_URL`, then Vercel's production URL, then localhost, so attaching a domain later is an environment variable, not a code change.

**Tech Stack:** Next.js 16 metadata routes, `next/og` ImageResponse, `@vercel/analytics`, Playwright.

**Spec:** [docs/design.md](../design.md) sections 2 and 8, [docs/build-spec.md](../build-spec.md) sections 8 and 9. Decisions from Adwaith on 2026-09-17: no domain yet, Vercel account connected to GitHub, Vercel Analytics, hero crop on the card, "ARN" monogram done distinctively, indexable from day one, content confirmed as is.

## Global Constraints

- Nothing in this phase adds client JavaScript to the page except the Vercel Analytics beacon, and `pnpm budget` must still pass.
- Fonts under `src/app/og/fonts/` are the Open Font License files from google/fonts, licence texts alongside. They are read at build time only.
- Copy rules apply to card text. No em dashes, no middle dots.
- Commit messages: `type(scope): summary`, short, no trailer. Adwaith runs git.

## File structure

```
src/lib/site.ts                       siteUrl(), absolute(path)
src/app/og/fonts/*.ttf, OFL-*.txt     vendored fonts
src/app/og/portrait.png               hero crop as PNG, for ImageResponse
src/app/og/card.tsx                   shared card frame: fonts loader, portrait panel, right column
src/app/opengraph-image.tsx           home card
src/app/twitter-image.tsx             re-exports the home card
src/app/work/[slug]/opengraph-image.tsx   per-project card
src/app/work/[slug]/twitter-image.tsx     re-export
src/app/icon.tsx                      32 and 192 px PNG favicons via generateImageMetadata
src/app/apple-icon.tsx                180 px
src/app/sitemap.ts, src/app/robots.ts
src/app/layout.tsx                    metadataBase from siteUrl(), openGraph, twitter, JSON-LD, <Analytics />
src/app/work/[slug]/page.tsx          openGraph and canonical per page
tests/e2e/launch.spec.ts
docs/deploy.md                        Vercel import steps, env var for the future domain
```

---

### Task 1: Site URL helper, metadata, social cards

- [x] Vendor fonts and the portrait PNG (done in the setup step).
- [x] `src/lib/site.ts`:

```ts
/** Canonical origin. Set NEXT_PUBLIC_SITE_URL once a domain exists; Vercel fills the rest. */
export function siteUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return new URL(explicit);
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return new URL(`https://${vercel}`);
  return new URL("http://localhost:3000");
}

export const absolute = (path: string): string => new URL(path, siteUrl()).toString();
```

- [x] `src/app/og/card.tsx`: `loadFonts()` reading the three TTFs, `portraitDataUrl()` reading the PNG as a base64 data URL, and `<Card eyebrow title titleEm? body foot>` returning the JSX for a 1200 by 630 frame: ground background, the portrait on the left with linear-gradient fades over its bottom and right edges, and a right column in the serif and mono with the palette tokens as hex.
- [x] `src/app/opengraph-image.tsx`: alt, size, contentType, and `Image()` returning `new ImageResponse(<Card .../>, { ...size, fonts })` with the name, the thesis line with "have to be trusted" in italic accent, and "Praman, Honora, AegisAI, Assetize" as the foot.
- [x] `src/app/twitter-image.tsx`: `export { default, alt, size, contentType } from "../opengraph-image"` is not allowed by the convention (each file must define its own), so re-implement by importing the shared card and calling it with the same props.
- [x] `src/app/work/[slug]/opengraph-image.tsx`: `generateStaticParams` from flagships, `Image({ params })` with the project's context as eyebrow, name as title, tagline as body, and the headline label and value as the foot.
- [x] `src/app/layout.tsx`: `metadataBase: siteUrl()`, `openGraph: { type: "website", siteName, locale: "en_IN", url: "/" }`, `twitter: { card: "summary_large_image", creator: "@adwaith_r_nair" }`, `alternates: { canonical: "/" }`.
- [x] `src/app/work/[slug]/page.tsx`: `generateMetadata` adds `openGraph: { title, description, url }` and `alternates: { canonical }`.
- [x] Verify: `pnpm build` lists `/opengraph-image`, `/twitter-image`, `/work/[slug]/opengraph-image`; open the PNGs from `pnpm start` and check them in Chrome; `pnpm typecheck && pnpm lint`.
- [x] Commit: `feat(launch): add site url helper, open graph metadata and generated social cards`

### Task 2: Icons

> Also in this task, at Adwaith's request: `/work` pages and cards for Nexus and Zyra (decisions/0003), so every project link carries its own card.

- [x] `src/app/icon.tsx` with `generateImageMetadata` returning ids `small` (32) and `large` (192), and `Icon({ id })` rendering: ground square, a large Instrument Serif "A" in accent set slightly left of centre, and "RN" in IBM Plex Mono in gold at the bottom right, sized relative to the icon. At 32 px the A carries the mark; at 192 the signature reads.
- [x] `src/app/apple-icon.tsx` at 180 px, same drawing, no transparency.
- [x] Verify the `<link rel="icon">` tags in the built HTML and view `/icon` and `/apple-icon` in Chrome.
- [x] Commit: `feat(launch): add generated favicons and apple icon`

### Task 3: Sitemap, robots, structured data, analytics

> `<Analytics />` renders only when `process.env.VERCEL` is set at build. Its script lives at `/_vercel/insights/script.js`, which exists only on Vercel's edge; rendered everywhere, it 404ed and failed the "no console errors" e2e test locally and in CI. Checked in a browser: a `VERCEL=1` build injects and requests the script, a local build does not. The sitemap lists all six projects (decisions/0003), flagships at priority 0.8, Nexus and Zyra at 0.6.

- [x] `src/app/sitemap.ts`: home plus the four flagship pages, `lastModified` at build time, `changeFrequency: "monthly"`.
- [x] `src/app/robots.ts`: allow all user agents everywhere, `sitemap: absolute("/sitemap.xml")`.
- [x] `src/app/layout.tsx`: a `<script type="application/ld+json">` with a `Person`: name, jobTitle "Blockchain and GenAI Engineer", url, email, sameAs [github, linkedin, x], alumniOf MITS Kochi, address Kochi, Kerala, India. And `<Analytics />` from `@vercel/analytics/next` at the end of body.
- [x] Verify: `pnpm build && pnpm budget` still under the limit; `curl /sitemap.xml` and `/robots.txt`; the JSON-LD parses.
- [x] Commit: `feat(launch): add sitemap, robots, person structured data and vercel analytics`

### Task 4: E2E, deploy guide, docs

- [x] `tests/e2e/launch.spec.ts`: sitemap has seven URLs (home plus six projects, decisions/0003); robots allows and names the sitemap; home has `og:image`, `og:title`, `twitter:card=summary_large_image`, a canonical link and a favicon link; `/opengraph-image` and `/icon` return `image/png`; the JSON-LD parses to a Person with the right name; a work page's `og:title` names the project.
- [x] `docs/deploy.md`: import the repo in Vercel (framework Next.js, defaults), first deploy, where `VERCEL_PROJECT_PRODUCTION_URL` comes from, how to set `NEXT_PUBLIC_SITE_URL` when the domain arrives and redeploy, how to attach the domain, and the checks to run on the live URL (sitemap, card preview via a social debugger, Lighthouse).
- [x] `docs/plan.md`: phases 4 and 5 rows; `docs/design.md` hosting row.
- [x] Commit: `test(launch): add launch e2e and the deploy guide; phase 5 complete`
- [ ] Adwaith imports the repo in Vercel and deploys. Verify the live URL from here with curl and a card debugger.

Phase 5 is done when: the site is live on a Vercel URL, `pnpm test:e2e` passes locally, CI is green, and pasting the live URL into a link preview shows the card.
