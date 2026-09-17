# 0001: Vanilla three.js instead of React Three Fiber

**Date:** 2026-09-17
**Status:** accepted

## Context

The build spec (section 5) says to port the hero reference to React Three Fiber. The same spec makes the performance budget and "no jank" non-negotiable, and states that non-negotiables override any other preference. The site has exactly one WebGL scene: a single `Points` mesh with a custom shader whose state is driven by scroll and pointer position.

## Decision

Build the hero as an imperative three.js module (`src/hero/renderer.ts`) mounted by a thin client component. Do not use React Three Fiber or drei.

## Consequences

- The WebGL chunk is three.js core only, roughly 110 to 130 KB gzipped after tree shaking, instead of that plus about 35 KB for the reconciler.
- Scroll and pointer state flow directly into uniforms. There is no path by which a React re-render can enter the frame loop, which removes the most common cause of jank in R3F sites.
- The reference algorithm ports line for line. Sampling, tiers and shaders are the same code with types added.
- Adding a second WebGL scene later would mean more imperative code rather than JSX. Accepted, because the design deliberately has no second scene: diagrams are SVG and the stack highlighting is CSS.

## Alternatives considered

- **React Three Fiber, as written.** Rejected for the reasons above. Nothing in the hero benefits from a scene graph in JSX.
- **Raw WebGL2, no library.** About 5 KB gzipped, the fastest option on low-end phones. Rejected for now because three.js handles context loss, DPR, projection and colour management for us, and the chunk loads lazily after paint so its size does not affect LCP. Revisit if the measured mobile frame budget is missed after tier stepping.
