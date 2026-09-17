import type { Project, Slug } from "./types";

/* Every value here comes from docs/build-spec.md section 6. Attribution lines are binding. */

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
    owned: "Everything. Solo: the provider abstraction, the three tool-use loops, the confirmation gate and the CLI.",
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
