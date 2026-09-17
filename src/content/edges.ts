import type { Edge } from "./types";

/* Real shared concerns from docs/build-spec.md section 6. Not decoration. */
export const edges: Edge[] = [
  { from: "praman", to: "honora", concern: "hash-chained append-only integrity" },
  { from: "praman", to: "aegisai", concern: "deciding when an agent may act alone" },
  { from: "praman", to: "nexus", concern: "agentic tool-use loop design" },
  { from: "praman", to: "assetize", concern: "money correctness as integer minor units" },
  { from: "honora", to: "assetize", concern: "on-chain records as independent audit trail" },
  { from: "aegisai", to: "nexus", concern: "human-in-the-loop before a consequential action" },
  { from: "nexus", to: "zyra", concern: "running local models as a runtime" },
];
