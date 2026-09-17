export type Tone = "ink" | "muted" | "accent" | "gold";

export interface DNode {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  sub?: string;
  tone?: Tone;
  dashed?: boolean;
}

export interface DEdge {
  from: string;
  to: string;
  label?: string;
  tone?: Tone;
  dashed?: boolean;
  /** Optional waypoints between the two anchors, in diagram units. */
  via?: [number, number][];
}

export interface DRegion {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

export interface DNote {
  x: number;
  y: number;
  text: string;
  anchor?: "start" | "middle" | "end";
}

export interface DiagramSpec {
  w: number;
  h: number;
  /** Accessible name and figcaption. One sentence, what the diagram shows. */
  title: string;
  regions?: DRegion[];
  nodes: DNode[];
  edges: DEdge[];
  notes?: DNote[];
}
