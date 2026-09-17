# Portfolio Build Specification

**Adwaith R Nair** · adwaith-r-nair.com (or chosen domain)
Handoff document. Everything needed to build the site without re-deriving any decision.

> **How to use this:** paste this whole file as the first message of a fresh Claude Code session.
> Then say: *"Build phase 1."* Do not re-open the design questions; they are settled below.
> Assets referenced here ship alongside this file.

---

## 1. The thesis

Everything on this site serves one sentence:

> ### I build systems that have to be trusted.

Four projects independently answer the same question, *how do you prove a machine did the right thing?*

| Project | The trust problem it solves |
|---|---|
| **Praman** | Governs autonomous agents spending real money |
| **Honora** | Proves legal evidence was never altered |
| **AegisAI** | Decides when an AI may act alone and when a human must sign off |
| **Assetize** | Makes property ownership records independently verifiable |

This is not a slogan bolted on afterwards. It is the site's information architecture: the project
graph's edges are the concerns these systems genuinely share, and the copy never claims a
connection that isn't real in the code.

**Audience, in priority order:** AI/agentic engineering recruiters, blockchain and backend
recruiters, campus placement panels, founders. All four must be able to scan it in 90 seconds.

---

## 2. Non-negotiables

These override any aesthetic preference. If a design choice conflicts with one of these, the
design choice loses.

1. **Content is server-rendered HTML.** Every word, every project write-up, every link exists in
   the initial HTML payload. WebGL mounts *on top* as an enhancement after hydration. If the GPU
   is hopeless, WebGL throws, or JS fails entirely, the portfolio is still complete, readable,
   fast and indexable. This is the single most important rule in this document.
2. **No layout shift and no jank.** Visible lag reads as incompetence on an engineer's portfolio,
   which is worse than having no animation at all.
3. **Measure the device, never guess it.** Quality tiers are selected by measured frame time, not
   by user-agent sniffing or screen width.
4. **Never distort the face.** The cursor may light the portrait, parallax it, or reveal it. It
   may never deform it. Deformation effects belong on abstract fields, type and the graph.
5. **`prefers-reduced-motion` is honoured everywhere.** Morphs become instant cuts, drift stops,
   parallax stops.
6. **Every claim on the site is defensible in an interview.** Attribution rules in §6 are binding.

### Performance budget

| Metric | Target |
|---|---|
| LCP, mid-tier Android on 4G | < 2.0 s |
| Frame rate, desktop | 60 fps sustained |
| Frame rate, mobile | 45 fps sustained, or auto-downgrade |
| JS before WebGL loads | < 90 KB gzipped |
| WebGL bundle | lazy, after first paint, never blocking |
| Total hero image assets | < 120 KB |
| Lighthouse performance | 90+ mobile |

---

## 3. Design system

Derived from Adwaith's own photograph. Sampled, not invented: the ground is the kurta's shadow,
the accent is his skin tone, the highlight is the gold thread in the fabric.

### Colour

```css
--ground:    #0A0810;  /* near-black, violet bias */
--ground-2:  #14101B;  /* raised surfaces */
--ink:       #EDE7F0;  /* warm off-white */
--muted:     #8E8EA9;  /* secondary text, hairlines */
--accent:    #D3B2A0;  /* warm sand, from skin tone */
--gold:      #C9A227;  /* from the kurta's flecks, use sparingly */
--hairline:  rgba(142,142,169,.22);
```

Semantic colour for status chips (live / testnet / prototype) is separate from the accent and
must not reuse it.

**Single dark theme, deliberately.** This is a lit room with one subject in it. Do not build a
light mode. Paint `body` background explicitly from `--ground`.

### Type

| Role | Face | Notes |
|---|---|---|
| Display | **Instrument Serif** (400, 400 italic) | Headlines, project names. Italic for emphasis, in `--accent`. |
| Utility / body | **IBM Plex Mono** (400, 500) | All body copy, labels, data. Technical register, matches the subject. |

Google Fonts, `display=swap`, with real fallback stacks (`Georgia, serif` and
`ui-monospace, SFMono-Regular, Menlo, monospace`).

Rules: body text near 65 characters wide. `text-wrap: balance` on all headings. Uppercase labels
get `letter-spacing: .2em` and sit at 10–11px. `font-variant-numeric: tabular-nums` on any
column of figures.

### Layout

Full-bleed fixed canvas behind a scrolling content column. Content column is
`min(760px, 86vw)` for prose, widening to `min(1180px, 92vw)` for case studies and the graph.
Space with flex/grid `gap`, never per-element margins.

---

## 4. Site structure

| # | Section | Content | WebGL |
|---|---|---|---|
| 0 | **Hero** | Particle portrait, name, thesis line | Portrait state |
| 1 | **Thesis** | One paragraph: four systems, one question | Particles disperse, name forms |
| 2 | **The graph** | Six project nodes, edges = shared concerns, clickable | Constellation state |
| 3 | **Case studies** ×4 | Praman, Honora, AegisAI, Assetize. Problem → architecture → what I owned → proof | Per-project diagram, no particles |
| 4 | **Also built** | Nexus, Zyra, micro-sites | None. Static grid. Deliberate quiet stretch. |
| 5 | **Open source** | GSoC 2024, one line | None |
| 6 | **Stack** | Built with / Worked with / Exploring. Hover a technology, its projects highlight | Subtle graph tie-in |
| 7 | **How I build** | The AI-agent method, stated confidently | None |
| 8 | **Contact** | Links, email, résumé download | Particles collapse to a line |

**Section 4 deliberately drops the 3D.** A page that is intense for eight straight sections is
exhausting. The quiet stretch is what makes the constellation land when it returns.

---

## 5. The hero mechanic

Working reference implementation ships with this spec as `hero.html`. Port it to React Three
Fiber; the algorithm carries over unchanged.

**One particle system, three states, driven by scroll.** The points never disappear and are never
cross-faded. They are the same points rearranging, which is the whole idea: everything on the
page is made of the photograph.

### Importance sampling (the part that makes it read as a face)

Uniform sampling spends points in proportion to **area**, so a flat cheek gets as many points as
an eye and the portrait turns to mush. Instead:

1. Compute per-pixel luminance; mark transparent pixels as excluded.
2. Compute gradient magnitude per pixel (4-neighbour difference is sufficient).
3. Weight `= (0.22 + 0.78 * normalisedGradient) * verticalPrior`, where the prior tapers from
   1.0 at the top of frame to 0.55 at the bottom, keeping the face ahead of the shoulders.
4. Build a prefix sum, then binary-search it per particle.

Also: **crop tight.** Head and shoulders, not the full torso. The same budget resolves far more
facial detail. Asset `hero-crop.webp` is already cropped correctly.

### Quality tiers

Allocate once at the guessed tier, then **measure and step down**. Never rebuild geometry:
`setDrawRange` and `setPixelRatio` are both free.

| Tier | Points | Max DPR |
|---|---|---|
| high | 170,000 | 2.00 |
| balanced | 95,000 | 1.60 |
| light | 46,000 | 1.25 |
| minimal | 20,000 | 1.00 |

Initial guess from `deviceMemory`, `hardwareConcurrency`, `pointer: fine`, viewport size. Then
after a 40-frame warm-up (shader compilation), take the median of 50 frame times every 50 frames.
Median above 21 ms means step down. Stop when it holds.

Point size scales as `700 / sqrt(activeCount)`, so fewer points render larger and coverage stays
consistent across tiers.

### Interaction rules

| State | Cursor does |
|---|---|
| Portrait | Carries a soft light across the face (`glow` term brightens colour and slightly grows point size). Whole cloud parallaxes up to ~4°. **No displacement.** |
| Name / graph | Full repulsion. `force = 1 - w0`, so displacement fades in exactly as the face dissolves. |

### Other required behaviour

- Render loop stops on `document.hidden`.
- Scroll handler is rAF-throttled; never read layout inside a scroll event.
- Depth comes from luminance (±0.22 units) for subtle parallax.
- Points: `depthTest: false`, `depthWrite: false`, transparent, soft circular mask with a tight
  falloff (`smoothstep(0.25, 0.13, r)`). Soft blobby falloff destroys facial detail.

---

## 6. Project content

Attribution lines are **binding**. Do not widen any of them.

### Praman · agentic commerce control plane
- **Repo:** github.com/Adwaith-R-Nair/Praman · Razorpay AI Buildathon 2026, Track 01
- **Role:** solo. Built 27 Aug to 5 Sep 2026, submitted 5 Sep.
- **Scale:** 142 single-purpose commits, ~8,800 lines TypeScript, 9 packages + 4 apps, 20 test files, 24-entry decision log.
- **Core idea:** the model is irrelevant to authorization. A purchase intent carries only SKU and quantity and *has no price field*, so a compromised merchant page cannot influence the amount charged. Price resolves server-side from a trusted catalog after validation against a human-signed mandate.
- **Three primitives:** Ed25519 human-signed mandate (merchant and category allowlists, per-transaction and cumulative caps, velocity and denial-rate limits); a pure deterministic policy engine with 19 closed reason codes and no LLM anywhere in the authorization path; an append-only hash-chained, Merkle-checkpointed ledger whose immutability is enforced by a Postgres trigger, with spend derived by replaying the ledger rather than stored as a mutable balance.
- **Two-phase execution** under a per-mandate advisory lock, because a DB transaction and an external payment call cannot be made atomic.
- **Measured, not asserted:** 100% policy containment on dev and held-out splits, 0% false refusals on 12 benign cases. Injection ablation over 21 runs per arm: 0 proposals influenced defended, 2 undefended, money moved in **0 cases either way**.
- **Three bugs worth telling:** Razorpay does not enforce receipt uniqueness despite documenting it; the policy engine leaked mandate limits through refusal messages; malformed data read as "permitted" because every NaN comparison is false.
- **Honest limits (publish these):** TRUNCATE bypasses the append-only triggers; Merkle checkpoints are not externally anchored; the denial-rate cap is per-window so slow probing remains possible; test mode only, no HTTP API layer.

### Honora · blockchain evidence management
- **Repo:** github.com/Adwaith-R-Nair/Honora · 4-person university project
- **Role:** **blockchain, backend and testing only.** Diya owned the AI layer, Abhijith A frontend and testing, Meghna cross-case linkage and frontend. Do not claim the AI layer.
- **Proof:** deployed and verified on Ethereum Sepolia at `0xf4e1c0179acC2A54C195e8687621ee070be06B3C`. Link to Etherscan as a first-class element, not a footnote.
- **Contract:** `EvidenceRegistry.sol`, Solidity 0.8.24, Hardhat v3, ethers.js v6. On-chain role enum (None/Police/Forensic/Lawyer/Judge), gas-efficient custom-error reverts, append-only custody chain, global duplicate-hash prevention, full event emission.
- **Signature decisions:** dual-layer RBAC (Express middleware for a cheap 403, Solidity modifiers as the authoritative gate, so an application-layer bypass still cannot act on-chain); role-specific signer wallets that fail closed when unconfigured; fire-and-forget AI indexing so evidence operations never depend on a non-critical service.
- **Backend:** Node 22, Express, TypeScript ESM, JWT HS256, bcrypt 12 rounds, MongoDB Atlas for off-chain metadata only, IPFS via Pinata, SHA-256 integrity pipeline. On-chain data is always the source of truth.
- **Honest scope:** university-caliber proof of concept, not a production deployment. No multi-sig on role assignment, no CI/CD yet.

### AegisAI · governance layer for agentic AI
- **Repo:** github.com/Adwaith-R-Nair/AegisAI-WatsonX · IBM Agentic AI Dev Day, 4-person team
- **Role:** **watsonx.ai prompt design and reasoning logic only.** Milan did orchestration, Mahathi tools and backend, Meenakshi frontend and docs. Scope all first-person claims to the reasoning and decision layer.
- **What he designed:** the RESPOND / ESCALATE / REFUSE decision logic; three Prompt Lab templates validated before operationalisation; the computed policy-confidence model (authority 0.4 + freshness 0.3 + agreement 0.3); the priority-ordered rule set (immediate refusal → informational → safe autonomous → escalation).
- **System context:** 5 collaborating agents, 4 governed tools, 3 verified demo scenarios.
- **Honest framing:** hackathon prototype, explicitly not production-deployed. No user or revenue metrics exist; do not invent any.

### Assetize · tokenized fractional real estate
- **Repo:** github.com/Adwaith-R-Nair/Assetize-v0 · built solo at SupeAI
- **Scale:** 58 commits, 16 Prisma models, ~24 API routes, 7 repository interfaces + 7 implementations, 6 services, 14 logged bugs, ~3,900 lines of self-authored documentation, 34 user stories.
- **Stack:** Next.js 16, TypeScript strict, Tailwind + shadcn/ui, Framer Motion, Supabase Postgres, Prisma 7, Polygon Amoy via ethers.js, Supabase Realtime, @react-pdf/renderer, Recharts, Zod, Vercel + GitHub Actions.
- **Architecture:** strict Repository → Service → API, designed so a Phase 2 migration to real Solidity contracts touches only the repository layer. Enforced by self-audit, which caught three real boundary violations.
- **Signature decision, the hash pool:** a live investor pitch cannot depend on network latency, but faking hashes destroys the credibility. So ~50 real transactions are pre-submitted to Polygon Amoy and 20 unused hashes pooled; every demo action draws a real, explorable hash instantly. Explain the trade-off, do not just say "blockchain".
- **Money correctness:** all currency as BigInt paise, never floats. Distribution is gross − 9% management fee − 10% TDS. BUG-006 was a missing fee deduction that would have overpaid every investor; caught before it ran live.
- **Honest scope:** Phase 1 investor demo. Seeded mock data, no real KYC, no real payments, no deployed contracts. Frame as scope discipline with a documented Phase 2, not as a gap.

### Nexus · multi-provider CLI AI agent
- **Repo:** github.com/Adwaith-R-Nair/Nexus-TUI · solo
- Bun + TypeScript + Commander.js. Four providers behind one interface; three independent agentic tool-use loops written directly against the Anthropic, Gemini and OpenAI REST APIs with no agent SDK. Centralised human-in-the-loop confirmation before any file write or shell command, with a 5-iteration cap. Local-only credential and history storage.

### Zyra · local-first smart-home voice assistant
- **Repo:** github.com/Adwaith-R-Nair/Zyra-AI-Assistant (his fork). **Primary repo and commits are under Abhijith A's account.** Two-person collaboration; credit him by name.
- **Role:** ESP32-S3 firmware (ESP-IDF/C), Python AI server (FastAPI, Faster-Whisper, Ollama, Kokoro TTS), and system architecture.
- **The story:** a five-mode fallback hierarchy that degrades from full conversation down to joining the relay board's own access point, so it keeps working when the server, the home hub or the Wi-Fi fails. The `/health` endpoint deliberately reports only process liveness, so a Home Assistant outage isn't misreported as a server failure.
- ~18,000 lines over June to August 2026. Enclosure and UI unfinished; do not oversell.

### Graph edges (real shared concerns, not decoration)

```
Praman ── Honora      hash-chained append-only integrity
Praman ── AegisAI     deciding when an agent may act alone
Praman ── Nexus       agentic tool-use loop design
Praman ── Assetize    money correctness as integer minor units
Honora ── Assetize    on-chain records as independent audit trail
AegisAI ─ Nexus       human-in-the-loop before a consequential action
Nexus ── Zyra         running local models as a runtime
```

---

## 7. Identity and links

| Field | Value |
|---|---|
| Name | Adwaith R Nair |
| Location | Kochi, Kerala, India |
| Study | B.Tech Computer Science & AI, MITS Kochi, 2023–2027, CGPA 8.5 |
| Work | Blockchain & GenAI Engineer (Intern), SupeAI, July 2025 – July 2026 |
| Email | adwaith.r.nair189@gmail.com |
| GitHub | github.com/Adwaith-R-Nair |
| LinkedIn | linkedin.com/in/adwaith-r-nair |
| X | x.com/adwaith_r_nair |
| Open source | Google Summer of Code 2024, Oppia Foundation. **One line. Do not feature it.** |

---

## 8. Assets

| File | Use |
|---|---|
| `hero-crop.webp` (739×900, 85 KB) | Particle sampling source. Already cropped and background-removed. |
| `adwaith-cutout-trim.png` (2050×2321) | Full-resolution transparent cutout, for the About section and the social card. |
| `adwaith-original.jpg` | Untouched original. Keep; regenerate derivatives from this, never from a derivative. |
| `hero.html` | Working reference implementation of the hero. |

**Still needed:** a social preview card at 1200×630 with `og:image` and `twitter:card` meta tags.
Most people meet this site as a link in a feed before they ever click it.

---

## 9. Build order

Ship something real at the end of every phase. Do not build the whole site before looking at it.

| Phase | Deliverable | Done when |
|---|---|---|
| **1** | Next.js 15 App Router scaffold, design tokens, type scale, all content as typed data, every section server-rendered with **no WebGL at all** | The full portfolio reads and scrolls perfectly as a static site. Lighthouse 95+. |
| **2** | Hero particle system ported to R3F, mounted as a client-only enhancement over phase 1 | Portrait resolves, three states morph on scroll, quality tiers measured and stepping |
| **3** | Case study pages, per-project architecture diagrams, the Etherscan proof element | Each of the four flagships reads as a real case study |
| **4** | Stack section with technology-to-project highlighting, How I Build, contact | Site content complete |
| **5** | Social card, meta tags, sitemap, analytics, domain, deploy | Live |
| **6** | Mobile pass, reduced-motion pass, real-device testing | Budgets in §2 met on an actual mid-range Android |

Phase 1 must stand alone as a finished portfolio. If time runs out at any point after phase 1,
what exists is still shippable. That is the entire reason for the ordering.

---

## 10. Copy rules

- Lead every section with the most concrete sentence available, never a throat-clearing intro.
- Write like an engineer explaining work to another engineer. No "revolutionary", no
  "cutting-edge", no blockchain hype, no startup-pitch language.
- Specificity carries the weight: "money moved in 0 of 21 runs" beats "robust security".
- **No em dashes anywhere.** Use commas, colons, or restructure the sentence.
- State limitations plainly. The honest-limitations sections are a differentiator, not a
  liability: they demonstrate the same rigour the projects argue for.
- Every project page carries a clear "what I owned" line. Non-negotiable.