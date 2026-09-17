import type { DEdge, DNode, DiagramSpec, Tone } from "./types";
import styles from "./Diagram.module.css";

const LABEL_PX = 6.6; // approximate advance of the mono face at 11px
const toneClass: Record<Tone, string> = {
  ink: styles.ink ?? "",
  muted: styles.muted ?? "",
  accent: styles.accent ?? "",
  gold: styles.gold ?? "",
};

type Pt = [number, number];

/** Anchor on the side of `a` that faces `toward`. */
function anchor(a: DNode, toward: Pt): Pt {
  const cx = a.x + a.w / 2;
  const cy = a.y + a.h / 2;
  const dx = toward[0] - cx;
  const dy = toward[1] - cy;
  if (Math.abs(dx) * a.h > Math.abs(dy) * a.w) return [dx > 0 ? a.x + a.w : a.x, cy];
  return [cx, dy > 0 ? a.y + a.h : a.y];
}

function points(edge: DEdge, byId: Map<string, DNode>): Pt[] {
  const a = byId.get(edge.from);
  const b = byId.get(edge.to);
  if (!a || !b) return [];
  const via = edge.via ?? [];
  const bc: Pt = [b.x + b.w / 2, b.y + b.h / 2];
  const ac: Pt = [a.x + a.w / 2, a.y + a.h / 2];
  const start = anchor(a, via[0] ?? bc);
  const end = anchor(b, via[via.length - 1] ?? ac);
  return [start, ...via, end];
}

function longestSegmentMid(pts: Pt[]): Pt {
  let best: Pt = pts[0] ?? [0, 0];
  let len = -1;
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1]!;
    const q = pts[i]!;
    const l = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (l > len) {
      len = l;
      best = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    }
  }
  return best;
}

/** Renders a DiagramSpec as server-side SVG in the site's schematic grammar. */
export function Diagram({ spec, id }: { spec: DiagramSpec; id: string }) {
  const byId = new Map(spec.nodes.map((n) => [n.id, n]));
  const titleId = `${id}-title`;
  return (
    <figure className={styles.figure} data-diagram={id}>
      <div className={styles.scroll}>
        <svg
          className={styles.svg}
          viewBox={`0 0 ${spec.w} ${spec.h}`}
          role="img"
          aria-labelledby={titleId}
          style={{ minWidth: `${Math.round(spec.w * 0.72)}px` }}
        >
          <title id={titleId}>{spec.title}</title>
          <defs>
            <marker
              id={`${id}-arrow`}
              viewBox="0 0 8 8"
              refX="7"
              refY="4"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M0,0.5 L7,4 L0,7.5" className={styles.arrowHead} />
            </marker>
          </defs>

          {spec.regions?.map((r) => (
            <g key={r.label} className={styles.region}>
              <rect x={r.x} y={r.y} width={r.w} height={r.h} />
              <text x={r.x + 12} y={r.y - 8}>{r.label}</text>
            </g>
          ))}

          {spec.edges.map((e, i) => {
            const pts = points(e, byId);
            if (pts.length < 2) return null;
            const d = pts.map((p, k) => `${k ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
            const mid = longestSegmentMid(pts);
            const lw = e.label ? e.label.length * LABEL_PX + 16 : 0;
            const cls = [styles.edge, toneClass[e.tone ?? "muted"], e.dashed ? styles.dashed : ""].join(" ");
            return (
              <g key={i} className={cls}>
                <path d={d} markerEnd={`url(#${id}-arrow)`} />
                {e.label ? (
                  <>
                    <rect x={mid[0] - lw / 2} y={mid[1] - 9} width={lw} height={18} className={styles.gap} />
                    <text x={mid[0]} y={mid[1]} dy={4} textAnchor="middle">{e.label}</text>
                  </>
                ) : null}
              </g>
            );
          })}

          {spec.nodes.map((n) => {
            const cls = [styles.node, toneClass[n.tone ?? "ink"], n.dashed ? styles.dashed : ""].join(" ");
            return (
              <g key={n.id} className={cls}>
                <rect x={n.x} y={n.y} width={n.w} height={n.h} />
                <text x={n.x + n.w / 2} y={n.y + n.h / 2} dy={n.sub ? -3 : 4} textAnchor="middle" className={styles.label}>
                  {n.label}
                </text>
                {n.sub ? (
                  <text x={n.x + n.w / 2} y={n.y + n.h / 2} dy={13} textAnchor="middle" className={styles.sub}>
                    {n.sub}
                  </text>
                ) : null}
              </g>
            );
          })}

          {spec.notes?.map((t, i) => (
            <text key={i} x={t.x} y={t.y} textAnchor={t.anchor ?? "start"} className={styles.note}>
              {t.text}
            </text>
          ))}
        </svg>
      </div>
      <figcaption className={styles.caption}>{spec.title}</figcaption>
    </figure>
  );
}
