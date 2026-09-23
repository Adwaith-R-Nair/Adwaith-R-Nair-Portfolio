# Phase 6: Devices Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the site as good in the hand as it is on a desktop: tap targets a thumb can hit, labels a phone can read, motion that respects the system setting, a keyboard path through everything, and the build spec's performance budget measured on real hardware rather than simulated.

**Architecture:** No new subsystems. Touch targets grow through padding and invisible hit areas in the existing components, so nothing moves visually. A debug readout, shown only with `?hero=debug`, lets Adwaith report tier and frame rate from his own phone, where no developer tools are available.

**Tech Stack:** CSS Modules, inline SVG, Playwright device emulation, Lighthouse.

**Spec:** [docs/build-spec.md](../build-spec.md) section 2 (performance budget, `prefers-reduced-motion`) and section 9 (phase 6), [docs/design.md](../design.md) sections 6 and 8.

## Findings from the emulated audit, 2026-09-21

Measured at 375x667, 412x915 and 744x1133 on `/`, `/work/praman`, `/work/honora`:

- Horizontal overflow: **0 px everywhere**. Nothing to fix.
- Touch targets under 44 px: **78 on the home page**, 4 on each case study. The offenders are the header navigation (`Work` 32x17), every graph node and legend link, `Repository`, `All work`, and the skip link (154x33).
- Text under 13 px: the 10.5 px tracked labels, which are per the build spec's type rules but sit at the edge of readability on a phone.

WCAG 2.2 exempts links inline in a sentence from the minimum target size. The header, the graph nodes, `All work` and the case-study links are not inline, so they are in scope.

## Global Constraints

- Growing a target must not move anything visually: use padding, negative margin, or an invisible SVG hit area.
- Motion rules from the build spec stay: `prefers-reduced-motion` means instant cuts, no drift, no parallax.
- Copy rules apply to anything new on screen.
- Commit messages: `type(scope): summary`, short, no trailer. Adwaith runs git.

## File structure

```
src/components/header/SiteHeader.module.css      padded nav links
src/components/graph/Graph.tsx + .module.css     invisible hit rect per node
src/components/work/CaseStudy.module.css         padded repository and neighbour links
src/components/cases/CaseList.module.css         padded project links
src/styles/tokens.css                            label size floor on small screens
src/hero/debug.ts + mount.ts                     ?hero=debug readout
docs/device-testing.md                           the checklist Adwaith runs on his phone
tests/e2e/mobile.spec.ts                          target sizes, reduced motion, keyboard path
```

---

### Task 1: Touch targets and phone-readable labels

- [x] Header: give nav links and the name a 44 px minimum tap height through padding, with negative margin so the visual position is unchanged.
- [x] Graph: add a transparent `rect` per node, sized to cover the dot and its label, inside the existing `<a>`, so the whole area is tappable. Same for the mobile layout.
- [x] Case list, also-built, neighbours, `All work`, `Repository`, contact links: padding to 44 px minimum height where the link is not inline in a sentence.
- [x] Labels: raise `--text-label` from 10.5 px to 11.5 px under 720 px, keeping the tracking.
- [x] Verify with the emulated audit: zero non-inline targets under 44 px on all three profiles and all pages.
- [x] Commit: `fix(mobile): enlarge touch targets and label text on small screens`

### Task 2: Reduced motion and the keyboard path

- [x] Verify the hero honours reduced motion end to end: weights snap, no drift, no parallax, canvas still fades in.
- [x] Verify the skip link, then tab order: header, hero, thesis, every graph node, case links, stack items, neighbours, contact. Focus must be visible against the ground colour at every stop.
- [x] Fix whatever that pass finds.
- [x] `tests/e2e/mobile.spec.ts`: reduced-motion assertions plus a keyboard walk that asserts the skip link works and that focus is visible on the graph and the stack.
- [x] Commit: `test(a11y): cover reduced motion and the keyboard path`

### Task 3: On-phone debug readout

- [x] `src/hero/debug.ts`: with `?hero=debug`, a small fixed readout in the corner showing tier, points, frames per second and GPU name. Nothing rendered without the parameter; no cost to normal visits.
- [x] `docs/device-testing.md`: the checklist Adwaith runs on his Android phone, on mobile data, with what to report back.
- [x] Commit: `feat(hero): add an on-device debug readout behind ?hero=debug`

### Task 4: Measure the budget and close the phase

- [x] Lighthouse against the live URL, mobile preset, 3 runs, recording LCP, total blocking time and the performance score.
- [x] Adwaith reports from his phone: tier reached, frame rate, whether the portrait resolves, whether anything stutters.
- [x] Record both against the build spec's budget in `docs/design.md` section 8. Where a target is missed, either fix it or write down why it stands.
- [x] Update `docs/plan.md` phase table. Commit: `docs: record phase 6 device results`

Phase 6 is done when: the emulated audit is clean, the keyboard and reduced-motion passes are clean, CI is green, and the budget table carries real measurements from Adwaith's phone.

## Result, 2026-09-23

- Touch targets under 44 px: 78 on the home page before, 0 after, across 375, 412 and 744 px.
- Keyboard stops without a visible focus ring: 29 before, 0 after.
- Reduced motion was already correct; the hero crossfade is now an instant cut too.
- Two bugs surfaced while Adwaith tested on his own devices, both fixed before the phase closed: the readout could not say why the layer had not started, and `failIfMajorPerformanceCaveat` alone could veto a capable GPU.
- Measured on real hardware: laptop (Radeon 680M, 300 Hz panel) tier `high`, 170k points, 60 fps drawn; phone (Adreno 618, dpr 3) tier `balanced`, 95k points, 60 fps while scrolling; cold load under 2 s on mobile data; no stutter; nothing hard to tap or read. Full table in design.md section 8.
