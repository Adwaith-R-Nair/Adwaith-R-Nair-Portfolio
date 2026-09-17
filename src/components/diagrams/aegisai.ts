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
