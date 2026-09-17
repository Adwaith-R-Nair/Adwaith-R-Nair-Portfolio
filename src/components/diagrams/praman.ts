import type { DiagramSpec } from "./types";

export const praman: DiagramSpec = {
  w: 900,
  h: 440,
  title:
    "Praman: a purchase intent with no price field is checked by a deterministic policy engine against a human-signed mandate, recorded in an append-only ledger, and executed in two phases. No model sits inside the authorization path.",
  regions: [{ x: 300, y: 40, w: 580, h: 380, label: "Authorization path, no LLM" }],
  nodes: [
    { id: "agent", x: 20, y: 60, w: 180, h: 56, label: "Agent", sub: "any model", tone: "muted" },
    { id: "intent", x: 20, y: 200, w: 180, h: 64, label: "Intent", sub: "SKU and quantity, no price" },
    { id: "merchant", x: 20, y: 340, w: 180, h: 56, label: "Merchant page", sub: "untrusted", tone: "muted", dashed: true },
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
    { x: 850, y: 158, text: "spend is replayed, never stored", anchor: "end" },
    { x: 850, y: 412, text: "a DB write and a payment call cannot be atomic", anchor: "end" },
  ],
};
