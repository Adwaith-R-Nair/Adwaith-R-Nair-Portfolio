import { describe, expect, it } from "vitest";
import { edges, projects } from "@/content";
import { MOBILE, NODE_POSITIONS, edgeGeometry, VIEWBOX } from "@/components/graph/layout";

describe("graph layout", () => {
  it("positions every project inside the viewbox with margin", () => {
    for (const p of projects) {
      const n = NODE_POSITIONS[p.slug];
      expect(n.x).toBeGreaterThan(80);
      expect(n.x).toBeLessThan(VIEWBOX.w - 80);
      expect(n.y).toBeGreaterThan(60);
      expect(n.y).toBeLessThan(VIEWBOX.h - 60);
    }
  });

  it("keeps nodes at least 180 units apart", () => {
    const list = projects.map((p) => NODE_POSITIONS[p.slug]);
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i]!;
        const b = list[j]!;
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(180);
      }
    }
  });

  it("edge label points lie on the segment, away from both ends", () => {
    for (const e of edges) {
      const g = edgeGeometry(e);
      expect(g.t).toBeGreaterThanOrEqual(0.3);
      expect(g.t).toBeLessThanOrEqual(0.7);
      const cross = (g.x2 - g.x1) * (g.my - g.y1) - (g.y2 - g.y1) * (g.mx - g.x1);
      expect(Math.abs(cross)).toBeLessThan(1e-6);
    }
  });
});

describe("mobile graph layout", () => {
  it("positions every project inside the portrait viewbox with margin", () => {
    for (const p of projects) {
      const n = MOBILE.nodes[p.slug];
      expect(n.x).toBeGreaterThan(40);
      expect(n.x).toBeLessThan(MOBILE.viewbox.w - 40);
      expect(n.y).toBeGreaterThan(40);
      expect(n.y).toBeLessThan(MOBILE.viewbox.h - 40);
    }
  });

  it("keeps nodes at least 150 units apart", () => {
    const list = projects.map((p) => MOBILE.nodes[p.slug]);
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i]!;
        const b = list[j]!;
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(150);
      }
    }
  });
});
