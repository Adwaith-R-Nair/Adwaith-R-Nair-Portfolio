import { Eyebrow } from "@/components/ui/Eyebrow";
import { bySlug, copy, edges, projects } from "@/content";
import { NODE_POSITIONS, VIEWBOX, edgeGeometry, labelWidth } from "./layout";
import styles from "./Graph.module.css";

const href = (slug: string, flagship: boolean, repo: string) => (flagship ? `/work/${slug}` : repo);

/**
 * The project constellation as server-rendered SVG. Every node is a real link.
 * Edge labels are horizontal and sit in a gap cut into the line, like a schematic.
 * Under 720px the SVG is hidden and the same edges render as a list.
 * Phase 2 reads [data-graph-node] positions to settle the particles onto this layout.
 */
export function Graph() {
  return (
    <section id="graph" className={styles.graph} aria-labelledby="graph-title">
      <div className={styles.intro}>
        <Eyebrow>{copy.graph.eyebrow}</Eyebrow>
        <h2 id="graph-title">{copy.graph.heading}</h2>
        <p className={styles.body}>{copy.graph.body}</p>
      </div>

      <svg
        className={styles.svg}
        viewBox={`0 0 ${VIEWBOX.w} ${VIEWBOX.h}`}
        role="img"
        aria-label="Six projects connected by the concerns they share"
      >
        <g className={styles.edges}>
          {edges.map((e) => {
            const g = edgeGeometry(e);
            const w = labelWidth(e.concern);
            return (
              <g key={`${e.from}-${e.to}`} className={styles.edge}>
                <line x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} />
                <rect x={g.mx - w / 2} y={g.my - 10} width={w} height={20} />
                <text x={g.mx} y={g.my} dy={4} textAnchor="middle">{e.concern}</text>
              </g>
            );
          })}
        </g>
        <g className={styles.nodes}>
          {projects.map((p) => {
            const n = NODE_POSITIONS[p.slug];
            return (
              <a
                key={p.slug}
                href={href(p.slug, p.flagship, p.repo)}
                className={styles.node}
                data-graph-node={p.slug}
                aria-label={`${p.name}, ${p.tagline}`}
              >
                <circle cx={n.x} cy={n.y} r={p.flagship ? 7 : 5} />
                <text x={n.x + n.dx} y={n.y + n.dy} textAnchor={n.anchor} className={styles.name}>
                  {p.name}
                </text>
                <text x={n.x + n.dx} y={n.y + n.dy + 17} textAnchor={n.anchor} className={styles.note}>
                  {p.tagline}
                </text>
              </a>
            );
          })}
        </g>
      </svg>

      <ul className={styles.list}>
        {edges.map((e) => {
          const from = bySlug(e.from);
          const to = bySlug(e.to);
          return (
            <li key={`${e.from}-${e.to}`}>
              <span className={styles.pair}>
                <a href={href(from.slug, from.flagship, from.repo)}>{from.name}</a>
                {" and "}
                <a href={href(to.slug, to.flagship, to.repo)}>{to.name}</a>
              </span>
              <span className={styles.concern}>{e.concern}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
