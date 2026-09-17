import type { DiagramSpec } from "./types";

export const honora: DiagramSpec = {
  w: 900,
  h: 480,
  title:
    "Honora: every request passes an Express gate for a cheap 403 and then the contract's own role check, which is the authority. Evidence hashes and custody transfers live on Ethereum Sepolia; files go to IPFS and metadata to MongoDB; AI indexing never blocks an evidence operation.",
  regions: [{ x: 540, y: 40, w: 340, h: 220, label: "Source of truth" }],
  nodes: [
    { id: "client", x: 20, y: 120, w: 200, h: 76, label: "Client", sub: "Police, Forensic, Lawyer, Judge" },
    { id: "api", x: 300, y: 110, w: 170, h: 96, label: "Express API", sub: "JWT HS256, bcrypt 12 rounds" },
    { id: "gate1", x: 300, y: 290, w: 170, h: 56, label: "Middleware RBAC", sub: "cheap 403 at the edge", tone: "accent" },
    { id: "contract", x: 580, y: 110, w: 270, h: 100, label: "EvidenceRegistry.sol", sub: "Sepolia, verified, Solidity 0.8.24", tone: "gold" },
    { id: "gate2", x: 580, y: 290, w: 270, h: 56, label: "Modifier RBAC", sub: "authoritative gate, on-chain", tone: "accent" },
    { id: "ipfs", x: 20, y: 300, w: 200, h: 56, label: "IPFS via Pinata", sub: "evidence files" },
    { id: "mongo", x: 20, y: 400, w: 200, h: 56, label: "MongoDB Atlas", sub: "off-chain metadata only", tone: "muted" },
    { id: "ai", x: 700, y: 400, w: 150, h: 56, label: "AI indexing", sub: "fire-and-forget", tone: "muted", dashed: true },
  ],
  edges: [
    { from: "client", to: "api", label: "hash" },
    { from: "api", to: "gate1" },
    { from: "gate1", to: "gate2", label: "fails closed", tone: "accent" },
    { from: "gate2", to: "contract", label: "append-only custody chain", tone: "gold" },
    { from: "api", to: "ipfs", label: "file", via: [[250, 140], [250, 328]] },
    { from: "api", to: "mongo", label: "metadata", via: [[235, 158], [235, 428]] },
    { from: "api", to: "ai", dashed: true, via: [[520, 158], [520, 372], [775, 372]] },
  ],
  notes: [
    { x: 580, y: 70, text: "duplicate hashes rejected globally" },
    { x: 580, y: 86, text: "every action emits an event" },
    { x: 20, y: 214, text: "SHA-256 of the evidence file" },
    { x: 300, y: 364, text: "one signer wallet per role" },
    { x: 20, y: 474, text: "an application-layer bypass still cannot act on-chain" },
  ],
};
