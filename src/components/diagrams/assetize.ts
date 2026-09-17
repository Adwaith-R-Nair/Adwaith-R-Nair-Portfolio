import type { DiagramSpec } from "./types";

export const assetize: DiagramSpec = {
  w: 900,
  h: 440,
  title:
    "Assetize: strict layering, API to service to repository, so that moving from the demo's pooled Polygon Amoy hashes to real contracts touches only the repository layer. Money is BigInt paise at every layer.",
  regions: [{ x: 40, y: 260, w: 520, h: 140, label: "Repository boundary" }],
  nodes: [
    { id: "ui", x: 40, y: 40, w: 200, h: 56, label: "Next.js 16 UI", sub: "investor demo, seeded data", tone: "muted" },
    { id: "api", x: 40, y: 130, w: 200, h: 56, label: "API routes", sub: "about 24, Zod at the edge" },
    { id: "svc", x: 350, y: 130, w: 200, h: 56, label: "Services", sub: "6, math in BigInt paise" },
    { id: "repo", x: 80, y: 290, w: 220, h: 76, label: "Repositories", sub: "7 interfaces, 7 implementations" },
    { id: "db", x: 340, y: 290, w: 200, h: 76, label: "Supabase Postgres", sub: "Prisma 7, 16 models" },
    { id: "pool", x: 660, y: 120, w: 200, h: 76, label: "Hash pool", sub: "50 real tx, 20 unused", tone: "accent" },
    { id: "chain", x: 660, y: 290, w: 200, h: 76, label: "Polygon Amoy", sub: "ethers.js, explorable", tone: "gold" },
  ],
  edges: [
    { from: "ui", to: "api" },
    { from: "api", to: "svc", label: "typed input" },
    { from: "svc", to: "repo", label: "interfaces only", tone: "accent", via: [[450, 216], [190, 216]] },
    { from: "repo", to: "db" },
    { from: "svc", to: "pool", label: "instant hash" },
    { from: "pool", to: "chain", label: "pre-submitted", tone: "gold" },
  ],
  notes: [
    { x: 860, y: 390, text: "explorable, not produced by the action shown", anchor: "end" },
    { x: 56, y: 390, text: "a Phase 2 move to real contracts touches only this layer" },
    { x: 40, y: 422, text: "self-audit caught 3 boundary violations before merge" },
  ],
};
