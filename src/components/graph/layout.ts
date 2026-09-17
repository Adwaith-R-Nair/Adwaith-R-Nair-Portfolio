import type { Edge, Slug } from "@/content";

export const VIEWBOX = { w: 1000, h: 600 } as const;

export interface NodePos {
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
  dx: number;
  dy: number;
}

/** Praman is the hub at top centre. Labels sit on the side of each node that faces away from the graph. */
export const NODE_POSITIONS: Record<Slug, NodePos> = {
  praman: { x: 500, y: 90, anchor: "middle", dx: 0, dy: -30 },
  honora: { x: 160, y: 240, anchor: "end", dx: -20, dy: 5 },
  aegisai: { x: 840, y: 235, anchor: "start", dx: 20, dy: 5 },
  assetize: { x: 260, y: 470, anchor: "end", dx: -20, dy: 5 },
  nexus: { x: 740, y: 465, anchor: "start", dx: 20, dy: 5 },
  zyra: { x: 500, y: 532, anchor: "middle", dx: 0, dy: 36 },
};

/** Approximate rendered width of a mono label at 11px, used to cut a gap in the edge line. */
export const labelWidth = (text: string): number => text.length * 6.7 + 20;

/** Where along the edge (0 at from, 1 at to) the label sits. Default is the midpoint. */
const LABEL_T: Partial<Record<`${Slug}-${Slug}`, number>> = {
  "praman-assetize": 0.6,
  "praman-nexus": 0.6,
};

export function edgeGeometry(edge: Edge) {
  const a = NODE_POSITIONS[edge.from];
  const b = NODE_POSITIONS[edge.to];
  const t = LABEL_T[`${edge.from}-${edge.to}`] ?? 0.5;
  return {
    x1: a.x,
    y1: a.y,
    x2: b.x,
    y2: b.y,
    t,
    mx: a.x + (b.x - a.x) * t,
    my: a.y + (b.y - a.y) * t,
    angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
  };
}
