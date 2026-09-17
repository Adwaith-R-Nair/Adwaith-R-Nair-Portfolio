import type { Edge, Slug } from "@/content";

export interface NodePos {
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
  dx: number;
  dy: number;
}

export interface GraphLayout {
  viewbox: { w: number; h: number };
  nodes: Record<Slug, NodePos>;
  /** Where along each edge (0 at from, 1 at to) its label sits. Default is the midpoint. */
  labelT: Partial<Record<`${Slug}-${Slug}`, number>>;
}

export const VIEWBOX = { w: 1000, h: 600 } as const;

/** Desktop. Praman is the hub at top centre. Labels sit on the side of each node that faces away from the graph. */
export const NODE_POSITIONS: Record<Slug, NodePos> = {
  praman: { x: 500, y: 90, anchor: "middle", dx: 0, dy: -30 },
  honora: { x: 160, y: 240, anchor: "end", dx: -20, dy: 5 },
  aegisai: { x: 840, y: 235, anchor: "start", dx: 20, dy: 5 },
  assetize: { x: 260, y: 470, anchor: "end", dx: -20, dy: 5 },
  nexus: { x: 740, y: 465, anchor: "start", dx: 20, dy: 5 },
  zyra: { x: 500, y: 532, anchor: "middle", dx: 0, dy: 36 },
};

export const DESKTOP: GraphLayout = {
  viewbox: VIEWBOX,
  nodes: NODE_POSITIONS,
  labelT: { "praman-assetize": 0.6, "praman-nexus": 0.6 },
};

/**
 * Phones. Same topology in a portrait box, names only: the concern labels
 * cannot fit beside the lines at this width, so the list below is the legend.
 */
export const MOBILE: GraphLayout = {
  viewbox: { w: 400, h: 600 },
  nodes: {
    praman: { x: 200, y: 60, anchor: "middle", dx: 0, dy: -20 },
    honora: { x: 100, y: 180, anchor: "end", dx: -14, dy: 5 },
    aegisai: { x: 300, y: 230, anchor: "start", dx: 14, dy: 5 },
    assetize: { x: 110, y: 370, anchor: "end", dx: -14, dy: 5 },
    nexus: { x: 290, y: 420, anchor: "start", dx: 14, dy: 5 },
    zyra: { x: 200, y: 540, anchor: "middle", dx: 0, dy: 26 },
  },
  labelT: {},
};

/** Approximate rendered width of a mono label at 11px, used to cut a gap in the edge line. */
export const labelWidth = (text: string): number => text.length * 6.7 + 20;

export function edgeGeometry(edge: Edge, layout: GraphLayout = DESKTOP) {
  const a = layout.nodes[edge.from];
  const b = layout.nodes[edge.to];
  const t = layout.labelT[`${edge.from}-${edge.to}`] ?? 0.5;
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
