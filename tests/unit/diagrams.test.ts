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
