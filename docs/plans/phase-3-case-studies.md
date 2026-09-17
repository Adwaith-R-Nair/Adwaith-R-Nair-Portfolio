# Phase 3: Case Studies Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make each of the four flagship pages read as a real case study: a hand-drawn architecture diagram in the site's own visual grammar, Honora's on-chain proof as a first-class element, neighbour navigation that invites reading the next one, and a print stylesheet.

**Architecture:** Diagrams are data. One renderer turns a typed `DiagramSpec` (regions, nodes, edges, notes) into inline SVG using the design tokens, the mono face, hairline boxes, and the same "label in a gap cut into the line" device the project graph uses. Each flagship has a spec file. Everything is server-rendered; there is no client code in this phase.

**Tech Stack:** React Server Components, inline SVG, CSS Modules, Playwright.

**Spec:** [docs/design.md](../design.md) section 5 (Case study) and section 6, [docs/build-spec.md](../build-spec.md) sections 4 and 6. Diagram content comes only from build-spec.md section 6; no component or connection may appear that the spec does not describe.

## Global Constraints

- Every word in a diagram is server-rendered text inside the SVG, so it is indexable, selectable and prints.
- Diagram vocabulary: hairline rectangles with no fill, mono uppercase labels at 11px with `.14em` tracking, a muted sub-line at 10px, thin arrows with small heads, one dashed region per diagram marking the trust boundary, accent for the key path, gold only for an on-chain element. No fills, no shadows, no rounded corners over 2px, no icons.
- Under 720px the diagram scrolls horizontally inside its own container (design.md section 6 allows this for diagrams); the page body never scrolls sideways.
- Copy rules apply inside diagrams: no em dashes, no hype words.
- Commit messages: `type(scope): summary`, short, no trailer. Adwaith runs git.

## File structure

```
src/components/diagrams/types.ts        DiagramSpec, DNode, DEdge, DRegion, DNote
src/components/diagrams/Diagram.tsx     renderer: spec -> <figure><svg>
src/components/diagrams/Diagram.module.css
src/components/diagrams/praman.ts       spec
src/components/diagrams/honora.ts       spec
src/components/diagrams/aegisai.ts      spec
src/components/diagrams/assetize.ts     spec
src/components/diagrams/index.ts        diagramFor(slug): DiagramSpec | null
src/components/work/Proof.tsx + Proof.module.css   Honora's on-chain proof element
src/components/work/CaseStudy.tsx        diagram slot filled, proof element, neighbours
src/components/work/CaseStudy.module.css
src/styles/print.css                     @media print rules, imported in layout
tests/unit/diagrams.test.ts              specs reference real nodes, stay inside the box, no banned copy
tests/e2e/work.spec.ts                   diagram present and textual, proof element, no overflow
```

---

### Task 1: Diagram types, renderer and the Praman diagram

> Built as written, then revised after the Chrome review: the case-study article now uses the wide column (`--col-wide`) with prose blocks capped at 820px and a `wide` Block modifier for the diagram, otherwise the 900-unit drawing was squeezed into 560px; the three left-hand boxes are 180 wide so their sub-lines fit; the two notes are shortened and right-aligned to the box edge.

**Files:**
- Create: `src/components/diagrams/types.ts`, `Diagram.tsx`, `Diagram.module.css`, `praman.ts`, `index.ts`, `tests/unit/diagrams.test.ts`
- Modify: `src/components/work/CaseStudy.tsx`

**Interfaces:**
- Produces: `DiagramSpec` and friends; `<Diagram spec />`; `diagramFor(slug)`.
- Edges connect node ids. The renderer picks the anchor side automatically from the relative position of the two boxes, or follows `via` waypoints when given. A label sits at the midpoint of the longest segment in a ground-coloured gap.

- [x] **Step 1: Types**

```ts
// src/components/diagrams/types.ts
export type Tone = "ink" | "muted" | "accent" | "gold";

export interface DNode {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  sub?: string;
  tone?: Tone;
  dashed?: boolean;
}

export interface DEdge {
  from: string;
  to: string;
  label?: string;
  tone?: Tone;
  dashed?: boolean;
  /** Optional waypoints between the two anchors, in diagram units. */
  via?: [number, number][];
}

export interface DRegion {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

export interface DNote {
  x: number;
  y: number;
  text: string;
  anchor?: "start" | "middle" | "end";
}

export interface DiagramSpec {
  w: number;
  h: number;
  /** Accessible name and figcaption. One sentence, what the diagram shows. */
  title: string;
  regions?: DRegion[];
  nodes: DNode[];
  edges: DEdge[];
  notes?: DNote[];
}
```

- [x] **Step 2: Failing unit test**

```ts
// tests/unit/diagrams.test.ts
import { describe, expect, it } from "vitest";
import { allStrings } from "@/content";
import { DIAGRAMS } from "@/components/diagrams";

const BANNED = ["\u2014", "revolutionary", "cutting-edge", "seamless", "leverage", "innovative"];

describe("diagram specs", () => {
  for (const [slug, spec] of Object.entries(DIAGRAMS)) {
    describe(slug, () => {
      it("has unique node ids and every edge references real nodes", () => {
        const ids = spec.nodes.map((n) => n.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const e of spec.edges) {
          expect(ids, `${e.from} -> ${e.to}`).toContain(e.from);
          expect(ids, `${e.from} -> ${e.to}`).toContain(e.to);
        }
      });

      it("keeps every node and region inside the box", () => {
        for (const n of [...spec.nodes, ...(spec.regions ?? [])]) {
          expect(n.x).toBeGreaterThanOrEqual(0);
          expect(n.y).toBeGreaterThanOrEqual(0);
          expect(n.x + n.w).toBeLessThanOrEqual(spec.w);
          expect(n.y + n.h).toBeLessThanOrEqual(spec.h);
        }
      });

      it("has no overlapping nodes", () => {
        const ns = spec.nodes;
        for (let i = 0; i < ns.length; i++) {
          for (let j = i + 1; j < ns.length; j++) {
            const a = ns[i]!, b = ns[j]!;
            const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
            expect(overlap, `${a.id} overlaps ${b.id}`).toBe(false);
          }
        }
      });

      it("has a title and no banned copy", () => {
        expect(spec.title.length).toBeGreaterThan(20);
        const hits = allStrings(spec, slug).flatMap(({ path, text }) =>
          BANNED.filter((b) => text.toLowerCase().includes(b)).map((b) => `${path}: ${b}`),
        );
        expect(hits).toEqual([]);
      });
    });
  }
});
```

Run: `pnpm test tests/unit/diagrams.test.ts`
Expected: FAIL, cannot resolve `@/components/diagrams`.

- [x] **Step 3: Renderer**

```tsx
// src/components/diagrams/Diagram.tsx
import type { DEdge, DNode, DiagramSpec, Tone } from "./types";
import styles from "./Diagram.module.css";

const LABEL_PX = 6.6; // approximate advance of the mono face at 11px
const toneClass: Record<Tone, string> = {
  ink: styles.ink ?? "",
  muted: styles.muted ?? "",
  accent: styles.accent ?? "",
  gold: styles.gold ?? "",
};

type Pt = [number, number];

/** Anchor on the side of `a` that faces `b`. */
function anchor(a: DNode, toward: Pt): Pt {
  const cx = a.x + a.w / 2, cy = a.y + a.h / 2;
  const dx = toward[0] - cx, dy = toward[1] - cy;
  if (Math.abs(dx) * a.h > Math.abs(dy) * a.w) return [dx > 0 ? a.x + a.w : a.x, cy];
  return [cx, dy > 0 ? a.y + a.h : a.y];
}

function points(edge: DEdge, byId: Map<string, DNode>): Pt[] {
  const a = byId.get(edge.from)!, b = byId.get(edge.to)!;
  const via = edge.via ?? [];
  const bc: Pt = [b.x + b.w / 2, b.y + b.h / 2];
  const ac: Pt = [a.x + a.w / 2, a.y + a.h / 2];
  const start = anchor(a, via[0] ?? bc);
  const end = anchor(b, via[via.length - 1] ?? ac);
  return [start, ...via, end];
}

function longestSegmentMid(pts: Pt[]): Pt {
  let best: Pt = pts[0]!, len = -1;
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1]!, q = pts[i]!;
    const l = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (l > len) { len = l; best = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; }
  }
  return best;
}

export function Diagram({ spec, id }: { spec: DiagramSpec; id: string }) {
  const byId = new Map(spec.nodes.map((n) => [n.id, n]));
  const titleId = `${id}-title`;
  return (
    <figure className={styles.figure} data-diagram={id}>
      <div className={styles.scroll}>
        <svg
          className={styles.svg}
          viewBox={`0 0 ${spec.w} ${spec.h}`}
          role="img"
          aria-labelledby={titleId}
          style={{ minWidth: `${Math.round(spec.w * 0.72)}px` }}
        >
          <title id={titleId}>{spec.title}</title>
          <defs>
            <marker id={`${id}-arrow`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0.5 L7,4 L0,7.5" className={styles.arrowHead} />
            </marker>
          </defs>

          {spec.regions?.map((r) => (
            <g key={r.label} className={styles.region}>
              <rect x={r.x} y={r.y} width={r.w} height={r.h} />
              <text x={r.x + 12} y={r.y - 8}>{r.label}</text>
            </g>
          ))}

          {spec.edges.map((e, i) => {
            const pts = points(e, byId);
            const d = pts.map((p, k) => `${k ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
            const mid = longestSegmentMid(pts);
            const lw = e.label ? e.label.length * LABEL_PX + 16 : 0;
            return (
              <g key={i} className={`${styles.edge} ${toneClass[e.tone ?? "muted"]} ${e.dashed ? styles.dashed : ""}`}>
                <path d={d} markerEnd={`url(#${id}-arrow)`} />
                {e.label ? (
                  <>
                    <rect x={mid[0] - lw / 2} y={mid[1] - 9} width={lw} height={18} className={styles.gap} />
                    <text x={mid[0]} y={mid[1]} dy={4} textAnchor="middle">{e.label}</text>
                  </>
                ) : null}
              </g>
            );
          })}

          {spec.nodes.map((n) => (
            <g key={n.id} className={`${styles.node} ${toneClass[n.tone ?? "ink"]} ${n.dashed ? styles.dashed : ""}`}>
              <rect x={n.x} y={n.y} width={n.w} height={n.h} />
              <text x={n.x + n.w / 2} y={n.y + n.h / 2} dy={n.sub ? -3 : 4} textAnchor="middle" className={styles.label}>
                {n.label}
              </text>
              {n.sub ? (
                <text x={n.x + n.w / 2} y={n.y + n.h / 2} dy={13} textAnchor="middle" className={styles.sub}>
                  {n.sub}
                </text>
              ) : null}
            </g>
          ))}

          {spec.notes?.map((t, i) => (
            <text key={i} x={t.x} y={t.y} textAnchor={t.anchor ?? "start"} className={styles.note}>
              {t.text}
            </text>
          ))}
        </svg>
      </div>
      <figcaption className={styles.caption}>{spec.title}</figcaption>
    </figure>
  );
}
```

```css
/* src/components/diagrams/Diagram.module.css */
.figure {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
  margin: 0;
}

.scroll {
  overflow-x: auto;
  overscroll-behavior-x: contain;
  padding-block: var(--s-1);
}

.svg {
  width: 100%;
  height: auto;
  font-family: var(--font-mono);
  overflow: visible;
}

.caption {
  font-size: var(--text-small);
  color: var(--muted);
  max-width: var(--measure);
}

.ink { --tone: var(--ink); }
.muted { --tone: var(--muted); }
.accent { --tone: var(--accent); }
.gold { --tone: var(--gold); }

.node rect {
  fill: none;
  stroke: var(--tone);
  stroke-width: 1;
}

.node.muted rect { stroke: var(--hairline); }

.node .label {
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  fill: var(--tone);
}

.node.muted .label { fill: var(--muted); }

.node .sub {
  font-size: 10px;
  letter-spacing: 0.02em;
  fill: var(--muted);
}

.edge path {
  fill: none;
  stroke: var(--tone);
  stroke-width: 1;
}

.edge.muted path { stroke: var(--hairline); }

.edge text {
  font-size: 10px;
  letter-spacing: 0.04em;
  fill: var(--muted);
}

.edge.accent text { fill: var(--accent); }
.edge.gold text { fill: var(--gold); }

.gap { fill: var(--ground); }

.arrowHead {
  fill: none;
  stroke: context-stroke;
  stroke-width: 1;
}

.dashed rect,
.dashed path { stroke-dasharray: 3 4; }

.region rect {
  fill: none;
  stroke: var(--accent);
  stroke-width: 1;
  stroke-dasharray: 2 5;
  opacity: 0.7;
}

.region text {
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  fill: var(--accent);
}

.note {
  font-size: 10px;
  letter-spacing: 0.02em;
  fill: var(--muted);
}
```

`context-stroke` for the arrowhead is supported in Chrome 116+, Firefox and Safari 17; the fallback is a filled dark head, acceptable.

- [x] **Step 4: Praman spec**

Content from build-spec.md section 6, Praman. Diagram units 900 by 440.

```ts
// src/components/diagrams/praman.ts
import type { DiagramSpec } from "./types";

export const praman: DiagramSpec = {
  w: 900,
  h: 440,
  title:
    "Praman: a purchase intent with no price field is checked by a deterministic policy engine against a human-signed mandate, recorded in an append-only ledger, and executed in two phases. No model sits inside the authorization path.",
  regions: [{ x: 300, y: 40, w: 580, h: 380, label: "Authorization path, no LLM" }],
  nodes: [
    { id: "agent", x: 20, y: 60, w: 150, h: 56, label: "Agent", sub: "any model", tone: "muted" },
    { id: "intent", x: 20, y: 200, w: 150, h: 64, label: "Intent", sub: "SKU and quantity, no price" },
    { id: "merchant", x: 20, y: 340, w: 150, h: 56, label: "Merchant page", sub: "untrusted", tone: "muted", dashed: true },
    { id: "catalog", x: 340, y: 60, w: 170, h: 56, label: "Catalog", sub: "price resolves here" },
    { id: "policy", x: 340, y: 190, w: 170, h: 84, label: "Policy engine", sub: "pure, 19 reason codes", tone: "accent" },
    { id: "mandate", x: 340, y: 330, w: 170, h: 64, label: "Mandate", sub: "Ed25519, human-signed" },
    { id: "ledger", x: 620, y: 60, w: 230, h: 76, label: "Ledger", sub: "append-only, hash-chained, Merkle" },
    { id: "executor", x: 620, y: 200, w: 230, h: 76, label: "Two-phase executor", sub: "reserve, call, settle, advisory lock" },
    { id: "rail", x: 620, y: 340, w: 230, h: 56, label: "Razorpay", sub: "test mode", tone: "muted" },
  ],
  edges: [
    { from: "agent", to: "intent", label: "proposes" },
    { from: "merchant", to: "intent", label: "cannot set price", dashed: true },
    { from: "intent", to: "policy", label: "validate", tone: "accent" },
    { from: "catalog", to: "policy" },
    { from: "mandate", to: "policy", label: "caps, allowlists, velocity" },
    { from: "policy", to: "ledger", label: "outcome" },
    { from: "policy", to: "executor", label: "permit", tone: "accent" },
    { from: "executor", to: "ledger", label: "reserve then settle" },
    { from: "executor", to: "rail" },
  ],
  notes: [
    { x: 620, y: 156, text: "spend is replayed from the ledger, never stored" },
    { x: 620, y: 298, text: "a DB transaction and a payment call cannot be atomic" },
  ],
};
```

- [x] **Step 5: Index and slot**

```ts
// src/components/diagrams/index.ts
import type { Slug } from "@/content";
import { praman } from "./praman";
import type { DiagramSpec } from "./types";

export const DIAGRAMS: Partial<Record<Slug, DiagramSpec>> = { praman };

export const diagramFor = (slug: Slug): DiagramSpec | null => DIAGRAMS[slug] ?? null;
export { Diagram } from "./Diagram";
export type { DiagramSpec } from "./types";
```

In `src/components/work/CaseStudy.tsx`, replace the slot comment with:

```tsx
{diagram ? (
  <Block id="diagram" title="Architecture, drawn">
    <Diagram spec={diagram} id={`diagram-${p.slug}`} />
  </Block>
) : null}
```

with `const diagram = diagramFor(p.slug);` near the top and the imports `import { Diagram, diagramFor } from "@/components/diagrams";`. Place it before the Problem block.

- [x] **Step 6: Verify**

Run: `pnpm test && pnpm typecheck && pnpm lint`. Expected: diagram tests pass for praman.
Chrome, `/work/praman` at 1440px and 500px: the diagram reads left to right, labels sit in gaps, the dashed region encloses catalog, policy, mandate, ledger, executor and rail, the accent path runs intent to policy to executor. At 500px the figure scrolls sideways inside its container and the page does not.

- [x] **Step 7: Commit**

```bash
git add src/components/diagrams src/components/work/CaseStudy.tsx tests/unit/diagrams.test.ts
git commit -m "feat(work): add diagram renderer and the praman architecture diagram"
git push
```

---

### Task 2: Honora diagram and the on-chain proof element

**Files:**
- Create: `src/components/diagrams/honora.ts`, `src/components/work/Proof.tsx`, `Proof.module.css`
- Modify: `src/components/diagrams/index.ts`, `src/components/work/CaseStudy.tsx`, `CaseStudy.module.css`

- [ ] **Step 1: Honora spec**

```ts
// src/components/diagrams/honora.ts
import type { DiagramSpec } from "./types";

export const honora: DiagramSpec = {
  w: 900,
  h: 440,
  title:
    "Honora: every request passes an Express gate for a cheap 403 and then the contract's own role check, which is the authority. Evidence hashes and custody transfers live on Ethereum Sepolia; files go to IPFS and metadata to MongoDB; AI indexing never blocks an evidence operation.",
  regions: [{ x: 540, y: 40, w: 340, h: 200, label: "Source of truth" }],
  nodes: [
    { id: "client", x: 20, y: 120, w: 160, h: 76, label: "Client", sub: "Police, Forensic, Lawyer, Judge" },
    { id: "api", x: 280, y: 100, w: 190, h: 116, label: "Express API", sub: "JWT HS256, bcrypt 12 rounds" },
    { id: "gate1", x: 280, y: 250, w: 190, h: 56, label: "Middleware RBAC", sub: "cheap 403 at the edge", tone: "accent" },
    { id: "contract", x: 580, y: 80, w: 260, h: 100, label: "EvidenceRegistry.sol", sub: "Sepolia, verified, Solidity 0.8.24", tone: "gold" },
    { id: "gate2", x: 580, y: 250, w: 260, h: 56, label: "Modifier RBAC", sub: "authoritative gate, on-chain", tone: "accent" },
    { id: "ipfs", x: 280, y: 350, w: 190, h: 56, label: "IPFS via Pinata", sub: "evidence files" },
    { id: "mongo", x: 580, y: 350, w: 120, h: 56, label: "MongoDB", sub: "metadata only", tone: "muted" },
    { id: "ai", x: 720, y: 350, w: 120, h: 56, label: "AI indexing", sub: "fire-and-forget", tone: "muted", dashed: true },
  ],
  edges: [
    { from: "client", to: "api", label: "SHA-256 of evidence" },
    { from: "api", to: "gate1" },
    { from: "gate1", to: "gate2", label: "signer wallet per role, fails closed", tone: "accent" },
    { from: "gate2", to: "contract", tone: "gold", label: "append-only custody chain" },
    { from: "api", to: "ipfs", label: "file" },
    { from: "api", to: "mongo", label: "off-chain metadata", via: [[520, 158], [520, 378]] },
    { from: "api", to: "ai", dashed: true, via: [[500, 130], [500, 320], [780, 320]] },
  ],
  notes: [
    { x: 580, y: 206, text: "duplicate hashes rejected globally, every action emits an event" },
    { x: 20, y: 236, text: "an application-layer bypass still cannot act on-chain", anchor: "start" },
  ],
};
```

Add `honora` to `DIAGRAMS` in `index.ts`.

- [ ] **Step 2: Proof element**

Set large, in gold, above the fold. It is the one place gold appears at size on the site.

```tsx
// src/components/work/Proof.tsx
import styles from "./Proof.module.css";

interface Props {
  network: string;
  address: string;
  explorer: string;
  contract: string;
}

/** The on-chain proof, set as a first-class element. Verified means anyone can check it, not just us. */
export function Proof({ network, address, explorer, contract }: Props) {
  const head = address.slice(0, 22);
  const tail = address.slice(22);
  return (
    <a className={styles.proof} href={explorer} rel="noopener">
      <span className={styles.k}>Deployed and source-verified on {network}</span>
      <span className={`${styles.address} tnum`} aria-label={address}>
        <span>{head}</span>
        <span>{tail}</span>
      </span>
      <span className={styles.foot}>
        <span>{contract}</span>
        <span>Open on Etherscan</span>
      </span>
    </a>
  );
}
```

```css
/* src/components/work/Proof.module.css */
.proof {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
  padding: var(--s-4);
  border: 1px solid var(--gold);
  color: var(--ink);
  text-decoration: none;
  transition: background 0.2s ease;
}

.proof:hover {
  background: var(--ground-2);
}

.k {
  font-size: var(--text-label);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--gold);
}

.address {
  display: flex;
  flex-wrap: wrap;
  column-gap: 0.3em;
  font-family: var(--font-mono);
  font-size: clamp(16px, 2.2vw, 26px);
  line-height: 1.3;
  color: var(--ink);
  word-break: break-all;
}

.foot {
  display: flex;
  justify-content: space-between;
  gap: var(--s-3);
  font-size: var(--text-small);
  color: var(--muted);
}

.foot span:last-child {
  color: var(--gold);
}
```

In `CaseStudy.tsx`, replace the `p.onchain` paragraph in the header with nothing, and after the header add:

```tsx
{p.onchain ? (
  <Proof network={p.onchain.network} address={p.onchain.address} explorer={p.onchain.explorer} contract="EvidenceRegistry.sol, Solidity 0.8.24" />
) : null}
```

Remove the `.onchain` rules from `CaseStudy.module.css`.

- [ ] **Step 3: Verify and commit**

Run: `pnpm test && pnpm typecheck && pnpm lint`. Chrome `/work/honora` at 1440px and 500px: the gold proof block sits under the header, the address wraps in two halves on narrow screens without overflow, the diagram's contract box is gold and inside the "Source of truth" region.

```bash
git add src/components/diagrams/honora.ts src/components/diagrams/index.ts src/components/work
git commit -m "feat(work): add the honora diagram and the on-chain proof element"
git push
```

---

### Task 3: AegisAI and Assetize diagrams

**Files:**
- Create: `src/components/diagrams/aegisai.ts`, `src/components/diagrams/assetize.ts`
- Modify: `src/components/diagrams/index.ts`

- [ ] **Step 1: AegisAI spec**

```ts
// src/components/diagrams/aegisai.ts
import type { DiagramSpec } from "./types";

export const aegisai: DiagramSpec = {
  w: 900,
  h: 440,
  title:
    "AegisAI: every request runs through a priority-ordered rule set, refusal conditions first, and leaves as one of three verdicts. Policy confidence is computed from source authority, freshness and agreement, and low confidence pushes toward escalation.",
  regions: [{ x: 250, y: 40, w: 400, h: 380, label: "Decision layer, what I owned" }],
  nodes: [
    { id: "req", x: 20, y: 190, w: 150, h: 64, label: "Request", sub: "from any of 5 agents" },
    { id: "r1", x: 290, y: 60, w: 320, h: 48, label: "1. Immediate refusal", sub: "checked first", tone: "accent" },
    { id: "r2", x: 290, y: 132, w: 320, h: 48, label: "2. Informational", sub: "answer directly" },
    { id: "r3", x: 290, y: 204, w: 320, h: 48, label: "3. Safe autonomous", sub: "act without sign-off" },
    { id: "r4", x: 290, y: 276, w: 320, h: 48, label: "4. Everything else", sub: "escalate to a human" },
    { id: "conf", x: 290, y: 350, w: 320, h: 56, label: "Policy confidence", sub: "0.4 authority + 0.3 freshness + 0.3 agreement" },
    { id: "refuse", x: 720, y: 60, w: 150, h: 48, label: "REFUSE", tone: "accent" },
    { id: "respond", x: 720, y: 168, w: 150, h: 48, label: "RESPOND" },
    { id: "escalate", x: 720, y: 276, w: 150, h: 48, label: "ESCALATE" },
  ],
  edges: [
    { from: "req", to: "r1", via: [[230, 222], [230, 84]] },
    { from: "r1", to: "r2", label: "no" },
    { from: "r2", to: "r3", label: "no" },
    { from: "r3", to: "r4", label: "no" },
    { from: "r1", to: "refuse", tone: "accent" },
    { from: "r2", to: "respond" },
    { from: "r3", to: "respond" },
    { from: "r4", to: "escalate" },
    { from: "conf", to: "escalate", label: "low confidence", dashed: true, via: [[680, 378], [680, 300]] },
  ],
  notes: [
    { x: 20, y: 300, text: "4 governed tools, 3 verified demo scenarios" },
    { x: 20, y: 316, text: "hackathon prototype, not production" },
  ],
};
```

- [ ] **Step 2: Assetize spec**

```ts
// src/components/diagrams/assetize.ts
import type { DiagramSpec } from "./types";

export const assetize: DiagramSpec = {
  w: 900,
  h: 440,
  title:
    "Assetize: strict layering, API to service to repository, so that moving from the demo's pooled Polygon Amoy hashes to real contracts touches only the repository layer. Money is BigInt paise at every layer.",
  regions: [{ x: 40, y: 250, w: 520, h: 150, label: "Phase 2 touches only this layer" }],
  nodes: [
    { id: "ui", x: 40, y: 40, w: 220, h: 56, label: "Next.js 16 UI", sub: "investor demo, seeded data", tone: "muted" },
    { id: "api", x: 40, y: 130, w: 220, h: 56, label: "API routes", sub: "about 24, Zod at the edge" },
    { id: "svc", x: 340, y: 130, w: 220, h: 56, label: "Services", sub: "6, distribution math in paise" },
    { id: "repo", x: 80, y: 290, w: 220, h: 76, label: "Repositories", sub: "7 interfaces, 7 implementations" },
    { id: "db", x: 340, y: 290, w: 200, h: 76, label: "Supabase Postgres", sub: "Prisma 7, 16 models" },
    { id: "pool", x: 640, y: 130, w: 220, h: 76, label: "Hash pool", sub: "50 real tx pre-submitted, 20 unused", tone: "accent" },
    { id: "chain", x: 640, y: 290, w: 220, h: 76, label: "Polygon Amoy", sub: "ethers.js, explorable hashes", tone: "gold" },
  ],
  edges: [
    { from: "ui", to: "api" },
    { from: "api", to: "svc", label: "typed input" },
    { from: "svc", to: "repo", label: "interfaces only", tone: "accent", via: [[450, 230], [190, 230]] },
    { from: "repo", to: "db" },
    { from: "svc", to: "pool", label: "draw a hash instantly" },
    { from: "pool", to: "chain", label: "pre-submitted", tone: "gold" },
  ],
  notes: [
    { x: 640, y: 240, text: "real and explorable, but not produced by the action shown" },
    { x: 40, y: 420, text: "self-audit caught 3 boundary violations before merge" },
  ],
};
```

Add both to `DIAGRAMS` in `index.ts`.

- [ ] **Step 3: Verify and commit**

Run: `pnpm test && pnpm typecheck && pnpm lint`. Chrome `/work/aegisai` and `/work/assetize` at 1440px: the rule ladder reads top to bottom with "no" between rungs and the verdicts on the right; the Assetize layering reads top to bottom with the dashed region around the repositories and the gold chain box.

```bash
git add src/components/diagrams
git commit -m "feat(work): add the aegisai and assetize architecture diagrams"
git push
```

---

### Task 4: Neighbour navigation, print stylesheet, tests, docs

**Files:**
- Create: `src/styles/print.css`, `tests/e2e/work.spec.ts`
- Modify: `src/components/work/CaseStudy.tsx`, `CaseStudy.module.css`, `src/app/layout.tsx`, `docs/plan.md`, `docs/design.md`

- [ ] **Step 1: Neighbours**

Replace the `<nav className={styles.neighbours}>` block in `CaseStudy.tsx`:

```tsx
<nav className={styles.neighbours} aria-label="Other case studies">
  <Link href={`/work/${prev.slug}`} className={styles.neighbour}>
    <span className={styles.nk}>Previous</span>
    <span className={styles.nn}>{prev.name}</span>
    <span className={styles.nt}>{prev.tagline}</span>
  </Link>
  <Link href="/#cases" className={styles.all}>All work</Link>
  <Link href={`/work/${next.slug}`} className={`${styles.neighbour} ${styles.right}`}>
    <span className={styles.nk}>Next</span>
    <span className={styles.nn}>{next.name}</span>
    <span className={styles.nt}>{next.tagline}</span>
  </Link>
</nav>
```

Replace the `.neighbours` rules in `CaseStudy.module.css`:

```css
.neighbours {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: var(--s-4);
  align-items: start;
  border-top: 1px solid var(--hairline);
  padding-top: var(--s-4);
}

.neighbour {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-decoration: none;
}

.right {
  text-align: right;
  align-items: flex-end;
}

.nk {
  font-size: var(--text-label);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--muted);
}

.nn {
  font-family: var(--font-display);
  font-size: var(--display-3);
  color: var(--ink);
}

.neighbour:hover .nn { color: var(--accent); }

.nt {
  font-size: var(--text-small);
  color: var(--muted);
}

.all {
  align-self: center;
  font-size: var(--text-label);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--muted);
  text-decoration: none;
}

.all:hover { color: var(--ink); }

@media (max-width: 720px) {
  .neighbours { grid-template-columns: 1fr; }
  .right { text-align: left; align-items: flex-start; }
  .all { justify-self: start; }
}
```

- [ ] **Step 2: Print stylesheet**

```css
/* src/styles/print.css */
@media print {
  :root {
    --ground: #fff;
    --ground-2: #f4f2f6;
    --ink: #111;
    --muted: #555;
    --accent: #7a4f3a;
    --gold: #8a6d12;
    --hairline: rgba(0, 0, 0, 0.25);
  }

  html,
  body { background: #fff; color: #111; }

  #hero-stage,
  .skip-link,
  nav[aria-label="Sections"] { display: none !important; }

  a { color: inherit; text-decoration: none; }

  a[href^="http"]::after {
    content: " (" attr(href) ")";
    font-size: 9px;
    color: #555;
  }

  section,
  figure { break-inside: avoid; }
}
```

Import it in `src/app/layout.tsx` after globals: `import "@/styles/print.css";`.

- [ ] **Step 3: E2E**

```ts
// tests/e2e/work.spec.ts
import { expect, test } from "@playwright/test";

const FLAGSHIPS = ["praman", "honora", "aegisai", "assetize"];

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

test("neighbour navigation cycles through the four flagships", async ({ page }) => {
  await page.goto("/work/praman");
  await page.getByRole("link", { name: /Next/ }).click();
  await expect(page).toHaveURL(/\/work\/honora$/);
  await page.getByRole("link", { name: /Previous/ }).click();
  await expect(page).toHaveURL(/\/work\/praman$/);
});

test("case studies never scroll sideways, diagram included", async ({ page }) => {
  for (const slug of FLAGSHIPS) {
    await page.goto(`/work/${slug}`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, slug).toBeLessThanOrEqual(0);
  }
});
```

- [ ] **Step 4: Verify, docs, commit**

Run: `pnpm build && pnpm test:e2e`. Expected: all pass on both projects. Chrome: print preview of `/work/honora` renders white with black text and no canvas.

Update `docs/design.md` "Case study" subsection to mention the diagram renderer and data specs, and `docs/plan.md` phase table row 3 as done with the test counts.

```bash
git add src/components/work src/styles/print.css src/app/layout.tsx tests/e2e/work.spec.ts docs/plan.md docs/design.md docs/plans/phase-3-case-studies.md
git commit -m "feat(work): neighbour navigation, print stylesheet and case-study e2e; phase 3 complete"
git push
```

Phase 3 is done when: unit and e2e suites pass, CI is green, and all four case-study pages have been reviewed in Chrome at 1440px and 500px.
