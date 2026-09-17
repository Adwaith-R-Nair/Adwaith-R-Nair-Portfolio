# 0002: Initial JavaScript budget is 150 KB, not 90 KB

**Date:** 2026-09-17
**Status:** accepted

## Context

The build spec (section 2) sets "JS before WebGL loads" at under 90 KB gzipped. Measured on the
Phase 2 build with `pnpm budget`, the scripts a modern browser loads on the home page before any
interaction total about 139 KB gzipped: React DOM 70 KB, the Next.js App Router client runtime
about 52 KB, Turbopack runtime and small chunks about 10 KB, and this site's own client code
under 10 KB. A further 39 KB `noModule` polyfill chunk is referenced but never downloaded by a
browser that supports ES modules. The 90 KB figure was set without the framework floor in view;
no Next.js 16 App Router page can meet it.

## Decision

The budget is 150 KB gzipped for the scripts a modern browser loads on `/`, excluding `noModule`
chunks. `scripts/budget.mjs` enforces it in CI. The hero chunk (three.js plus the layer, about
140 KB) stays lazy and is reported, not counted.

## Consequences

- The spec's intent is kept: the WebGL chunk never blocks first paint, the LCP element is the
  static image, and the Phase 1 Lighthouse mobile performance score was 97.
- About 11 KB of headroom remains for future client code before the check fails. Anything larger
  must be lazy.
- If a later Next.js release shrinks the runtime, lower the limit to match rather than spend the
  difference.

## Alternatives considered

- **Pages Router or a non-React framework** to reach 90 KB. Rejected: the site was designed
  around React Server Components and the spec names Next.js.
- **Keeping the 90 KB number as an aspiration with the check disabled.** Rejected: an unenforced
  budget is not a budget.
