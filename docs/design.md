# Portfolio: system design

**Status:** approved 2026-09-17
**Source of truth for content, palette, copy rules and attribution:** [build-spec.md](./build-spec.md). This document does not repeat it. It describes how the site is built so that every rule in the spec holds.

Where this document and the build spec disagree, the build spec's non-negotiables (section 2) win, then this document, then the rest of the build spec. Every deliberate deviation from the build spec has a record in [decisions/](./decisions/).

---

## 1. Goals

1. The full portfolio is readable, scannable in 90 seconds, and indexable with JavaScript disabled.
2. The hero particle portrait runs at 60 fps on desktop and 45 fps or better on a mid-range Android, or steps itself down until it does.
3. The site reads as a set technical document, not as a landing page. Nothing on it should look like it came from a component gallery.
4. Every phase ships a site that could be the final site.

## 2. Stack

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js 16, App Router, React Server Components | Static generation of every page at build time, no client JS for content. |
| Language | TypeScript, `strict: true` | Content is typed data; the compiler catches a missing "what I owned" line. |
| Package manager | pnpm | Strict, fast, clean lockfile on Vercel. |
| Styling | CSS Modules + one global tokens file | Design system is bespoke and small. No utility framework, no runtime CSS. |
| Fonts | `next/font/google` for Instrument Serif and IBM Plex Mono, self-hosted at build | No third-party request, no swap flash, `size-adjust` fallbacks generated automatically. |
| WebGL | three.js core, imperative, no React Three Fiber | See [decisions/0001-vanilla-three-not-r3f.md](./decisions/0001-vanilla-three-not-r3f.md). |
| Unit tests | Vitest | Pure sampling, tier and copy-rule modules. |
| Browser tests | Playwright | Smoke, no-JS, reduced-motion. |
| Perf gate | Lighthouse CI, mobile preset, on every push | Fails under 90 performance. |
| Hosting | Vercel, Git integration | Zero-config Next.js, edge CDN, image optimisation. `src/lib/site.ts` resolves the canonical origin from `NEXT_PUBLIC_SITE_URL`, then Vercel's production URL, then localhost, so attaching a domain is an environment variable and a redeploy. See [deploy.md](./deploy.md). |

## 3. Repository layout

```
docs/
  build-spec.md            handoff from the design session, unchanged
  design.md                this file
  plan.md                  phased implementation plan, one commit per step
  hero-reference.html      working reference implementation of the hero
  decisions/               short records of deviations from the spec
src/
  app/
    layout.tsx             html shell, fonts, metadata, skip link
    page.tsx               home: the nine sections
    work/[slug]/page.tsx   full case study, statically generated for four slugs
    opengraph-image.tsx    1200x630 social card, generated at build
    sitemap.ts, robots.ts
  content/
    types.ts               Project, Edge, StackEntry, Identity
    projects.ts            six projects, all fields
    edges.ts               seven graph edges with shared-concern labels
    stack.ts               built with / worked with / exploring
    identity.ts            name, links, study, work
    copy.ts                section headings and paragraphs
  components/
    <section>/             one folder per home section, server-rendered
    diagrams/              inline SVG architecture diagrams, one per flagship
    ui/                    Eyebrow, Rule, StatusChip, Proof, Measure
  hero/
    sampling.ts            pure: portrait, text, constellation, line targets
    tiers.ts               pure: tier table, device guess, frame-time stepper
    shaders.ts             vertex and fragment source
    worker.ts              runs sampling off the main thread
    renderer.ts            imperative three.js setup and loop, no React
    HeroParticles.tsx      client component, mounts renderer over the static image
    scroll.ts              maps section positions to state weights
  styles/
    tokens.css             colour, type, spacing, measure
    globals.css            reset, body, focus, selection
public/
  hero-crop.webp           particle sampling source, 739x900
  portrait.png             full cutout, for the social card
  resume.pdf
tests/
  unit/                    vitest
  e2e/                     playwright
```

## 4. Content model

All content lives in `src/content/` as typed constants. No CMS, no markdown parsing at runtime. Editing the site means editing a TypeScript file and the compiler tells you what you broke.

```ts
type Status = "live" | "testnet" | "prototype" | "demo";

interface Project {
  slug: "praman" | "honora" | "aegisai" | "assetize" | "nexus" | "zyra";
  name: string;
  tagline: string;              // "agentic commerce control plane"
  status: Status;
  flagship: boolean;            // true for the four with /work pages
  owned: string;                // the binding "what I owned" line, never empty
  team?: { size: number; credits: { name: string; owned: string }[] };
  repo: string;
  period: string;
  problem: string;              // one concrete paragraph
  architecture: string[];       // paragraphs
  decisions: { title: string; body: string }[];
  proof: { label: string; value: string }[];   // measured, never asserted
  bugs?: { title: string; body: string }[];
  limits: string[];             // published honestly
  scale?: { label: string; value: string }[];
  stack: string[];              // keys into stack.ts
  diagram?: "praman" | "honora" | "aegisai" | "assetize";
  onchain?: { network: string; address: string; explorer: string };
}

interface Edge {
  from: Project["slug"];
  to: Project["slug"];
  concern: string;              // the real shared concern
}
```

A unit test walks every string in `src/content/` and fails on: an em dash, the words "revolutionary", "cutting-edge", "seamless", "leverage", "innovative", or an empty `owned` field on any project. This makes the spec's copy rules and attribution rules a build failure rather than a review comment.

## 5. Pages and sections

### Home (`/`)

Nine sections in spec order. Each is a server component in its own folder with its own CSS module. Sections have stable ids so the hero can read their positions. The italic accent phrase from the spec is used in the thesis and contact headings only.

| # | Section | Renders |
|---|---|---|
| 0 | Hero | Static `<img>` of hero-crop.webp, name, location eyebrow. Canvas mounts over it later. |
| 1 | Thesis | "I build systems that have to be trusted." plus the four-project paragraph. |
| 2 | Graph | Six nodes, seven labelled edges, as inline SVG. Every node is a real link. Edge labels are horizontal, sitting in a gap cut into each line. On phones a second, portrait layout of the same graph renders with names only, and a list of "A and B: concern" lines beneath it is the legend, because the concern labels cannot fit beside the lines at that width. |
| 3 | Case studies | Four entries: name, status chip, one proof line, "what I owned", link to `/work/<slug>`. |
| 4 | Also built | Nexus and Zyra, plain two-column text. No decoration. Names link to their `/work` pages (decisions/0003). |
| 5 | Open source | One line. GSoC 2024, Oppia. |
| 6 | Stack | Three lists. Hovering or focusing a technology adds `data-active` to it, and CSS highlights the project names carrying that technology in the case-study list above. Pure CSS via `:has()`, with a JS-free fallback of nothing happening. |
| 7 | How I build | Four short numbered paragraphs, drafted by Claude, corrected by Adwaith. |
| 8 | Contact | Email, GitHub, LinkedIn, X, résumé. Particles collapse to a line behind it. |

### Case study (`/work/[slug]`)

Statically generated for all six projects (decisions/0003); Nexus and Zyra render as shorter case studies with the same component. Structure in order: name and status, "what I owned" and team credits, on-chain proof element if present (Honora's Etherscan link, set large), problem, architecture diagram as inline SVG, architecture prose, decisions, measured proof, bugs worth telling, honest limits, scale figures, stack, repo link, links to the two neighbouring case studies.

Each diagram is data: a typed spec of boxes, arrows, one dashed trust-boundary region and notes in `src/components/diagrams/<slug>.ts`, rendered by one server component into inline SVG using the tokens, the mono face, hairline boxes and the same label-in-a-gap device as the project graph. Unit tests check every spec for unique ids, real edge endpoints, boxes inside the frame, no overlaps and no banned copy. Under 720px the figure scrolls sideways inside its own container. A print stylesheet swaps the palette to black on white, hides the particle stage, and prints link targets after external links.

## 6. Design system

The tokens in the build spec are the whole palette. This section is about how they are used.

**Register.** The page is set like a technical document that happens to be beautiful. Each section carries a mono label in small caps at 10.5px with `.2em` tracking in a left column, and nothing else: no section numbers, because the sections are not a sequence. Eyebrow labels appear only where the build spec uses them, the hero and the graph. Hairline rules, not boxes. No cards, no drop shadows, no glass, no gradient blobs, no icon grids, no rounded corners larger than 2px, no scroll-triggered fade-ups. The reader should feel that someone chose every line.

**Type scale.** Display sizes from `clamp()` with a 1.25 ratio from 40px to 96px. Body 15px on desktop, 14px on phones, line-height 1.65, measure 65ch. Labels 10.5px uppercase tracked. Figures always `tabular-nums`. All headings `text-wrap: balance`.

**Grid.** Home prose column `min(760px, 86vw)`, wide sections `min(1180px, 92vw)`. Wide sections use a two-column grid: a 160px mono label column on the left carrying the section number and title, and the content on the right. On viewports under 720px the label column stacks above. Spacing only through `gap` and a vertical rhythm scale of 8px multiples exposed as tokens.

**Colour use.** `--ground` everywhere behind content. `--ground-2` only for the code-like proof and limits blocks. `--accent` for italic emphasis and hover. `--gold` for the Etherscan proof element and the active rail dot, nowhere else. Status chips use three separate semantic colours defined in tokens, never the accent.

**Motion.** The particle system, hover state on links (underline offset shift), chip hover, and the graph edge-label reveal. Nothing else moves. `prefers-reduced-motion` removes every transition and makes hero morphs instant.

**Anti-patterns to reject in review.** Anything that would look at home on a SaaS landing page: testimonial-style quotes, feature grids with icons, "scroll to explore" bounce arrows, animated counters, gradient text.

## 7. Hero layer

The hero is the only client-side enhancement. It is a real image first and a particle field second.

### Static baseline

`<img src="/hero-crop.webp">` rendered by the server inside the hero section with the CSS vignette from the reference, `fetchpriority="high"`, explicit width and height. This is the LCP element. Without JavaScript this is the hero, and it is fine.

### Mount sequence

1. Page paints. Content is complete.
2. On `requestIdleCallback` with a 1.2 s deadline (fallback `setTimeout` 200ms) the client component imports the layer. The device guess runs inside it; tier "none" stops there.
3. The worker fetches hero-crop.webp, decodes it with `createImageBitmap`, runs importance sampling, and transfers the typed arrays back. If workers or `OffscreenCanvas` are unavailable, or the worker fails or exceeds 4 s, the same sampler runs on the main thread.
4. Meanwhile, after `document.fonts.ready`, the main thread rasterises "ADWAITH" in the loaded serif and samples it, builds the line target, and reads the visible graph SVG's node positions to build the constellation in world units relative to the SVG's centre.
5. The renderer builds the geometry once at the guessed tier. The canvas fades in over 600 ms while CSS fades the static image out. The particle portrait tracks the image's document rect each frame, so it sits exactly on the image and scrolls with the page until it dissolves. The shader carries an elliptical alpha fade matching the CSS mask on the image, so the two are indistinguishable at the crossover.
6. The measured stepper runs as in the spec: 40-frame warm-up, then the median of the last 50 frames every 50 frames, step down above 21 ms, settle when it holds. Frames over 80 ms are stalls and are not counted.
7. Easing is time-based, so states converge in the same wall time at any frame rate. `html[data-hero-tier]` and a read-only `window.__hero.state` expose the tier, weights and layout for device testing.

### Tiers

| Tier | Points | Max DPR | Initial guess |
|---|---|---|---|
| high | 170,000 | 2.00 | fine pointer, min viewport side >= 700, >= 8 cores, >= 8 GB |
| balanced | 95,000 | 1.60 | fine pointer and >= 4 cores, or >= 6 cores and >= 4 GB |
| light | 46,000 | 1.25 | >= 4 cores |
| minimal | 20,000 | 1.00 | everything else |
| none | 0 | n/a | <= 2 cores, or <= 2 GB, or `saveData`, or no WebGL context, or WebGL rasterised in software (SwiftShader, llvmpipe: every frame is a main-thread long task) |

Point size is `700 / sqrt(activeCount)`. Stepping down changes only `setDrawRange` and `setPixelRatio`. Stepping up never happens. If the minimal tier still cannot hold twice the frame budget, the layer disposes itself and the static hero returns.

### States

Four target attribute sets are built once: portrait, name, constellation, line. Weights come from scroll position relative to real section boundaries, not a fixed spacer: the portrait holds over the Hero section, dissolves into the name over Thesis, resolves into the constellation over Graph, and stays as constellation until Also built, where the canvas fades out. Over Contact the canvas fades back in and the points collapse to a horizontal line. Between Also built and Contact the render loop is paused, not just hidden, so the quiet stretch costs nothing.

Interaction rules are the spec's: light and up to 4 degrees of parallax on the portrait, repulsion with `force = 1 - w0` elsewhere. The face is never displaced.

### Failure handling

- `webglcontextlost`: cancel the loop, remove the canvas, the image is already there.
- Worker error or timeout over 4 seconds: give up silently, static hero stays.
- `document.hidden`: loop stops, resumes on visibility.
- Resize: renderer resizes, geometry untouched.

## 8. Performance plan

| Budget | How it is met |
|---|---|
| LCP < 2.0s mid-tier Android | Hero image preloaded, 85 KB, no font swap, no client JS on the critical path. |
| Initial JS < 150 KB gz (modern browsers) | Next 16 runtime is about 139 KB on its own; see decisions/0002. Our client code is under 10 KB. `pnpm budget` checks it in CI. |
| WebGL bundle lazy | Dynamic `import()` from the one client component, requested on idle with a 1.2 s deadline. About 140 KB gz, never on the critical path. |
| No layout shift | Every image has dimensions, fonts have size-adjusted fallbacks, canvas is `position: fixed` and never in flow. |
| 60 / 45 fps | Tier stepping on measured medians. |
| Lighthouse 90+ mobile | Lighthouse CI in GitHub Actions on every push. |

## 9. Testing

- **Unit (Vitest):** `sampling.ts` on a synthetic 8x8 image with a known gradient, asserting points cluster on edges and never land on transparent pixels. `tiers.ts` with fake frame sequences, asserting step-down timing and settle. `scroll.ts` with fake section rectangles. The content rule test from section 4.
- **End to end (Playwright):** each page returns 200 and renders its `<h1>`. With JavaScript disabled, the home HTML contains all six project names, all four `/work` links, the email and the résumé link. With `prefers-reduced-motion: reduce`, no element has a non-zero transition duration.
- **Visual:** at the end of every phase the page is opened in Chrome at desktop and 390px widths and reviewed against section 6 before the commit.

## 10. Delivery

Small commits on `main`, one per step in [plan.md](./plan.md). Adwaith runs every git command; Claude supplies them. Phases match the build spec's section 9. Each phase ends with a Chrome review and a Lighthouse run before its last commit.

Still needed from Adwaith, none blocking: a domain name, which `NEXT_PUBLIC_SITE_URL` absorbs without a code change. The How I build copy and all three stack buckets were confirmed as written on 2026-09-17.

## 11. Launch assets

Generated at build time by Next.js file conventions, so none of them can drift from the content.

| Asset | Route | Notes |
|---|---|---|
| Social card, home | `/opengraph-image`, `/twitter-image` | 1200x630. Portrait from the hero crop on the left, thesis line on the right, rendered by `ImageResponse` from the vendored Open Font License TTFs in `src/app/og/fonts/`. |
| Social card, per project | `/work/[slug]/opengraph-image`, `twitter-image` | One per project, all six prerendered. Context, name, tagline, summary and the headline figure, from `projects.ts`. |
| Favicon | `/icon/small`, `/icon/large` | 32 and 192 px. A serif "A" in the accent; from 96 px up, "RN" in gold mono as a signature. |
| Apple touch icon | `/apple-icon` | 180 px, same mark. |
| Sitemap | `/sitemap.xml` | Home plus all six project pages. |
| Robots | `/robots.txt` | Allows every crawler, names the sitemap. |
| Structured data | inline in `layout.tsx` | `Person`: name, job title, email, GitHub, LinkedIn, X, MITS Kochi, Kochi. |
| Analytics | Vercel Analytics | Cookie-free, so no consent banner. Rendered only when `process.env.VERCEL` is set, because its script is served by Vercel's edge and would otherwise 404. |
