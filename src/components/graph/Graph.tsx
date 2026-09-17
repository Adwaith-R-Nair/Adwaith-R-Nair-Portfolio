import { Eyebrow } from "@/components/ui/Eyebrow";
import { bySlug, copy, edges, projects } from "@/content";
import { DESKTOP, MOBILE, edgeGeometry, labelWidth, type GraphLayout } from "./layout";
import styles from "./Graph.module.css";

const href = (slug: string) => `/work/${slug}`;

interface SvgProps {
  layout: GraphLayout;
  /** Draw concern labels on the edges and taglines under the nodes. Off on phones. */
  detail: boolean;
  className: string | undefined;
}

function GraphSvg({ layout, detail, className }: SvgProps) {
  const { w, h } = layout.viewbox;
  return (
    <svg
      className={`${styles.svg} ${className}`}
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label="Six projects connected by the concerns they share"
    >
      <g className={styles.edges}>
        {edges.map((e) => {
          const g = edgeGeometry(e, layout);
          const lw = labelWidth(e.concern);
          return (
            <g key={`${e.from}-${e.to}`} className={styles.edge}>
              <line x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} />
              {detail ? (
                <>
                  <rect x={g.mx - lw / 2} y={g.my - 10} width={lw} height={20} />
                  <text x={g.mx} y={g.my} dy={4} textAnchor="middle">{e.concern}</text>
                </>
              ) : null}
            </g>
          );
        })}
      </g>
      <g className={styles.nodes}>
        {projects.map((p) => {
          const n = layout.nodes[p.slug];
          return (
            <a
              key={p.slug}
              href={href(p.slug)}
              className={styles.node}
              data-graph-node={p.slug}
              aria-label={`${p.name}, ${p.tagline}`}
            >
              <circle cx={n.x} cy={n.y} r={p.flagship ? 7 : 5} />
              <text x={n.x + n.dx} y={n.y + n.dy} textAnchor={n.anchor} className={styles.name}>
                {p.name}
              </text>
              {detail ? (
                <text x={n.x + n.dx} y={n.y + n.dy + 17} textAnchor={n.anchor} className={styles.note}>
                  {p.tagline}
                </text>
              ) : null}
            </a>
          );
        })}
      </g>
    </svg>
  );
}

/**
 * The project constellation as server-rendered SVG. Every node links to its /work page.
 * Wide screens: landscape layout with concern labels sitting in a gap cut into each edge.
 * Phones: portrait layout with names only, and the list beneath is the legend.
 * Phase 2 reads the visible [data-graph-node] positions to settle the particles onto the layout.
 */
export function Graph() {
  return (
    <section id="graph" className={styles.graph} aria-labelledby="graph-title">
      <div className={styles.intro}>
        <Eyebrow>{copy.graph.eyebrow}</Eyebrow>
        <h2 id="graph-title">{copy.graph.heading}</h2>
        <p className={styles.body}>{copy.graph.body}</p>
      </div>

      <GraphSvg layout={DESKTOP} detail className={styles.wide} />
      <GraphSvg layout={MOBILE} detail={false} className={styles.narrow} />

      <ul className={styles.list}>
        {edges.map((e) => {
          const from = bySlug(e.from);
          const to = bySlug(e.to);
          return (
            <li key={`${e.from}-${e.to}`}>
              <span className={styles.pair}>
                <a href={href(from.slug)}>{from.name}</a>
                {" and "}
                <a href={href(to.slug)}>{to.name}</a>
              </span>
              <span className={styles.concern}>{e.concern}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
