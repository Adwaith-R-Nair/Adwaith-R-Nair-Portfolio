# Portfolio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Adwaith R Nair's portfolio as a server-rendered Next.js 16 site whose content is complete without JavaScript, then layer a measured-quality WebGL particle portrait over the hero.

**Architecture:** Every page is a React Server Component rendering typed content from `src/content/`. Styling is CSS Modules over one tokens file. The hero particle system is the only client enhancement, built as imperative three.js loaded lazily after first paint. Case-study diagrams are inline SVG. Stack highlighting is CSS `:has()`.

**Tech Stack:** Next.js 16.3, React 19.3, TypeScript 5.9, pnpm 11, CSS Modules, `next/font`, Vitest 5, Playwright 1.63, three.js 0.186 (Phase 2), Lighthouse CI, Vercel.

**Spec:** [docs/design.md](./design.md), which implements [docs/build-spec.md](./build-spec.md). Executors read both. Content values come from build-spec.md section 6 and 7 and are binding.

## Global Constraints

- Node `>=20.9.0`. Machine has Node 24.16, pnpm 11.24.
- Content is server-rendered HTML. No content string may exist only in client code.
- No em dash (U+2014) anywhere in `src/content/`. No "revolutionary", "cutting-edge", "seamless", "leverage", "innovative", "game-changing".
- Every project has a non-empty `owned` line. Attribution lines in build-spec.md section 6 are binding; never widen them.
- Single dark theme. `body` background is `var(--ground)` explicitly. No light mode.
- Fonts: Instrument Serif (400, 400 italic) and IBM Plex Mono (400, 500) via `next/font/google`, with fallback stacks `Georgia, serif` and `ui-monospace, SFMono-Regular, Menlo, monospace`.
- Spacing only through `gap` and padding on containers, never per-element margins.
- `prefers-reduced-motion: reduce` removes every transition and animation.
- Status chip colours are separate tokens and never reuse `--accent` or `--gold`.
- Commits are made by Adwaith. Each task ends with the exact commands to give him, followed by a plain summary of what changed. Commit messages follow `type(scope): summary`, lowercase, short, no trailing period, no co-author trailer.

## Phase overview

| Phase | Deliverable | Plan |
|---|---|---|
| 0 | Docs, assets, gitignore | Commit 0 below |
| 1 | Static site: scaffold, tokens, content, every section, minimal case-study pages, tests, CI | Tasks 1 to 13 in this file |
| 2 | Hero particle layer: sampling, tiers, worker, renderer, scroll states, mount over static image | `docs/plans/phase-2-hero.md`, written after the Phase 1 Chrome review |
| 3 | Full case-study pages: SVG architecture diagrams, Honora proof element, neighbour navigation | `docs/plans/phase-3-case-studies.md` |
| 4 | Stack highlighting polish, How I build final copy, contact line state for the particles | `docs/plans/phase-4-content.md` |
| 5 | Social card, metadata, sitemap, analytics, domain, Vercel deploy | `docs/plans/phase-5-launch.md` |
| 6 | Mobile pass, reduced-motion pass, real-device testing against the budget | `docs/plans/phase-6-devices.md` |

Later phase plans are written at the start of each phase so they can react to what the previous phase looks like in a browser. This file is the index.

---

## Commit 0: docs and assets

Already prepared in the working tree. Adwaith runs:

```bash
git add .gitignore docs public
git commit -m "docs: add build spec, system design, first decision record and assets"
git remote add origin git@github.com:Adwaith-R-Nair/Adwaith-R-Nair-Portfolio.git
git push -u origin main
```

---

## Phase 1: static site

### File structure

```
package.json, pnpm-lock.yaml, tsconfig.json, next.config.ts, eslint.config.mjs,
vitest.config.ts, playwright.config.ts, lighthouserc.json, README.md
.github/workflows/ci.yml
src/app/layout.tsx              html shell, fonts, metadata, skip link
src/app/page.tsx                home: composes the nine sections
src/app/not-found.tsx
src/app/work/[slug]/page.tsx    minimal case-study page, all fields as prose
src/styles/tokens.css
src/styles/globals.css
src/content/types.ts
src/content/identity.ts
src/content/copy.ts
src/content/projects.ts
src/content/edges.ts
src/content/stack.ts
src/content/index.ts            re-exports plus helpers: flagships(), bySlug()
src/components/ui/Section.tsx + Section.module.css     numbered two-column section shell
src/components/ui/Eyebrow.tsx + Eyebrow.module.css
src/components/ui/StatusChip.tsx + StatusChip.module.css
src/components/ui/Figures.tsx + Figures.module.css     label/value ledger, tabular nums
src/components/ui/Prose.tsx + Prose.module.css         measured paragraph column
src/components/header/SiteHeader.tsx + .module.css
src/components/hero/Hero.tsx + Hero.module.css
src/components/thesis/Thesis.tsx + Thesis.module.css
src/components/graph/Graph.tsx + Graph.module.css + layout.ts
src/components/cases/CaseList.tsx + CaseList.module.css
src/components/also/AlsoBuilt.tsx + AlsoBuilt.module.css
src/components/oss/OpenSource.tsx + OpenSource.module.css
src/components/stack/Stack.tsx + Stack.module.css
src/components/how/HowIBuild.tsx + HowIBuild.module.css
src/components/contact/Contact.tsx + Contact.module.css
src/components/work/CaseStudy.tsx + CaseStudy.module.css
tests/unit/content-rules.test.ts
tests/unit/graph-layout.test.ts
tests/e2e/pages.spec.ts
```

---

### Task 1: Scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `vitest.config.ts`, `README.md`, `src/app/layout.tsx`, `src/app/page.tsx`

**Interfaces:**
- Produces: `pnpm dev | build | start | lint | typecheck | test | test:e2e` scripts. Path alias `@/*` to `src/*`.

- [x] **Step 1: Write package.json**

```json
{
  "name": "adwaith-portfolio",
  "version": "0.1.0",
  "private": true,
  "packageManager": "pnpm@11.24.0",
  "engines": { "node": ">=20.9.0" },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "check": "pnpm typecheck && pnpm lint && pnpm test"
  },
  "dependencies": {
    "next": "16.3.5",
    "react": "19.3.0",
    "react-dom": "19.3.0"
  },
  "devDependencies": {
    "@types/node": "^22.20.3",
    "@types/react": "^19.3.0",
    "@types/react-dom": "^19.3.0",
    "eslint": "^9",
    "eslint-config-next": "16.3.5",
    "typescript": "^5.9.3",
    "vitest": "^5.0.1"
  }
}
```

- [x] **Step 2: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext", "webworker"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [x] **Step 3: Write next.config.ts, eslint.config.mjs, vitest.config.ts, pnpm-workspace.yaml**

pnpm 11 refuses to run any script while a dependency's build script is unapproved. `unrs-resolver` (pulled in by eslint-config-next) has one. Approve it in the workspace file, which pnpm 11 reads for settings; the `pnpm` field in package.json is ignored.

```yaml
# pnpm-workspace.yaml
allowBuilds:
  unrs-resolver: true
```

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: { formats: ["image/avif", "image/webp"] },
};

export default nextConfig;
```

```js
// eslint.config.mjs
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "next-env.d.ts",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
  ]),
]);
```

```ts
// vitest.config.ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    passWithNoTests: true,
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
```

- [x] **Step 4: Write the minimal app**

```tsx
// src/app/layout.tsx
import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

```tsx
// src/app/page.tsx
export default function Home() {
  return <h1>Adwaith R Nair</h1>;
}
```

- [x] **Step 5: Write README.md**

```markdown
# Adwaith R Nair, portfolio

Server-rendered Next.js site. Content lives in `src/content/`. Design and decisions live in `docs/`.

    pnpm install
    pnpm dev        # http://localhost:3000
    pnpm check      # typecheck, lint, unit tests
    pnpm build
```

- [x] **Step 6: Install and verify**

Run: `pnpm install && pnpm typecheck && pnpm lint && pnpm build`
Expected: install succeeds, typecheck clean, lint clean, build prints a route table with `/` as static.

Run: `pnpm test`
Expected: Vitest reports no test files and exits 0. Note that `next build` rewrites `"jsx"` in tsconfig.json to `"react-jsx"`; commit that change.

- [x] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json next.config.ts eslint.config.mjs vitest.config.ts README.md src/app docs/plan.md
git commit -m "chore: scaffold next.js 16 app with typescript, eslint and vitest"
git push
```

---

### Task 2: Design tokens, global styles, fonts

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/globals.css`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Produces: CSS custom properties listed in tokens.css; `--font-display` and `--font-mono` resolved from `next/font` variables; global classes `.sr-only`, `.skip-link`.

- [x] **Step 1: Write tokens.css**

```css
/* Palette sampled from the source photograph. See docs/build-spec.md section 3. */
:root {
  --ground: #0a0810;
  --ground-2: #14101b;
  --ink: #ede7f0;
  --muted: #8e8ea9;
  --accent: #d3b2a0;
  --gold: #c9a227;
  --hairline: rgba(142, 142, 169, 0.22);

  /* Semantic status colours. Never the accent, never the gold. */
  --status-live: #7fbf8e;
  --status-testnet: #8fa8d9;
  --status-prototype: #b48fd6;
  --status-demo: #7fb8b3;

  --font-display: var(--font-instrument-serif), "Iowan Old Style", Georgia, serif;
  --font-mono: var(--font-plex-mono), ui-monospace, SFMono-Regular, Menlo, monospace;

  --text-body: 15px;
  --text-small: 13px;
  --text-label: 10.5px;
  --display-1: clamp(44px, 7.2vw, 96px);
  --display-2: clamp(32px, 4.6vw, 60px);
  --display-3: clamp(24px, 3vw, 38px);
  --leading-body: 1.65;
  --tracking-label: 0.2em;

  --measure: 65ch;
  --col-prose: min(760px, 86vw);
  --col-wide: min(1180px, 92vw);
  --label-col: 160px;

  --s-1: 8px;
  --s-2: 16px;
  --s-3: 24px;
  --s-4: 32px;
  --s-5: 48px;
  --s-6: 64px;
  --s-7: 96px;
  --s-8: 144px;
  --section-gap: clamp(96px, 14vh, 160px);
}

@media (max-width: 720px) {
  :root {
    --text-body: 14px;
    --label-col: 0px;
  }
}
```

- [x] **Step 2: Write globals.css**

```css
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
}

html {
  background: var(--ground);
  color-scheme: dark;
  scroll-behavior: smooth;
  -webkit-text-size-adjust: 100%;
}

body {
  background: var(--ground);
  color: var(--ink);
  font-family: var(--font-mono);
  font-size: var(--text-body);
  line-height: var(--leading-body);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  min-height: 100svh;
}

h1,
h2,
h3 {
  font-family: var(--font-display);
  font-weight: 400;
  line-height: 1.06;
  letter-spacing: -0.01em;
  text-wrap: balance;
}

h1 { font-size: var(--display-1); }
h2 { font-size: var(--display-2); }
h3 { font-size: var(--display-3); }

em {
  font-style: italic;
  color: var(--accent);
}

p { max-width: var(--measure); }

a {
  color: inherit;
  text-decoration: underline;
  text-decoration-color: var(--hairline);
  text-underline-offset: 0.2em;
  text-decoration-thickness: 1px;
  transition: text-decoration-color 0.2s ease, color 0.2s ease;
}

a:hover { text-decoration-color: var(--accent); }

:focus-visible {
  outline: 1px solid var(--accent);
  outline-offset: 3px;
}

::selection {
  background: var(--accent);
  color: var(--ground);
}

img,
svg {
  display: block;
  max-width: 100%;
  height: auto;
}

ul,
ol { padding-left: 0; list-style: none; }

.tnum { font-variant-numeric: tabular-nums; }

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.skip-link {
  position: absolute;
  left: var(--s-2);
  top: -100px;
  z-index: 100;
  padding: var(--s-1) var(--s-2);
  background: var(--ink);
  color: var(--ground);
  font-size: var(--text-label);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  text-decoration: none;
}

.skip-link:focus { top: var(--s-2); }

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *,
  *::before,
  *::after {
    transition-duration: 0s !important;
    animation-duration: 0s !important;
    animation-iteration-count: 1 !important;
  }
}
```

- [x] **Step 3: Rewrite layout.tsx with fonts and metadata**

```tsx
// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Instrument_Serif } from "next/font/google";
import type { ReactNode } from "react";
import "@/styles/tokens.css";
import "@/styles/globals.css";

const display = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-instrument-serif",
  fallback: ["Georgia", "serif"],
});

const mono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-plex-mono",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://adwaith-r-nair.vercel.app"),
  title: { default: "Adwaith R Nair", template: "%s · Adwaith R Nair" },
  description:
    "I build systems that have to be trusted. Agentic payments governance, blockchain evidence integrity, AI decision layers and tokenized property records.",
};

export const viewport: Viewport = {
  themeColor: "#0a0810",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable}`}>
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
```

- [x] **Step 4: Verify**

Run: `pnpm typecheck && pnpm lint && pnpm build`
Expected: clean. Build output shows fonts downloaded (or a cached font notice). Open `pnpm dev` in Chrome: background is `#0a0810`, the h1 renders in Instrument Serif.

- [x] **Step 5: Commit**

```bash
git add src/styles src/app/layout.tsx
git commit -m "feat(design): add colour and type tokens, global styles and self-hosted fonts"
git push
```

---

### Task 3: Content types, copy-rule test, identity and copy

**Files:**
- Create: `src/content/types.ts`, `src/content/identity.ts`, `src/content/copy.ts`, `src/content/index.ts`, `tests/unit/content-rules.test.ts`

**Interfaces:**
- Produces: types `Status`, `Slug`, `Project`, `Edge`, `StackEntry`, `StackBucket`; constants `identity`, `copy`; helpers `flagships()`, `bySlug(slug)`, `allContentStrings()`.
- Later tasks add `projects`, `edges`, `stack` to `index.ts`.

- [x] **Step 1: Write types.ts**

```ts
// src/content/types.ts
export type Status = "live" | "testnet" | "prototype" | "demo";

export type Slug = "praman" | "honora" | "aegisai" | "assetize" | "nexus" | "zyra";

export interface Credit {
  name: string;
  owned: string;
}

export interface Labelled {
  label: string;
  value: string;
}

export interface Titled {
  title: string;
  body: string;
}

export interface Project {
  slug: Slug;
  name: string;
  tagline: string;
  status: Status;
  flagship: boolean;
  /** The binding "what I owned" line. Never empty. */
  owned: string;
  team?: { size: number; credits: Credit[] };
  repo: string;
  context: string;
  period: string;
  /** One concrete sentence for the home page list. */
  summary: string;
  /** One measured fact for the home page list. */
  headline: Labelled;
  problem: string;
  architecture: string[];
  decisions: Titled[];
  proof: Labelled[];
  bugs?: Titled[];
  limits: string[];
  scale?: Labelled[];
  /** Keys into stack.ts. */
  stack: string[];
  onchain?: { network: string; address: string; explorer: string };
}

export interface Edge {
  from: Slug;
  to: Slug;
  concern: string;
}

export type StackBucket = "built" | "worked" | "exploring";

export interface StackEntry {
  key: string;
  name: string;
  bucket: StackBucket;
  projects: Slug[];
}
```

- [x] **Step 2: Write identity.ts and copy.ts**

```ts
// src/content/identity.ts
export const identity = {
  name: "Adwaith R Nair",
  location: "Kochi, Kerala, India",
  study: "B.Tech Computer Science and AI, MITS Kochi, 2023 to 2027, CGPA 8.5",
  work: "Blockchain and GenAI Engineer (Intern), SupeAI, July 2025 to July 2026",
  email: "adwaith.r.nair189@gmail.com",
  github: "https://github.com/Adwaith-R-Nair",
  linkedin: "https://linkedin.com/in/adwaith-r-nair",
  x: "https://x.com/adwaith_r_nair",
  resume: "/resume.pdf",
  openSource: "Google Summer of Code 2024, Oppia Foundation.",
} as const;
```

```ts
// src/content/copy.ts
export const copy = {
  hero: {
    eyebrow: "Kochi, Kerala",
    line: "Blockchain and GenAI engineer. B.Tech CS and AI, MITS Kochi, class of 2027.",
  },
  thesis: {
    heading: ["I build systems that ", "have to be trusted", "."],
    body:
      "Four systems, one question: how do you prove a machine did the right thing? Praman governs autonomous agents spending real money. Honora proves legal evidence was never altered. AegisAI decides when an AI may act alone and when a human must sign off. Assetize makes property ownership records independently verifiable.",
  },
  graph: {
    eyebrow: "Selected work",
    heading: ["Six systems, ", "one question", "."],
    body: "Every edge is a concern two projects genuinely share, in the code, not in the copy.",
  },
  cases: { title: "Case studies" },
  also: { title: "Also built" },
  oss: { title: "Open source" },
  stack: {
    title: "Stack",
    body: "Hover or focus a technology to see where it was used. Hover a project to see what it was built with.",
    buckets: { built: "Built with", worked: "Worked with", exploring: "Exploring" },
  },
  how: {
    title: "How I build",
    paragraphs: [
      "I direct AI agents the way I would run a small team. I write the spec, decide the architecture and the boundaries, and hand out single-purpose tasks. Praman has 142 commits that each do one thing because each one was one task.",
      "Decisions are written down before code. Praman carries a 24-entry decision log and Assetize about 3,900 lines of documentation, so anyone, including a model with no memory of yesterday, can pick up the reasoning and not just the code.",
      "Nothing consequential runs unchecked. Nexus asks before every file write and shell command. Praman's authorization path has no model in it at all. The same rule applies to how I work: agents propose, tests and I verify, and I own what ships.",
      "Verification is measured, not asserted. Held-out test splits, ablation runs, a self-audit that caught three real boundary violations in Assetize, and a logged bug list. If a number is not on this site, it is because I did not measure it.",
    ],
  },
  contact: {
    title: "Contact",
    heading: ["Say ", "hello", "."],
    body: "Graduating 2027. Reachable now, for AI and agentic engineering, blockchain and backend work.",
  },
} as const;
```

- [x] **Step 3: Write index.ts (partial; projects, edges, stack added in Tasks 4 and 5)**

```ts
// src/content/index.ts
export * from "./types";
export { identity } from "./identity";
export { copy } from "./copy";

/** Every string in a content object, depth first. Used by the copy-rule test. */
export function allStrings(value: unknown, path = "root"): { path: string; text: string }[] {
  if (typeof value === "string") return [{ path, text: value }];
  if (Array.isArray(value)) return value.flatMap((v, i) => allStrings(v, `${path}[${i}]`));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) => allStrings(v, `${path}.${k}`));
  }
  return [];
}
```

- [x] **Step 4: Write the failing copy-rule test**

```ts
// tests/unit/content-rules.test.ts
import { describe, expect, it } from "vitest";
import { allStrings, copy, identity } from "@/content";

const BANNED = [
  "\u2014",
  "revolutionary",
  "cutting-edge",
  "cutting edge",
  "seamless",
  "leverage",
  "innovative",
  "game-changing",
];

function violations(obj: unknown, name: string) {
  return allStrings(obj, name).flatMap(({ path, text }) =>
    BANNED.filter((b) => text.toLowerCase().includes(b)).map((b) => `${path}: contains "${b}"`),
  );
}

describe("copy rules", () => {
  it("identity and copy contain no em dashes or banned words", () => {
    expect([...violations(identity, "identity"), ...violations(copy, "copy")]).toEqual([]);
  });
});
```

- [x] **Step 5: Run the test**

Run: `pnpm test`
Expected: PASS, 1 test. (The test is written before projects.ts exists so that Task 4 extends it rather than writing content untested.)

- [x] **Step 6: Commit**

```bash
git add src/content tests/unit/content-rules.test.ts
git commit -m "feat(content): add content types, identity, section copy and the copy-rule test"
git push
```

---

### Task 4: Project content

**Files:**
- Create: `src/content/projects.ts`
- Modify: `src/content/index.ts`, `tests/unit/content-rules.test.ts`

**Interfaces:**
- Produces: `projects: Project[]` in spec order (praman, honora, aegisai, assetize, nexus, zyra); `flagships()`, `bySlug(slug)`.

- [x] **Step 1: Extend the test first**

Append to `tests/unit/content-rules.test.ts` (move the `import` line up to the top of the file with the others):

```ts
import { bySlug, flagships, projects } from "@/content";

describe("projects", () => {
  it("contain no banned copy", () => {
    expect(violations(projects, "projects")).toEqual([]);
  });

  it("every project has a non-empty owned line", () => {
    for (const p of projects) expect(p.owned.trim().length, p.slug).toBeGreaterThan(20);
  });

  it("has exactly four flagships in spec order", () => {
    expect(flagships().map((p) => p.slug)).toEqual(["praman", "honora", "aegisai", "assetize"]);
  });

  it("team projects credit every collaborator", () => {
    expect(bySlug("honora").team?.credits.map((c) => c.name)).toEqual(["Diya", "Abhijith A", "Meghna"]);
    expect(bySlug("aegisai").team?.credits.map((c) => c.name)).toEqual(["Milan", "Mahathi", "Meenakshi"]);
    expect(bySlug("zyra").team?.credits.map((c) => c.name)).toEqual(["Abhijith A"]);
  });

  it("honora carries the verified sepolia address", () => {
    expect(bySlug("honora").onchain?.address).toBe("0xf4e1c0179acC2A54C195e8687621ee070be06B3C");
  });

  it("every flagship publishes limits and proof", () => {
    for (const p of flagships()) {
      expect(p.limits.length, p.slug).toBeGreaterThan(0);
      expect(p.proof.length, p.slug).toBeGreaterThan(0);
    }
  });
});
```

Run: `pnpm test`
Expected: FAIL, `projects` is not exported.

- [x] **Step 2: Write projects.ts**

Every value below is taken from build-spec.md section 6. Do not add claims that are not there.

```ts
// src/content/projects.ts
import type { Project, Slug } from "./types";

export const projects: Project[] = [
  {
    slug: "praman",
    name: "Praman",
    tagline: "agentic commerce control plane",
    status: "prototype",
    flagship: true,
    owned:
      "Everything. Solo build: architecture, mandate format, policy engine, ledger, two-phase executor, evaluation harness, tests and the decision log.",
    repo: "https://github.com/Adwaith-R-Nair/Praman",
    context: "Razorpay AI Buildathon 2026, Track 01",
    period: "27 August to 5 September 2026",
    summary:
      "A control plane that lets an AI agent spend real money while no model is anywhere in the authorization path.",
    headline: { label: "Money moved under injection, 21 runs per arm", value: "0 cases" },
    problem:
      "An AI agent that can spend money is an agent that can be talked into spending it wrongly. Praman sits between the agent and the payment rail and decides, without asking any model, whether a purchase is allowed. The purchase intent carries only a SKU and a quantity. It has no price field, so a compromised merchant page has nothing to inject into the amount. Price resolves server-side from a trusted catalog after the intent is validated against a mandate the human signed.",
    architecture: [
      "Three primitives do the work. An Ed25519 human-signed mandate carries merchant and category allowlists, per-transaction and cumulative caps, and velocity and denial-rate limits. A pure, deterministic policy engine evaluates each intent against the mandate and returns one of 19 closed reason codes. There is no LLM anywhere in the authorization path.",
      "An append-only, hash-chained, Merkle-checkpointed ledger records every outcome. Immutability is enforced by a Postgres trigger, and spend is derived by replaying the ledger rather than read from a mutable balance.",
      "Execution is two-phase under a per-mandate advisory lock, because a database transaction and an external payment call cannot be made atomic. The reservation is recorded before the call and the settlement after it, so a crash in between leaves a recoverable state, not a lost or doubled charge.",
    ],
    decisions: [
      {
        title: "No price in the intent",
        body: "If the agent cannot state a price, nothing the agent reads can change the price. The amount comes from the catalog, never from the conversation.",
      },
      {
        title: "No model in the authorization path",
        body: "The model proposes, the policy engine decides. Authorization is a pure function of intent, catalog and mandate, so it is testable, replayable and immune to prompt injection by construction.",
      },
      {
        title: "Spend is replayed, not stored",
        body: "A mutable balance is a second source of truth that can drift from the ledger. Replaying costs one query and removes the whole class of bugs.",
      },
    ],
    proof: [
      { label: "Policy containment, dev and held-out splits", value: "100%" },
      { label: "False refusals on 12 benign cases", value: "0" },
      { label: "Injection ablation, 21 runs per arm, proposals influenced", value: "0 defended, 2 undefended" },
      { label: "Money moved, either arm", value: "0 of 21" },
    ],
    bugs: [
      {
        title: "Razorpay does not enforce receipt uniqueness",
        body: "The documentation says receipts are unique. The API does not enforce it. Praman now enforces uniqueness on its own side before any call goes out.",
      },
      {
        title: "Refusals leaked the mandate",
        body: "The engine's refusal text named the limit that was hit, which told a probing agent exactly where the ceiling was. Refusals now carry a reason code only.",
      },
      {
        title: "NaN read as permitted",
        body: "Every comparison with NaN is false, so a malformed amount passed every cap check. Inputs are now validated as finite integers before evaluation.",
      },
    ],
    limits: [
      "TRUNCATE bypasses the append-only triggers.",
      "Merkle checkpoints are not externally anchored.",
      "The denial-rate cap is per window, so slow probing remains possible.",
      "Test mode only. There is no HTTP API layer.",
    ],
    scale: [
      { label: "Single-purpose commits", value: "142" },
      { label: "Lines of TypeScript", value: "~8,800" },
      { label: "Packages and apps", value: "9 + 4" },
      { label: "Test files", value: "20" },
      { label: "Decision log entries", value: "24" },
    ],
    stack: ["typescript", "nodejs", "postgresql", "razorpay", "ed25519"],
  },
  {
    slug: "honora",
    name: "Honora",
    tagline: "blockchain evidence management",
    status: "testnet",
    flagship: true,
    owned:
      "Blockchain, backend and testing: the EvidenceRegistry contract, the Express API, the integrity pipeline and their tests.",
    team: {
      size: 4,
      credits: [
        { name: "Diya", owned: "AI layer" },
        { name: "Abhijith A", owned: "Frontend and testing" },
        { name: "Meghna", owned: "Cross-case linkage and frontend" },
      ],
    },
    repo: "https://github.com/Adwaith-R-Nair/Honora",
    context: "Four-person university project",
    period: "2025 to 2026",
    summary:
      "Evidence hashes and every custody transfer recorded on a public chain, so the record is verifiable by anyone, not just by whoever runs the server.",
    headline: { label: "Deployed and source-verified on", value: "Ethereum Sepolia" },
    problem:
      "Digital evidence is only useful in court if nobody could have altered it between collection and trial. Honora records a hash of every piece of evidence and every custody transfer on Ethereum, and treats the on-chain record as the only source of truth.",
    architecture: [
      "EvidenceRegistry.sol, Solidity 0.8.24, built with Hardhat v3 and ethers.js v6. An on-chain role enum (None, Police, Forensic, Lawyer, Judge), gas-efficient custom-error reverts, an append-only custody chain, global duplicate-hash prevention and full event emission.",
      "Access control is dual-layer. Express middleware gives a cheap 403 at the edge; Solidity modifiers are the authoritative gate. An application-layer bypass still cannot act on-chain.",
      "The backend is Node 22, Express, TypeScript ESM, JWT HS256, bcrypt at 12 rounds, MongoDB Atlas for off-chain metadata only, IPFS via Pinata, and a SHA-256 integrity pipeline. Role-specific signer wallets fail closed when unconfigured. AI indexing is fire-and-forget, so evidence operations never depend on a non-critical service.",
    ],
    decisions: [
      {
        title: "Two gates, one authority",
        body: "The middleware exists for speed and error messages. The contract exists for truth. If they ever disagree, the contract wins, because it is the only one an attacker cannot route around.",
      },
      {
        title: "Fail closed on missing signers",
        body: "A role whose wallet is not configured cannot act at all. Silently falling back to a default signer would make the audit trail lie about who did what.",
      },
      {
        title: "AI indexing never blocks evidence",
        body: "Indexing is useful and non-critical. It is dispatched and forgotten, so an outage in the AI layer cannot stall a custody transfer.",
      },
    ],
    proof: [
      { label: "Contract", value: "EvidenceRegistry.sol, verified on Sepolia" },
      { label: "Duplicate evidence hashes", value: "rejected globally, on-chain" },
    ],
    limits: [
      "University-caliber proof of concept, not a production deployment.",
      "No multi-signature on role assignment.",
      "No CI/CD yet.",
    ],
    stack: ["solidity", "hardhat", "ethersjs", "nodejs", "express", "typescript", "mongodb", "ipfs"],
    onchain: {
      network: "Ethereum Sepolia",
      address: "0xf4e1c0179acC2A54C195e8687621ee070be06B3C",
      explorer: "https://sepolia.etherscan.io/address/0xf4e1c0179acC2A54C195e8687621ee070be06B3C",
    },
  },
  {
    slug: "aegisai",
    name: "AegisAI",
    tagline: "governance layer for agentic AI",
    status: "prototype",
    flagship: true,
    owned:
      "watsonx.ai prompt design and the reasoning logic: the RESPOND, ESCALATE and REFUSE decision layer, the policy-confidence model and the rule ordering.",
    team: {
      size: 4,
      credits: [
        { name: "Milan", owned: "Orchestration" },
        { name: "Mahathi", owned: "Tools and backend" },
        { name: "Meenakshi", owned: "Frontend and docs" },
      ],
    },
    repo: "https://github.com/Adwaith-R-Nair/AegisAI-WatsonX",
    context: "IBM Agentic AI Dev Day, four-person team",
    period: "2026",
    summary:
      "A decision layer that returns RESPOND, ESCALATE or REFUSE for every agent action, with confidence computed rather than guessed.",
    headline: { label: "Demo scenarios verified end to end", value: "3" },
    problem:
      "An agent that can call tools needs a rule for when it may act on its own and when a human must sign off. AegisAI makes that rule explicit and computed, instead of leaving it to whatever the model feels like in the moment.",
    architecture: [
      "Every request passes through a decision layer that returns one of three verdicts: RESPOND, ESCALATE or REFUSE. The verdict comes from a priority-ordered rule set: immediate refusal conditions first, then informational requests, then actions safe to take autonomously, then everything else escalates to a human.",
      "Confidence in the governing policy is computed: source authority weighted 0.4, freshness 0.3, agreement between sources 0.3. Low confidence pushes a decision toward escalation.",
      "Three Prompt Lab templates were validated before being operationalised. Around the decision layer, the system runs 5 collaborating agents over 4 governed tools.",
    ],
    decisions: [
      {
        title: "Refusal is checked first",
        body: "Rules are ordered by cost of being wrong. A missed refusal is worse than an unnecessary escalation, so refusal conditions run before anything else can answer.",
      },
      {
        title: "Confidence is a formula, not a feeling",
        body: "Three weighted, inspectable terms. When the layer escalates, a human can see which term dragged the score down.",
      },
    ],
    proof: [
      { label: "Collaborating agents / governed tools", value: "5 / 4" },
      { label: "Prompt templates validated before use", value: "3" },
      { label: "Demo scenarios verified", value: "3" },
    ],
    limits: [
      "Hackathon prototype, explicitly not production-deployed.",
      "No user or revenue metrics exist, and none are claimed.",
    ],
    stack: ["watsonx", "prompt-design"],
  },
  {
    slug: "assetize",
    name: "Assetize",
    tagline: "tokenized fractional real estate",
    status: "demo",
    flagship: true,
    owned:
      "Everything. Solo build at SupeAI: data model, repository and service layers, API, on-chain integration, documentation and the bug log.",
    repo: "https://github.com/Adwaith-R-Nair/Assetize-v0",
    context: "Built solo at SupeAI",
    period: "2025 to 2026",
    summary:
      "A Phase 1 investor demo of fractional property ownership where every demo action produces a real, explorable transaction hash.",
    headline: { label: "Boundary violations caught by self-audit", value: "3" },
    problem:
      "Fractional ownership of property only works if the record of who owns what can be checked by someone other than the platform. Assetize is the Phase 1 investor demo of that record, built so that the later move to real contracts touches one layer.",
    architecture: [
      "Strict Repository, then Service, then API. The layering is designed so that a Phase 2 migration to real Solidity contracts touches only the repository layer. It is enforced by self-audit, which caught three real boundary violations.",
      "The hash pool. A live investor pitch cannot depend on network latency, but faking hashes destroys the credibility the demo exists to build. So about 50 real transactions are pre-submitted to Polygon Amoy and 20 unused hashes are pooled. Every demo action draws a real, explorable hash instantly.",
      "All currency is BigInt paise, never floats. Distribution is gross, minus a 9% management fee, minus 10% TDS. BUG-006 was a missing fee deduction that would have overpaid every investor. It was caught before it ran live.",
    ],
    decisions: [
      {
        title: "Real hashes, drawn from a pool",
        body: "The trade-off is explicit: the hashes are real and explorable, but they were not produced by the action that displays them. That is stated in the demo rather than hidden.",
      },
      {
        title: "Integer minor units everywhere",
        body: "Money is never a float. Fees and tax are computed on BigInt paise so rounding cannot leak value between investors.",
      },
      {
        title: "Layer boundaries are audited, not assumed",
        body: "A self-audit pass reads every import against the allowed direction. It found three violations that would have made the Phase 2 migration touch more than the repository layer.",
      },
    ],
    proof: [
      { label: "Boundary violations caught before merge", value: "3" },
      { label: "Bugs logged and fixed", value: "14" },
      { label: "Overpayment bug caught before it ran live", value: "BUG-006" },
    ],
    bugs: [
      {
        title: "BUG-006, the missing fee",
        body: "Distribution skipped the 9% management fee, which would have overpaid every investor on every payout. Found in review of the distribution math before the demo.",
      },
    ],
    limits: [
      "Phase 1 investor demo with a documented Phase 2.",
      "Seeded mock data. No real KYC. No real payments. No deployed contracts.",
    ],
    scale: [
      { label: "Commits", value: "58" },
      { label: "Prisma models", value: "16" },
      { label: "API routes", value: "~24" },
      { label: "Repository interfaces and implementations", value: "7 + 7" },
      { label: "Services", value: "6" },
      { label: "Lines of self-authored documentation", value: "~3,900" },
      { label: "User stories", value: "34" },
    ],
    stack: [
      "nextjs", "typescript", "tailwind", "shadcn", "framer-motion", "supabase", "postgresql",
      "prisma", "polygon", "ethersjs", "react-pdf", "recharts", "zod", "vercel", "github-actions",
    ],
  },
  {
    slug: "nexus",
    name: "Nexus",
    tagline: "multi-provider CLI AI agent",
    status: "live",
    flagship: false,
    owned: "Everything. Solo.",
    repo: "https://github.com/Adwaith-R-Nair/Nexus-TUI",
    context: "Solo",
    period: "2026",
    summary:
      "Four providers behind one interface, three agentic tool-use loops written directly against the Anthropic, Gemini and OpenAI REST APIs with no agent SDK.",
    headline: { label: "Human confirmation before any file write or shell command", value: "always" },
    problem:
      "Agent SDKs hide the loop. Nexus writes it out: three independent tool-use loops against raw REST APIs, a centralised human-in-the-loop confirmation before any file write or shell command, and a 5-iteration cap. Credentials and history stay local.",
    architecture: ["Bun, TypeScript and Commander.js. Local-only credential and history storage."],
    decisions: [],
    proof: [{ label: "Iteration cap per task", value: "5" }],
    limits: ["Terminal tool for one user. No sandboxing beyond the confirmation step."],
    stack: ["bun", "typescript", "anthropic-api", "gemini-api", "openai-api"],
  },
  {
    slug: "zyra",
    name: "Zyra",
    tagline: "local-first smart-home voice assistant",
    status: "prototype",
    flagship: false,
    owned:
      "ESP32-S3 firmware in ESP-IDF and C, the Python AI server, and the system architecture. Two-person collaboration with Abhijith A, whose account holds the primary repository and commits.",
    team: {
      size: 2,
      credits: [{ name: "Abhijith A", owned: "Primary repository, co-development" }],
    },
    repo: "https://github.com/Adwaith-R-Nair/Zyra-AI-Assistant",
    context: "Two-person collaboration",
    period: "June to August 2026",
    summary:
      "A five-mode fallback hierarchy that degrades from full conversation down to the relay board's own access point, so it keeps working when the server, the hub or the Wi-Fi fails.",
    headline: { label: "Fallback modes before the device stops working", value: "5" },
    problem:
      "A voice assistant that dies when the network does is a paperweight. Zyra degrades in five steps, from full conversation down to joining the relay board's own access point. The /health endpoint deliberately reports only process liveness, so a Home Assistant outage is not misreported as a server failure.",
    architecture: [
      "ESP32-S3 firmware in ESP-IDF and C. A Python AI server with FastAPI, Faster-Whisper for speech to text, Ollama for local inference and Kokoro for speech. About 18,000 lines over three months.",
    ],
    decisions: [],
    proof: [{ label: "Lines, June to August 2026", value: "~18,000" }],
    limits: ["Enclosure and UI are unfinished."],
    stack: ["esp-idf", "python", "fastapi", "faster-whisper", "ollama", "kokoro", "home-assistant"],
  },
];

export const flagships = (): Project[] => projects.filter((p) => p.flagship);

export const bySlug = (slug: Slug): Project => {
  const p = projects.find((x) => x.slug === slug);
  if (!p) throw new Error(`unknown project ${slug}`);
  return p;
};
```

- [x] **Step 3: Export from index.ts**

Add to `src/content/index.ts`:

```ts
export { projects, flagships, bySlug } from "./projects";
```

- [x] **Step 4: Run tests**

Run: `pnpm test`
Expected: PASS, all tests.

- [x] **Step 5: Commit**

```bash
git add src/content tests/unit/content-rules.test.ts
git commit -m "feat(content): add all six projects with binding attribution and honest limits"
git push
```

---

### Task 5: Edges and stack

**Files:**
- Create: `src/content/edges.ts`, `src/content/stack.ts`
- Modify: `src/content/index.ts`, `tests/unit/content-rules.test.ts`

**Interfaces:**
- Produces: `edges: Edge[]` (seven), `stack: StackEntry[]`, `stackByBucket(bucket)`, `stackFor(slug)`.

- [x] **Step 1: Extend the test**

Append:

```ts
import { edges, stack } from "@/content";

describe("edges and stack", () => {
  const slugs = new Set(projects.map((p) => p.slug));

  it("has the seven spec edges between real projects", () => {
    expect(edges).toHaveLength(7);
    for (const e of edges) {
      expect(slugs.has(e.from), e.from).toBe(true);
      expect(slugs.has(e.to), e.to).toBe(true);
      expect(e.concern.length).toBeGreaterThan(10);
    }
  });

  it("every project stack key exists in the stack list", () => {
    const keys = new Set(stack.map((s) => s.key));
    for (const p of projects) for (const k of p.stack) expect(keys.has(k), `${p.slug}:${k}`).toBe(true);
  });

  it("every stack entry's projects actually list it", () => {
    for (const s of stack) {
      for (const slug of s.projects) expect(bySlug(slug).stack, `${s.key} <- ${slug}`).toContain(s.key);
    }
  });

  it("no banned copy in edges or stack", () => {
    expect([...violations(edges, "edges"), ...violations(stack, "stack")]).toEqual([]);
  });
});
```

Run: `pnpm test`
Expected: FAIL, `edges` is not exported.

- [x] **Step 2: Write edges.ts**

```ts
// src/content/edges.ts
import type { Edge } from "./types";

export const edges: Edge[] = [
  { from: "praman", to: "honora", concern: "hash-chained append-only integrity" },
  { from: "praman", to: "aegisai", concern: "deciding when an agent may act alone" },
  { from: "praman", to: "nexus", concern: "agentic tool-use loop design" },
  { from: "praman", to: "assetize", concern: "money correctness as integer minor units" },
  { from: "honora", to: "assetize", concern: "on-chain records as independent audit trail" },
  { from: "aegisai", to: "nexus", concern: "human-in-the-loop before a consequential action" },
  { from: "nexus", to: "zyra", concern: "running local models as a runtime" },
];
```

- [x] **Step 3: Write stack.ts**

The `projects` arrays must match the `stack` keys in projects.ts exactly; the test enforces both directions. "Exploring" is Claude's draft for Adwaith to edit.

```ts
// src/content/stack.ts
import type { Slug, StackBucket, StackEntry } from "./types";
import { projects } from "./projects";

function usedBy(key: string): Slug[] {
  return projects.filter((p) => p.stack.includes(key)).map((p) => p.slug);
}

const entry = (key: string, name: string, bucket: StackBucket): StackEntry => ({
  key,
  name,
  bucket,
  projects: usedBy(key),
});

export const stack: StackEntry[] = [
  // Built with: owned the code that used it.
  entry("typescript", "TypeScript", "built"),
  entry("nodejs", "Node.js", "built"),
  entry("bun", "Bun", "built"),
  entry("nextjs", "Next.js", "built"),
  entry("express", "Express", "built"),
  entry("postgresql", "PostgreSQL", "built"),
  entry("prisma", "Prisma", "built"),
  entry("supabase", "Supabase", "built"),
  entry("mongodb", "MongoDB", "built"),
  entry("solidity", "Solidity", "built"),
  entry("hardhat", "Hardhat", "built"),
  entry("ethersjs", "ethers.js", "built"),
  entry("ipfs", "IPFS", "built"),
  entry("ed25519", "Ed25519 signatures", "built"),
  entry("python", "Python", "built"),
  entry("fastapi", "FastAPI", "built"),
  entry("esp-idf", "ESP-IDF (C)", "built"),
  entry("zod", "Zod", "built"),
  entry("tailwind", "Tailwind", "built"),
  entry("github-actions", "GitHub Actions", "built"),
  entry("vercel", "Vercel", "built"),
  entry("prompt-design", "Prompt design", "built"),
  // Worked with: integrated or operated, did not own the internals.
  entry("watsonx", "watsonx.ai", "worked"),
  entry("razorpay", "Razorpay API", "worked"),
  entry("anthropic-api", "Anthropic API", "worked"),
  entry("gemini-api", "Gemini API", "worked"),
  entry("openai-api", "OpenAI API", "worked"),
  entry("polygon", "Polygon Amoy", "worked"),
  entry("ollama", "Ollama", "worked"),
  entry("faster-whisper", "Faster-Whisper", "worked"),
  entry("kokoro", "Kokoro TTS", "worked"),
  entry("home-assistant", "Home Assistant", "worked"),
  entry("shadcn", "shadcn/ui", "worked"),
  entry("framer-motion", "Framer Motion", "worked"),
  entry("react-pdf", "@react-pdf/renderer", "worked"),
  entry("recharts", "Recharts", "worked"),
  // Exploring: draft, to be edited by Adwaith.
  entry("rust", "Rust", "exploring"),
  entry("solana", "Solana", "exploring"),
  entry("zk", "Zero-knowledge proofs", "exploring"),
  entry("tee", "Trusted execution and attestation", "exploring"),
];

export const stackByBucket = (bucket: StackBucket): StackEntry[] =>
  stack.filter((s) => s.bucket === bucket);

export const stackFor = (slug: Slug): StackEntry[] =>
  stack.filter((s) => s.projects.includes(slug));
```

- [x] **Step 4: Export and run**

Add to `src/content/index.ts`:

```ts
export { edges } from "./edges";
export { stack, stackByBucket, stackFor } from "./stack";
```

Run: `pnpm test && pnpm typecheck`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/content tests/unit/content-rules.test.ts
git commit -m "feat(content): add graph edges and the three stack buckets"
git push
```

---

### Task 6: UI primitives and the section shell

**Files:**
- Create: `src/components/ui/Section.tsx`, `Section.module.css`, `Eyebrow.tsx`, `Eyebrow.module.css`, `StatusChip.tsx`, `StatusChip.module.css`, `Figures.tsx`, `Figures.module.css`, `Prose.tsx`, `Prose.module.css`

**Interfaces:**
- Produces:
  - `<Section id title wide? children>`: two-column shell, mono label left, content right. `id` is the anchor. `wide` switches to `--col-wide`. No number: sections are not a sequence (design.md section 6).
  - `<Eyebrow>text</Eyebrow>`: uppercase tracked label.
  - `<StatusChip status />`: coloured chip with text.
  - `<Figures items={Labelled[]} />`: a dl ledger with tabular numerals.
  - `<Prose>children</Prose>`: paragraph column with `gap`.

- [x] **Step 1: Section**

```tsx
// src/components/ui/Section.tsx
import type { ReactNode } from "react";
import styles from "./Section.module.css";

interface Props {
  id: string;
  number: string;
  title: string;
  wide?: boolean;
  children: ReactNode;
}

export function Section({ id, number, title, wide = false, children }: Props) {
  const headingId = `${id}-title`;
  return (
    <section id={id} aria-labelledby={headingId} className={`${styles.section} ${wide ? styles.wide : ""}`}>
      <header className={styles.label}>
        <span className={`${styles.number} tnum`} aria-hidden="true">{number}</span>
        <h2 id={headingId} className={styles.title}>{title}</h2>
      </header>
      <div className={styles.body}>{children}</div>
    </section>
  );
}
```

```css
/* src/components/ui/Section.module.css */
.section {
  width: var(--col-prose);
  margin-inline: auto;
  display: grid;
  grid-template-columns: var(--label-col) minmax(0, 1fr);
  gap: var(--s-4) var(--s-5);
  padding-block: calc(var(--section-gap) / 2);
  border-top: 1px solid var(--hairline);
}

.wide { width: var(--col-wide); }

.label {
  display: flex;
  flex-direction: column;
  gap: var(--s-1);
  align-self: start;
  position: sticky;
  top: var(--s-4);
}

.number {
  font-size: var(--text-label);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--accent);
}

.title {
  font-family: var(--font-mono);
  font-size: var(--text-label);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--muted);
  line-height: 1.4;
  font-weight: 400;
}

.body {
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
  min-width: 0;
}

@media (max-width: 720px) {
  .section { grid-template-columns: 1fr; gap: var(--s-3); }
  .label { position: static; flex-direction: row; gap: var(--s-2); align-items: baseline; }
}
```

- [x] **Step 2: Eyebrow, StatusChip, Figures, Prose**

```tsx
// src/components/ui/Eyebrow.tsx
import type { ReactNode } from "react";
import styles from "./Eyebrow.module.css";

export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className={styles.eyebrow}>{children}</span>;
}
```

```css
/* src/components/ui/Eyebrow.module.css */
.eyebrow {
  display: inline-block;
  font-size: var(--text-label);
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--accent);
}
```

```tsx
// src/components/ui/StatusChip.tsx
import type { Status } from "@/content";
import styles from "./StatusChip.module.css";

const LABEL: Record<Status, string> = {
  live: "Live",
  testnet: "Testnet",
  prototype: "Prototype",
  demo: "Demo",
};

export function StatusChip({ status }: { status: Status }) {
  return (
    <span className={styles.chip} data-status={status}>
      <span className={styles.dot} aria-hidden="true" />
      {LABEL[status]}
    </span>
  );
}
```

```css
/* src/components/ui/StatusChip.module.css */
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-label);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
  white-space: nowrap;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--c);
}

.chip[data-status="live"] { --c: var(--status-live); }
.chip[data-status="testnet"] { --c: var(--status-testnet); }
.chip[data-status="prototype"] { --c: var(--status-prototype); }
.chip[data-status="demo"] { --c: var(--status-demo); }
```

```tsx
// src/components/ui/Figures.tsx
import type { Labelled } from "@/content";
import styles from "./Figures.module.css";

export function Figures({ items, title }: { items: Labelled[]; title?: string }) {
  return (
    <div className={styles.wrap}>
      {title ? <span className={styles.title}>{title}</span> : null}
      <dl className={styles.list}>
        {items.map((it) => (
          <div key={it.label} className={styles.row}>
            <dt className={styles.label}>{it.label}</dt>
            <dd className={`${styles.value} tnum`}>{it.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
```

```css
/* src/components/ui/Figures.module.css */
.wrap {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
  padding: var(--s-3);
  background: var(--ground-2);
  border: 1px solid var(--hairline);
}

.title {
  font-size: var(--text-label);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--muted);
}

.list {
  display: flex;
  flex-direction: column;
  gap: var(--s-1);
}

.row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--s-3);
  align-items: baseline;
  padding-block: 6px;
  border-bottom: 1px solid var(--hairline);
  font-size: var(--text-small);
}

.row:last-child { border-bottom: 0; }

.label { color: var(--muted); }

.value {
  color: var(--ink);
  text-align: right;
  white-space: nowrap;
}
```

```tsx
// src/components/ui/Prose.tsx
import type { ReactNode } from "react";
import styles from "./Prose.module.css";

export function Prose({ children }: { children: ReactNode }) {
  return <div className={styles.prose}>{children}</div>;
}
```

```css
/* src/components/ui/Prose.module.css */
.prose {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
  max-width: var(--measure);
}

.prose p { color: var(--ink); }
```

- [x] **Step 3: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: clean (components unused for now; ESLint does not flag unused exports).

- [x] **Step 4: Commit**

```bash
git add src/components/ui
git commit -m "feat(ui): add section shell, eyebrow, status chip, figures ledger and prose primitives"
git push
```

---

### Task 7: Header, hero and thesis

**Files:**
- Create: `src/components/header/SiteHeader.tsx`, `SiteHeader.module.css`, `src/components/hero/Hero.tsx`, `Hero.module.css`, `src/components/thesis/Thesis.tsx`, `Thesis.module.css`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Produces: `<SiteHeader />`, `<Hero />` with `id="hero"` and the static image element `id="hero-portrait"` (Phase 2 mounts the canvas over this), `<Thesis />` with `id="thesis"`.

- [ ] **Step 1: SiteHeader**

```tsx
// src/components/header/SiteHeader.tsx
import { identity } from "@/content";
import styles from "./SiteHeader.module.css";

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <a href="#hero" className={styles.name}>{identity.name}</a>
      <nav aria-label="Sections" className={styles.nav}>
        <a href="#graph">Work</a>
        <a href="#stack">Stack</a>
        <a href="#contact">Contact</a>
      </nav>
    </header>
  );
}
```

```css
/* src/components/header/SiteHeader.module.css */
.header {
  position: absolute;
  inset: 0 0 auto 0;
  z-index: 5;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--s-3) var(--s-4);
  font-size: var(--text-label);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
}

.name { color: var(--ink); text-decoration: none; font-weight: 500; }

.nav { display: flex; gap: var(--s-3); }
.nav a { color: var(--muted); text-decoration: none; }
.nav a:hover { color: var(--ink); }

@media (max-width: 720px) {
  .header { padding: var(--s-2) var(--s-2); }
  .nav { gap: var(--s-2); }
}
```

- [ ] **Step 2: Hero**

```tsx
// src/components/hero/Hero.tsx
import Image from "next/image";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { copy, identity } from "@/content";
import styles from "./Hero.module.css";

export function Hero() {
  return (
    <section id="hero" className={styles.hero} aria-label="Introduction">
      <div className={styles.stage}>
        <Image
          id="hero-portrait"
          className={styles.portrait}
          src="/hero-crop.webp"
          alt={`${identity.name}, head and shoulders`}
          width={739}
          height={900}
          priority
          sizes="(max-width: 720px) 78vw, 46vh"
        />
        <div className={styles.vignette} aria-hidden="true" />
      </div>
      <div className={styles.caption}>
        <Eyebrow>{copy.hero.eyebrow}</Eyebrow>
        <h1 className={styles.name}>{identity.name}</h1>
        <p className={styles.line}>{copy.hero.line}</p>
      </div>
    </section>
  );
}
```

```css
/* src/components/hero/Hero.module.css */
.hero {
  position: relative;
  min-height: 100svh;
  display: grid;
  grid-template-rows: 1fr auto;
  align-items: end;
  overflow: hidden;
}

.stage {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding-top: 6vh;
}

.portrait {
  width: auto;
  height: min(72vh, 900px);
  max-width: 78vw;
  object-fit: contain;
  /* Phase 2 fades this behind the canvas; keep it opaque here. */
}

.vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(to top, rgba(10, 8, 16, 0.96) 0%, rgba(10, 8, 16, 0.55) 18%, transparent 42%),
    radial-gradient(ellipse 78% 68% at 50% 42%, transparent 44%, rgba(10, 8, 16, 0.55) 80%, var(--ground) 100%);
}

.caption {
  position: relative;
  z-index: 2;
  width: var(--col-prose);
  margin-inline: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--s-2);
  padding-bottom: 8vh;
}

.name { color: var(--ink); }

.line {
  font-size: var(--text-small);
  color: var(--muted);
  max-width: 46ch;
}

@media (max-width: 720px) {
  .portrait { height: min(58vh, 620px); }
  .caption { padding-bottom: 10vh; }
}
```

- [ ] **Step 3: Thesis**

```tsx
// src/components/thesis/Thesis.tsx
import { copy } from "@/content";
import styles from "./Thesis.module.css";

export function Thesis() {
  const [a, em, b] = copy.thesis.heading;
  return (
    <section id="thesis" className={styles.thesis} aria-labelledby="thesis-title">
      <h2 id="thesis-title" className={styles.heading}>
        {a}<em>{em}</em>{b}
      </h2>
      <p className={styles.body}>{copy.thesis.body}</p>
    </section>
  );
}
```

```css
/* src/components/thesis/Thesis.module.css */
.thesis {
  width: var(--col-prose);
  margin-inline: auto;
  min-height: 70svh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  gap: var(--s-4);
  padding-block: var(--section-gap);
}

.heading { font-size: var(--display-2); }

.body {
  color: var(--muted);
  max-width: 58ch;
}
```

- [ ] **Step 4: Compose page.tsx**

```tsx
// src/app/page.tsx
import { SiteHeader } from "@/components/header/SiteHeader";
import { Hero } from "@/components/hero/Hero";
import { Thesis } from "@/components/thesis/Thesis";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <Hero />
        <Thesis />
      </main>
    </>
  );
}
```

- [ ] **Step 5: Verify in Chrome**

Run: `pnpm dev`. Open `http://localhost:3000` at 1440px and at 390px width.
Expected: portrait centered with the vignette bleeding into the ground colour, name in Instrument Serif at the bottom, thesis section below with the italic accent phrase. No horizontal scroll. Check the Network panel: hero-crop is fetched with priority high, no layout shift when fonts arrive.

- [ ] **Step 6: Commit**

```bash
git add src/components/header src/components/hero src/components/thesis src/app/page.tsx
git commit -m "feat(home): add header, static hero portrait and thesis section"
git push
```

---

### Task 8: The project graph as inline SVG

**Files:**
- Create: `src/components/graph/layout.ts`, `Graph.tsx`, `Graph.module.css`, `tests/unit/graph-layout.test.ts`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Produces: `NODE_POSITIONS: Record<Slug, {x: number; y: number; anchor: "start" | "middle" | "end"; dy: number}>` in a `0 0 1000 720` viewBox; `edgeGeometry(edge)` returning endpoints and label midpoint; `<Graph />` with `id="graph"`. Phase 2 reads `[data-graph-node]` elements' bounding boxes to place the particle constellation on top of this exact layout.

- [ ] **Step 1: Failing layout test**

```ts
// tests/unit/graph-layout.test.ts
import { describe, expect, it } from "vitest";
import { edges, projects } from "@/content";
import { NODE_POSITIONS, edgeGeometry, VIEWBOX } from "@/components/graph/layout";

describe("graph layout", () => {
  it("positions every project inside the viewbox with margin", () => {
    for (const p of projects) {
      const n = NODE_POSITIONS[p.slug];
      expect(n.x).toBeGreaterThan(80);
      expect(n.x).toBeLessThan(VIEWBOX.w - 80);
      expect(n.y).toBeGreaterThan(60);
      expect(n.y).toBeLessThan(VIEWBOX.h - 60);
    }
  });

  it("keeps nodes at least 180 units apart", () => {
    const list = projects.map((p) => NODE_POSITIONS[p.slug]);
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i]!, b = list[j]!;
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(180);
      }
    }
  });

  it("edge label midpoints lie on the segment", () => {
    for (const e of edges) {
      const g = edgeGeometry(e);
      expect(g.mx).toBeCloseTo((g.x1 + g.x2) / 2, 5);
      expect(g.my).toBeCloseTo((g.y1 + g.y2) / 2, 5);
    }
  });
});
```

Run: `pnpm test tests/unit/graph-layout.test.ts`
Expected: FAIL, cannot resolve `@/components/graph/layout`.

- [ ] **Step 2: layout.ts**

Praman is the hub at top centre. Positions echo the reference constellation but spread for legibility.

```ts
// src/components/graph/layout.ts
import type { Edge, Slug } from "@/content";

export const VIEWBOX = { w: 1000, h: 720 } as const;

export interface NodePos {
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
  dy: number;
}

export const NODE_POSITIONS: Record<Slug, NodePos> = {
  praman:   { x: 500, y: 150, anchor: "middle", dy: -34 },
  honora:   { x: 150, y: 300, anchor: "end",    dy: -22 },
  aegisai:  { x: 850, y: 290, anchor: "start",  dy: -22 },
  assetize: { x: 250, y: 560, anchor: "end",    dy: 46 },
  nexus:    { x: 760, y: 550, anchor: "start",  dy: 46 },
  zyra:     { x: 505, y: 650, anchor: "middle", dy: 46 },
};

export function edgeGeometry(edge: Edge) {
  const a = NODE_POSITIONS[edge.from];
  const b = NODE_POSITIONS[edge.to];
  return {
    x1: a.x, y1: a.y, x2: b.x, y2: b.y,
    mx: (a.x + b.x) / 2,
    my: (a.y + b.y) / 2,
    angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
  };
}
```

Run: `pnpm test tests/unit/graph-layout.test.ts`
Expected: PASS.

- [ ] **Step 3: Graph component**

```tsx
// src/components/graph/Graph.tsx
import { Eyebrow } from "@/components/ui/Eyebrow";
import { bySlug, copy, edges, projects } from "@/content";
import { NODE_POSITIONS, VIEWBOX, edgeGeometry } from "./layout";
import styles from "./Graph.module.css";

const href = (slug: string, flagship: boolean, repo: string) => (flagship ? `/work/${slug}` : repo);

export function Graph() {
  const [a, em, b] = copy.graph.heading;
  return (
    <section id="graph" className={styles.graph} aria-labelledby="graph-title">
      <div className={styles.intro}>
        <Eyebrow>{copy.graph.eyebrow}</Eyebrow>
        <h2 id="graph-title">{a}<em>{em}</em>{b}</h2>
        <p className={styles.body}>{copy.graph.body}</p>
      </div>

      <svg
        className={styles.svg}
        viewBox={`0 0 ${VIEWBOX.w} ${VIEWBOX.h}`}
        role="img"
        aria-label="Six projects connected by the concerns they share"
      >
        <g className={styles.edges}>
          {edges.map((e) => {
            const g = edgeGeometry(e);
            const flip = g.angle > 90 || g.angle < -90;
            return (
              <g key={`${e.from}-${e.to}`} className={styles.edge}>
                <line x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} />
                <text
                  x={g.mx}
                  y={g.my}
                  dy={-8}
                  textAnchor="middle"
                  transform={`rotate(${flip ? g.angle + 180 : g.angle} ${g.mx} ${g.my})`}
                >
                  {e.concern}
                </text>
              </g>
            );
          })}
        </g>
        <g className={styles.nodes}>
          {projects.map((p) => {
            const n = NODE_POSITIONS[p.slug];
            return (
              <a
                key={p.slug}
                href={href(p.slug, p.flagship, p.repo)}
                className={styles.node}
                data-graph-node={p.slug}
                aria-label={`${p.name}, ${p.tagline}`}
              >
                <circle cx={n.x} cy={n.y} r={p.flagship ? 7 : 5} />
                <text x={n.x} y={n.y + n.dy} textAnchor={n.anchor} className={styles.name}>{p.name}</text>
                <text x={n.x} y={n.y + n.dy + 18} textAnchor={n.anchor} className={styles.note}>{p.tagline}</text>
              </a>
            );
          })}
        </g>
      </svg>

      <ul className={styles.list}>
        {edges.map((e) => (
          <li key={`${e.from}-${e.to}`}>
            <a href={href(e.from, bySlug(e.from).flagship, bySlug(e.from).repo)}>{bySlug(e.from).name}</a>
            {" and "}
            <a href={href(e.to, bySlug(e.to).flagship, bySlug(e.to).repo)}>{bySlug(e.to).name}</a>
            <span className={styles.concern}>{e.concern}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

```css
/* src/components/graph/Graph.module.css */
.graph {
  width: var(--col-wide);
  margin-inline: auto;
  display: flex;
  flex-direction: column;
  gap: var(--s-6);
  padding-block: var(--section-gap);
}

.intro {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--s-2);
}

.body { color: var(--muted); max-width: 52ch; }

.svg {
  width: 100%;
  height: auto;
  font-family: var(--font-mono);
  overflow: visible;
}

.edges line {
  stroke: var(--hairline);
  stroke-width: 1;
  transition: stroke 0.25s ease;
}

.edges text {
  font-size: 11px;
  letter-spacing: 0.08em;
  fill: var(--muted);
  opacity: 0.7;
  transition: fill 0.25s ease, opacity 0.25s ease;
}

.edge:hover line { stroke: var(--accent); }
.edge:hover text { fill: var(--ink); opacity: 1; }

.node { cursor: pointer; text-decoration: none; }
.node circle { fill: var(--accent); transition: r 0.2s ease, fill 0.2s ease; }
.node:hover circle,
.node:focus-visible circle { fill: var(--gold); }
.node:focus-visible { outline: none; }
.node:focus-visible .name { fill: var(--gold); }

.name {
  font-size: 15px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  fill: var(--ink);
}

.note {
  font-size: 11px;
  letter-spacing: 0.06em;
  fill: var(--muted);
}

.list { display: none; }

@media (max-width: 720px) {
  .svg { display: none; }
  .list {
    display: flex;
    flex-direction: column;
    gap: var(--s-2);
    font-size: var(--text-small);
  }
  .list li {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-block: var(--s-2);
    border-top: 1px solid var(--hairline);
  }
  .concern { color: var(--muted); }
}
```

- [ ] **Step 4: Add to page.tsx after `<Thesis />`**

```tsx
import { Graph } from "@/components/graph/Graph";
// inside <main>, after <Thesis />:
<Graph />
```

- [ ] **Step 5: Verify in Chrome**

Expected at desktop: six nodes, seven hairline edges with rotated concern labels along them, Praman at the top. Hovering an edge brightens it and its label. Tabbing reaches every node and shows the gold focus state. At 390px: the SVG is gone and the seven-line list appears.

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: PASS, clean.

- [ ] **Step 6: Commit**

```bash
git add src/components/graph tests/unit/graph-layout.test.ts src/app/page.tsx
git commit -m "feat(graph): add the project constellation as server-rendered svg with a mobile list"
git push
```

---

### Task 9: Case-study list, Also built, Open source

**Files:**
- Create: `src/components/cases/CaseList.tsx`, `CaseList.module.css`, `src/components/also/AlsoBuilt.tsx`, `AlsoBuilt.module.css`, `src/components/oss/OpenSource.tsx`, `OpenSource.module.css`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Produces: `<CaseList />` (`id="cases"`), `<AlsoBuilt />` (`id="also"`), `<OpenSource />` (`id="oss"`). Case entries carry `data-project={slug}` and `data-uses="key key ..."` for the stack highlighting in Task 10.

- [ ] **Step 1: CaseList**

```tsx
// src/components/cases/CaseList.tsx
import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { StatusChip } from "@/components/ui/StatusChip";
import { copy, flagships } from "@/content";
import styles from "./CaseList.module.css";

export function CaseList() {
  return (
    <Section id="cases" number="01" title={copy.cases.title} wide>
      <ol className={styles.list}>
        {flagships().map((p, i) => (
          <li key={p.slug} className={styles.item} data-project={p.slug} data-uses={p.stack.join(" ")}>
            <div className={styles.meta}>
              <span className={`${styles.index} tnum`}>{String(i + 1).padStart(2, "0")}</span>
              <StatusChip status={p.status} />
            </div>
            <div className={styles.main}>
              <h3 className={styles.name}>
                <Link href={`/work/${p.slug}`}>{p.name}</Link>
                <span className={styles.tagline}>{p.tagline}</span>
              </h3>
              <p className={styles.summary}>{p.summary}</p>
              <p className={styles.owned}><span className={styles.k}>What I owned</span>{p.owned}</p>
            </div>
            <dl className={styles.headline}>
              <dt>{p.headline.label}</dt>
              <dd className="tnum">{p.headline.value}</dd>
            </dl>
          </li>
        ))}
      </ol>
    </Section>
  );
}
```

```css
/* src/components/cases/CaseList.module.css */
.list { display: flex; flex-direction: column; }

.item {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr) 220px;
  gap: var(--s-4);
  padding-block: var(--s-5);
  border-top: 1px solid var(--hairline);
}

.item:first-child { border-top: 0; padding-top: 0; }

.meta {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
  font-size: var(--text-label);
  letter-spacing: var(--tracking-label);
  color: var(--muted);
}

.index { color: var(--accent); }

.main { display: flex; flex-direction: column; gap: var(--s-2); min-width: 0; }

.name {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--s-2);
  font-size: var(--display-3);
}

.name a { text-decoration: none; }
.name a:hover { color: var(--accent); }

.tagline {
  font-family: var(--font-mono);
  font-size: var(--text-small);
  letter-spacing: 0;
  color: var(--muted);
}

.summary { color: var(--ink); max-width: 62ch; }

.owned {
  font-size: var(--text-small);
  color: var(--muted);
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 62ch;
}

.k {
  font-size: var(--text-label);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--accent);
}

.headline {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-self: start;
  padding: var(--s-2) 0 0;
  border-top: 1px solid var(--accent);
}

.headline dt { font-size: var(--text-label); letter-spacing: 0.1em; color: var(--muted); }
.headline dd { font-family: var(--font-display); font-size: var(--display-3); color: var(--ink); }

@media (max-width: 900px) {
  .item { grid-template-columns: 1fr; gap: var(--s-3); }
  .meta { flex-direction: row; align-items: center; }
}
```

- [ ] **Step 2: AlsoBuilt and OpenSource**

```tsx
// src/components/also/AlsoBuilt.tsx
import { Section } from "@/components/ui/Section";
import { copy, projects } from "@/content";
import styles from "./AlsoBuilt.module.css";

export function AlsoBuilt() {
  const others = projects.filter((p) => !p.flagship);
  return (
    <Section id="also" number="02" title={copy.also.title}>
      <ul className={styles.grid}>
        {others.map((p) => (
          <li key={p.slug} className={styles.item} data-project={p.slug} data-uses={p.stack.join(" ")}>
            <h3 className={styles.name}>
              <a href={p.repo} rel="noopener">{p.name}</a>
              <span className={styles.tagline}>{p.tagline}</span>
            </h3>
            <p>{p.summary}</p>
            <p className={styles.owned}>{p.owned}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
```

```css
/* src/components/also/AlsoBuilt.module.css */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--s-5);
}

.item { display: flex; flex-direction: column; gap: var(--s-2); font-size: var(--text-small); }

.name { display: flex; flex-direction: column; gap: 2px; font-size: var(--display-3); }
.name a { text-decoration: none; }
.name a:hover { color: var(--accent); }

.tagline { font-family: var(--font-mono); font-size: var(--text-small); color: var(--muted); }

.owned { color: var(--muted); }
```

```tsx
// src/components/oss/OpenSource.tsx
import { Section } from "@/components/ui/Section";
import { copy, identity } from "@/content";
import styles from "./OpenSource.module.css";

export function OpenSource() {
  return (
    <Section id="oss" number="03" title={copy.oss.title}>
      <p className={styles.line}>{identity.openSource}</p>
    </Section>
  );
}
```

```css
/* src/components/oss/OpenSource.module.css */
.line { color: var(--ink); }
```

- [ ] **Step 3: Add to page.tsx after `<Graph />`**

```tsx
import { CaseList } from "@/components/cases/CaseList";
import { AlsoBuilt } from "@/components/also/AlsoBuilt";
import { OpenSource } from "@/components/oss/OpenSource";
// after <Graph />:
<CaseList />
<AlsoBuilt />
<OpenSource />
```

- [ ] **Step 4: Verify in Chrome and commit**

Expected: four case entries in a three-column row each (index and chip, prose, headline figure), collapsing to one column under 900px. Also built is two plain columns. Open source is one line.

```bash
git add src/components/cases src/components/also src/components/oss src/app/page.tsx
git commit -m "feat(home): add case-study list, also-built grid and open-source line"
git push
```

---

### Task 10: Stack section with CSS-only cross-highlighting

**Files:**
- Create: `src/components/stack/Stack.tsx`, `Stack.module.css`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `stack`, `stackByBucket`, `projects`.
- Produces: `<Stack />` (`id="stack"`). Inside the section, technologies carry `data-tech={key}` and `data-usedby="slug slug"`, project names carry `data-project={slug}` and `data-uses="key key"`. A generated `<style>` block makes hover or focus on either side highlight the other side. No JavaScript.

- [ ] **Step 1: Stack component**

```tsx
// src/components/stack/Stack.tsx
import { Section } from "@/components/ui/Section";
import { copy, projects, stack, stackByBucket, type StackBucket } from "@/content";
import styles from "./Stack.module.css";

const BUCKETS: StackBucket[] = ["built", "worked", "exploring"];

function highlightCss(): string {
  const dim = `#stack:has([data-tech]:is(:hover,:focus-visible)) [data-project],
#stack:has([data-project]:is(:hover,:focus-visible)) [data-tech] { opacity: .35; }`;
  const byTech = stack
    .filter((s) => s.projects.length > 0)
    .map(
      (s) =>
        `#stack:has([data-tech="${s.key}"]:is(:hover,:focus-visible)) [data-project][data-uses~="${s.key}"] { opacity: 1; color: var(--ink); }`,
    );
  const byProject = projects.map(
    (p) =>
      `#stack:has([data-project="${p.slug}"]:is(:hover,:focus-visible)) [data-tech][data-usedby~="${p.slug}"] { opacity: 1; color: var(--ink); }`,
  );
  return [dim, ...byTech, ...byProject].join("\n");
}

export function Stack() {
  return (
    <Section id="stack" number="04" title={copy.stack.title} wide>
      <style dangerouslySetInnerHTML={{ __html: highlightCss() }} />
      <p className={styles.hint}>{copy.stack.body}</p>

      <ul className={styles.projects} aria-label="Projects">
        {projects.map((p) => (
          <li key={p.slug}>
            <span className={styles.project} tabIndex={0} data-project={p.slug} data-uses={p.stack.join(" ")}>
              {p.name}
            </span>
          </li>
        ))}
      </ul>

      <div className={styles.buckets}>
        {BUCKETS.map((b) => (
          <div key={b} className={styles.bucket}>
            <h3 className={styles.bucketTitle}>{copy.stack.buckets[b]}</h3>
            <ul className={styles.techs}>
              {stackByBucket(b).map((s) => (
                <li key={s.key}>
                  <span
                    className={styles.tech}
                    tabIndex={s.projects.length ? 0 : -1}
                    data-tech={s.key}
                    data-usedby={s.projects.join(" ")}
                  >
                    {s.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  );
}
```

```css
/* src/components/stack/Stack.module.css */
.hint { color: var(--muted); font-size: var(--text-small); }

.projects {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2) var(--s-4);
  padding-block: var(--s-2);
  border-block: 1px solid var(--hairline);
}

.project {
  font-family: var(--font-display);
  font-size: var(--display-3);
  color: var(--ink);
  cursor: default;
  transition: opacity 0.2s ease, color 0.2s ease;
}

.buckets {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--s-5);
}

.bucket { display: flex; flex-direction: column; gap: var(--s-2); }

.bucketTitle {
  font-family: var(--font-mono);
  font-size: var(--text-label);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--accent);
}

.techs { display: flex; flex-wrap: wrap; gap: var(--s-1) var(--s-2); }

.tech {
  display: inline-block;
  font-size: var(--text-small);
  color: var(--muted);
  padding: 2px 0;
  border-bottom: 1px solid transparent;
  cursor: default;
  transition: opacity 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.tech:hover,
.tech:focus-visible { color: var(--ink); border-bottom-color: var(--accent); outline: none; }

@media (max-width: 900px) {
  .buckets { grid-template-columns: 1fr; }
}
```

- [ ] **Step 2: Add to page.tsx after `<OpenSource />`**

```tsx
import { Stack } from "@/components/stack/Stack";
<Stack />
```

- [ ] **Step 3: Verify in Chrome**

Expected: hovering "PostgreSQL" dims every project name except Praman and Assetize. Hovering "Honora" dims every technology except its eight. Keyboard Tab reaches technologies and projects and does the same. Nothing happens with JavaScript disabled beyond the plain lists, which is fine.

- [ ] **Step 4: Commit**

```bash
git add src/components/stack src/app/page.tsx
git commit -m "feat(stack): add stack buckets with css-only technology and project cross-highlighting"
git push
```

---

### Task 11: How I build and Contact

**Files:**
- Create: `src/components/how/HowIBuild.tsx`, `HowIBuild.module.css`, `src/components/contact/Contact.tsx`, `Contact.module.css`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: HowIBuild**

```tsx
// src/components/how/HowIBuild.tsx
import { Section } from "@/components/ui/Section";
import { copy } from "@/content";
import styles from "./HowIBuild.module.css";

export function HowIBuild() {
  return (
    <Section id="how" number="05" title={copy.how.title}>
      <ol className={styles.list}>
        {copy.how.paragraphs.map((text, i) => (
          <li key={i} className={styles.item}>
            <span className={`${styles.n} tnum`} aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
            <p>{text}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
```

```css
/* src/components/how/HowIBuild.module.css */
.list { display: flex; flex-direction: column; gap: var(--s-4); }

.item {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: var(--s-2);
  align-items: baseline;
}

.n {
  font-size: var(--text-label);
  letter-spacing: var(--tracking-label);
  color: var(--accent);
}
```

- [ ] **Step 2: Contact**

```tsx
// src/components/contact/Contact.tsx
import { copy, identity } from "@/content";
import styles from "./Contact.module.css";

export function Contact() {
  const [a, em, b] = copy.contact.heading;
  return (
    <section id="contact" className={styles.contact} aria-labelledby="contact-title">
      <div className={styles.inner}>
        <h2 id="contact-title" className={styles.heading}>{a}<em>{em}</em>{b}</h2>
        <p className={styles.body}>{copy.contact.body}</p>
        <a className={styles.email} href={`mailto:${identity.email}`}>{identity.email}</a>
        <ul className={styles.links}>
          <li><a href={identity.github} rel="me noopener">GitHub</a></li>
          <li><a href={identity.linkedin} rel="me noopener">LinkedIn</a></li>
          <li><a href={identity.x} rel="me noopener">X</a></li>
          <li><a href={identity.resume}>Résumé, PDF</a></li>
        </ul>
        <p className={styles.foot}>{identity.location}. {identity.study}.</p>
      </div>
    </section>
  );
}
```

```css
/* src/components/contact/Contact.module.css */
.contact {
  min-height: 80svh;
  display: grid;
  place-items: center;
  padding-block: var(--section-gap) var(--s-6);
  border-top: 1px solid var(--hairline);
}

.inner {
  width: var(--col-prose);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--s-3);
}

.heading { font-size: var(--display-1); }

.body { color: var(--muted); max-width: 46ch; }

.email {
  font-family: var(--font-display);
  font-size: var(--display-3);
  color: var(--ink);
  text-decoration-color: var(--accent);
}

.links {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--s-3);
  font-size: var(--text-label);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
}

.links a { color: var(--muted); text-decoration: none; }
.links a:hover { color: var(--ink); }

.foot {
  font-size: var(--text-label);
  letter-spacing: 0.08em;
  color: var(--muted);
  padding-top: var(--s-5);
}
```

- [ ] **Step 3: Finish page.tsx**

```tsx
// src/app/page.tsx, final
import { SiteHeader } from "@/components/header/SiteHeader";
import { Hero } from "@/components/hero/Hero";
import { Thesis } from "@/components/thesis/Thesis";
import { Graph } from "@/components/graph/Graph";
import { CaseList } from "@/components/cases/CaseList";
import { AlsoBuilt } from "@/components/also/AlsoBuilt";
import { OpenSource } from "@/components/oss/OpenSource";
import { Stack } from "@/components/stack/Stack";
import { HowIBuild } from "@/components/how/HowIBuild";
import { Contact } from "@/components/contact/Contact";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <Hero />
        <Thesis />
        <Graph />
        <CaseList />
        <AlsoBuilt />
        <OpenSource />
        <Stack />
        <HowIBuild />
        <Contact />
      </main>
    </>
  );
}
```

- [ ] **Step 4: Verify and commit**

Run: `pnpm check && pnpm build`
Expected: clean. In Chrome, the full page scrolls from hero to contact with consistent rhythm. Résumé link opens `/resume.pdf`.

```bash
git add src/components/how src/components/contact src/app/page.tsx
git commit -m "feat(home): add how-i-build and contact sections, home page complete"
git push
```

---

### Task 12: Minimal case-study pages

**Files:**
- Create: `src/components/work/CaseStudy.tsx`, `CaseStudy.module.css`, `src/app/work/[slug]/page.tsx`, `src/app/not-found.tsx`

**Interfaces:**
- Produces: `/work/praman`, `/work/honora`, `/work/aegisai`, `/work/assetize`, statically generated. `<CaseStudy project />` renders every field as prose; Phase 3 adds diagrams and the large proof element into the slot marked below.

- [ ] **Step 1: CaseStudy component**

```tsx
// src/components/work/CaseStudy.tsx
import type { ReactNode } from "react";
import Link from "next/link";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Figures } from "@/components/ui/Figures";
import { Prose } from "@/components/ui/Prose";
import { StatusChip } from "@/components/ui/StatusChip";
import { flagships, stackFor, type Project } from "@/content";
import styles from "./CaseStudy.module.css";

function Block({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className={styles.block} aria-labelledby={`${id}-t`}>
      <h2 id={`${id}-t`} className={styles.blockTitle}>{title}</h2>
      <div className={styles.blockBody}>{children}</div>
    </section>
  );
}

export function CaseStudy({ project: p }: { project: Project }) {
  const list = flagships();
  const i = list.findIndex((x) => x.slug === p.slug);
  const prev = list[(i + list.length - 1) % list.length]!;
  const next = list[(i + 1) % list.length]!;

  return (
    <article className={styles.article}>
      <header className={styles.head}>
        <div className={styles.meta}>
          <Link href="/#cases" className={styles.back}>Adwaith R Nair</Link>
          <StatusChip status={p.status} />
        </div>
        <Eyebrow>{p.context}</Eyebrow>
        <h1 className={styles.title}>
          {p.name} <span className={styles.tagline}>{p.tagline}</span>
        </h1>
        <p className={styles.period}>{p.period}. <a href={p.repo} rel="noopener">Repository</a>.</p>
        <p className={styles.owned}>
          <span className={styles.k}>What I owned</span>
          {p.owned}
        </p>
        {p.team ? (
          <ul className={styles.credits}>
            {p.team.credits.map((c) => (
              <li key={c.name}><strong>{c.name}</strong> {c.owned}</li>
            ))}
          </ul>
        ) : null}
        {p.onchain ? (
          <p className={styles.onchain}>
            Verified on {p.onchain.network}:{" "}
            <a href={p.onchain.explorer} rel="noopener" className="tnum">{p.onchain.address}</a>
          </p>
        ) : null}
      </header>

      {/* Phase 3: architecture diagram slot goes here. */}

      <Block id="problem" title="Problem"><Prose><p>{p.problem}</p></Prose></Block>
      <Block id="architecture" title="Architecture">
        <Prose>{p.architecture.map((t, k) => <p key={k}>{t}</p>)}</Prose>
      </Block>
      {p.decisions.length ? (
        <Block id="decisions" title="Decisions">
          <dl className={styles.titled}>
            {p.decisions.map((d) => (
              <div key={d.title}><dt>{d.title}</dt><dd>{d.body}</dd></div>
            ))}
          </dl>
        </Block>
      ) : null}
      <Block id="proof" title="Measured, not asserted"><Figures items={p.proof} /></Block>
      {p.bugs?.length ? (
        <Block id="bugs" title="Bugs worth telling">
          <dl className={styles.titled}>
            {p.bugs.map((d) => (
              <div key={d.title}><dt>{d.title}</dt><dd>{d.body}</dd></div>
            ))}
          </dl>
        </Block>
      ) : null}
      <Block id="limits" title="Honest limits">
        <ul className={styles.limits}>{p.limits.map((l) => <li key={l}>{l}</li>)}</ul>
      </Block>
      {p.scale?.length ? <Block id="scale" title="Scale"><Figures items={p.scale} /></Block> : null}
      <Block id="stack" title="Stack">
        <ul className={styles.stack}>{stackFor(p.slug).map((s) => <li key={s.key}>{s.name}</li>)}</ul>
      </Block>

      <nav className={styles.neighbours} aria-label="Other case studies">
        <Link href={`/work/${prev.slug}`}>Previous: {prev.name}</Link>
        <Link href={`/work/${next.slug}`}>Next: {next.name}</Link>
      </nav>
    </article>
  );
}
```

```css
/* src/components/work/CaseStudy.module.css */
.article {
  width: var(--col-prose);
  margin-inline: auto;
  display: flex;
  flex-direction: column;
  gap: var(--s-7);
  padding-block: var(--s-6) var(--s-8);
}

.head { display: flex; flex-direction: column; gap: var(--s-3); }

.meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--text-label);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  padding-bottom: var(--s-4);
}

.back { color: var(--ink); text-decoration: none; font-weight: 500; }

.title { display: flex; flex-direction: column; gap: var(--s-1); }

.tagline {
  font-family: var(--font-mono);
  font-size: var(--text-small);
  letter-spacing: 0;
  color: var(--muted);
}

.period { color: var(--muted); font-size: var(--text-small); }

.owned { display: flex; flex-direction: column; gap: 4px; }

.k {
  font-size: var(--text-label);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--accent);
}

.credits {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-1) var(--s-3);
  font-size: var(--text-small);
  color: var(--muted);
}

.credits strong { font-weight: 500; color: var(--ink); }

.onchain {
  font-size: var(--text-small);
  color: var(--muted);
  word-break: break-all;
}

.onchain a { color: var(--gold); }

.block {
  display: grid;
  grid-template-columns: var(--label-col) minmax(0, 1fr);
  gap: var(--s-3) var(--s-5);
  border-top: 1px solid var(--hairline);
  padding-top: var(--s-4);
}

.blockTitle {
  font-family: var(--font-mono);
  font-size: var(--text-label);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--muted);
  line-height: 1.4;
}

.blockBody { display: flex; flex-direction: column; gap: var(--s-3); min-width: 0; }

.titled { display: flex; flex-direction: column; gap: var(--s-3); }
.titled div { display: flex; flex-direction: column; gap: 4px; max-width: var(--measure); }
.titled dt { color: var(--ink); font-weight: 500; }
.titled dd { color: var(--muted); }

.limits { display: flex; flex-direction: column; gap: var(--s-1); max-width: var(--measure); }
.limits li { padding-left: var(--s-2); border-left: 1px solid var(--accent); color: var(--ink); }

.stack { display: flex; flex-wrap: wrap; gap: var(--s-1) var(--s-2); font-size: var(--text-small); color: var(--muted); }

.neighbours {
  display: flex;
  justify-content: space-between;
  gap: var(--s-3);
  border-top: 1px solid var(--hairline);
  padding-top: var(--s-4);
  font-size: var(--text-label);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
}

@media (max-width: 720px) {
  .block { grid-template-columns: 1fr; }
}
```

- [ ] **Step 2: Route and not-found**

```tsx
// src/app/work/[slug]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CaseStudy } from "@/components/work/CaseStudy";
import { flagships, type Slug } from "@/content";

type Params = { slug: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return flagships().map((p) => ({ slug: p.slug }));
}

function find(slug: string) {
  return flagships().find((p) => p.slug === (slug as Slug));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const p = find(slug);
  if (!p) return {};
  return { title: p.name, description: p.summary };
}

export default async function WorkPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const p = find(slug);
  if (!p) notFound();
  return (
    <main id="main">
      <CaseStudy project={p} />
    </main>
  );
}
```

```tsx
// src/app/not-found.tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" style={{ minHeight: "100svh", display: "grid", placeItems: "center", textAlign: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px", alignItems: "center" }}>
        <h1>Nothing here.</h1>
        <Link href="/">Back to the portfolio</Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Verify**

Run: `pnpm build`
Expected: route table lists `/work/[slug]` with four static paths. `pnpm start`, open `/work/honora`: the Sepolia address is a gold link. `/work/nexus` returns the not-found page.

- [ ] **Step 4: Commit**

```bash
git add src/components/work src/app/work src/app/not-found.tsx
git commit -m "feat(work): add statically generated case-study pages for the four flagships"
git push
```

---

### Task 13: End-to-end tests, Lighthouse CI, GitHub Actions, Chrome review

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/pages.spec.ts`, `lighthouserc.json`, `.github/workflows/ci.yml`
- Modify: `package.json` (devDependencies)

- [ ] **Step 1: Install**

Run: `pnpm add -D @playwright/test@^1.63.0 @lhci/cli@^0.15.1 && pnpm exec playwright install chromium`

- [ ] **Step 2: playwright.config.ts**

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure" },
  webServer: {
    command: "pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
```

- [ ] **Step 3: The failing spec (fails until the server is built and started)**

```ts
// tests/e2e/pages.spec.ts
import { expect, test } from "@playwright/test";

const FLAGSHIPS = ["praman", "honora", "aegisai", "assetize"];

test("home renders every section heading", async ({ page }) => {
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
  for (const name of ["Praman", "Honora", "AegisAI", "Assetize", "Nexus", "Zyra"]) expect(html).toContain(name);
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
    await expect(page.getByText("What I owned")).toBeVisible();
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

test("no horizontal overflow on mobile", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile");
  await page.goto("/");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
```

- [ ] **Step 4: Run e2e**

Run: `pnpm build && pnpm test:e2e`
Expected: all tests pass on both projects. If "reduced motion removes transitions" fails, the cause is a component with `transition` declared after the global reduced-motion rule; fix by keeping the `!important` rule in globals.css (it already has it).

- [ ] **Step 5: lighthouserc.json**

```json
{
  "ci": {
    "collect": {
      "startServerCommand": "pnpm start",
      "startServerReadyPattern": "Ready",
      "url": ["http://localhost:3000/", "http://localhost:3000/work/praman"],
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "categories:best-practices": ["warn", { "minScore": 0.9 }],
        "categories:seo": ["warn", { "minScore": 0.9 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.02 }]
      }
    },
    "upload": { "target": "temporary-public-storage" }
  }
}
```

Run: `pnpm build && pnpm exec lhci autorun`
Expected: performance 0.95 or higher on both URLs under the mobile preset. Record the numbers in the commit message.

- [ ] **Step 6: GitHub Actions**

```yaml
# .github/workflows/ci.yml
name: ci
on:
  push:
    branches: [main]
  pull_request:

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm check
      - run: pnpm build
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm test:e2e
        env:
          CI: "true"
      - run: pnpm exec lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

The `LHCI_GITHUB_APP_TOKEN` secret is optional; without it Lighthouse still runs and asserts, it just does not post a status.

- [ ] **Step 7: Chrome review against design.md section 6**

Open the built site in Chrome at 1440px, 1024px and 390px. Check each of: rhythm between sections is even; no element uses a margin where a gap should be; every heading balances; figures use tabular numerals; the hairline weight is consistent; nothing looks like a card. Fix what fails in the components touched, as part of this task.

- [ ] **Step 8: Commit**

```bash
git add package.json pnpm-lock.yaml playwright.config.ts tests/e2e lighthouserc.json .github
git add -u src
git commit -m "test: add playwright smoke, no-js and reduced-motion suites, lighthouse ci and github actions"
git push
```

Phase 1 is done when: `pnpm check`, `pnpm build`, `pnpm test:e2e` and `lhci autorun` all pass locally, the GitHub Actions run is green, and the site has been reviewed in Chrome at three widths.

---

## Phase 2 to 6: what each detailed plan must cover

Written as `docs/plans/phase-N-*.md` at the start of each phase, following this file's task format.

**Phase 2, hero.** `sampling.ts` with tests on synthetic images; `tiers.ts` with the "none" tier and stepper tests on fake frame sequences; `scroll.ts` mapping `#hero`, `#thesis`, `#graph`, `#also`, `#contact` bounding rects to weights; `worker.ts` with `createImageBitmap` and `OffscreenCanvas`; `renderer.ts` porting `docs/hero-reference.html` with the reference shaders and a fourth "line" target; the constellation target built from `[data-graph-node]` screen positions unprojected at z = 0 so the points settle onto the SVG; `HeroParticles.tsx` loaded with `next/dynamic({ ssr: false })` on idle, fading the canvas in over `#hero-portrait`; SVG lines and circles dim under `html[data-particles="on"]`; context-loss and worker-timeout fallbacks; e2e test that the canvas is absent with `deviceMemory` mocked to 2; bundle size check of the WebGL chunk.

**Phase 3, case studies.** One SVG diagram component per flagship in `src/components/diagrams/`, drawn by hand with tokens: Praman (intent, mandate, policy engine, ledger, two-phase executor), Honora (client, Express gate, contract gate, chain, IPFS, Mongo), AegisAI (request, rule order, confidence terms, three verdicts), Assetize (repository, service, API layers and the hash pool). Honora's on-chain proof becomes a large typographic element above the fold. Neighbour navigation polish. Print stylesheet.

**Phase 4, content.** Adwaith's corrections to How I build and the stack lists; the contact "line" particle state; final copy pass against build-spec.md section 10.

**Phase 5, launch.** `opengraph-image.tsx` at 1200x630 from `public/portrait.png` with the thesis line; `twitter:card`; `sitemap.ts`; `robots.ts`; JSON-LD `Person`; Vercel project, `metadataBase` set to the real domain; privacy-respecting analytics (Vercel Analytics, no cookies); custom domain when chosen.

**Phase 6, devices.** Run on a real mid-range Android over throttled 4G; record LCP and frame rate at each tier; adjust tier guesses; reduced-motion pass with Chrome DevTools emulation; keyboard-only pass; screen-reader pass on the graph.
