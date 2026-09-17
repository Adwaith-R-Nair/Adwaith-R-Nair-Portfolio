import type { ReactNode } from "react";
import Link from "next/link";
import { Diagram, diagramFor } from "@/components/diagrams";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Figures } from "@/components/ui/Figures";
import { Prose } from "@/components/ui/Prose";
import { StatusChip } from "@/components/ui/StatusChip";
import { Proof } from "./Proof";
import { projects, stackFor, type Project } from "@/content";
import styles from "./CaseStudy.module.css";

function Block({ id, title, wide, children }: { id: string; title: string; wide?: boolean; children: ReactNode }) {
  return (
    <section className={styles.block} aria-labelledby={`${id}-t`}>
      <h2 id={`${id}-t`} className={styles.blockTitle}>{title}</h2>
      <div className={wide ? `${styles.blockBody} ${styles.wideBody}` : styles.blockBody}>{children}</div>
    </section>
  );
}

function Titled({ items }: { items: { title: string; body: string }[] }) {
  return (
    <dl className={styles.titled}>
      {items.map((d) => (
        <div key={d.title}>
          <dt>{d.title}</dt>
          <dd>{d.body}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Full case study. Phase 3 adds the architecture diagram and the large on-chain proof element. */
export function CaseStudy({ project: p }: { project: Project }) {
  const list = projects;
  const i = list.findIndex((x) => x.slug === p.slug);
  const prev = list[(i + list.length - 1) % list.length]!;
  const next = list[(i + 1) % list.length]!;
  const diagram = diagramFor(p.slug);

  return (
    <article className={styles.article}>
      <header className={styles.head}>
        <div className={styles.meta}>
          <Link href="/#cases" className={styles.back}>Adwaith R Nair</Link>
          <StatusChip status={p.status} />
        </div>
        <Eyebrow>{p.context}</Eyebrow>
        <h1 className={styles.title}>
          {p.name}
          <span className={styles.tagline}>{p.tagline}</span>
        </h1>
        <p className={styles.period}>
          {p.period}. <a href={p.repo} rel="noopener">Repository</a>.
        </p>
        <p className={styles.owned}>
          <span className={styles.k}>What I owned</span>
          {p.owned}
        </p>
        {p.team ? (
          <ul className={styles.credits}>
            {p.team.credits.map((c) => (
              <li key={c.name}>
                <strong>{c.name}</strong> {c.owned}
              </li>
            ))}
          </ul>
        ) : null}
      </header>

      {p.onchain ? (
        <Proof
          network={p.onchain.network}
          address={p.onchain.address}
          explorer={p.onchain.explorer}
          contract="EvidenceRegistry.sol, Solidity 0.8.24"
        />
      ) : null}

      {diagram ? (
        <Block id="diagram" title="Architecture, drawn" wide>
          <Diagram spec={diagram} id={`diagram-${p.slug}`} />
        </Block>
      ) : null}

      <Block id="problem" title="Problem">
        <Prose><p>{p.problem}</p></Prose>
      </Block>
      <Block id="architecture" title="Architecture">
        <Prose>{p.architecture.map((t, k) => <p key={k}>{t}</p>)}</Prose>
      </Block>
      {p.decisions.length ? (
        <Block id="decisions" title="Decisions"><Titled items={p.decisions} /></Block>
      ) : null}
      <Block id="proof" title="Measured, not asserted">
        <Figures items={p.proof} />
      </Block>
      {p.bugs?.length ? (
        <Block id="bugs" title="Bugs worth telling"><Titled items={p.bugs} /></Block>
      ) : null}
      <Block id="limits" title="Honest limits">
        <ul className={styles.limits}>{p.limits.map((l) => <li key={l}>{l}</li>)}</ul>
      </Block>
      {p.scale?.length ? (
        <Block id="scale" title="Scale"><Figures items={p.scale} /></Block>
      ) : null}
      <Block id="stack" title="Stack">
        <ul className={styles.stack}>{stackFor(p.slug).map((s) => <li key={s.key}>{s.name}</li>)}</ul>
      </Block>

      <nav className={styles.neighbours} aria-label="Other case studies">
        <Link href={`/work/${prev.slug}`} className={styles.neighbour}>
          <span className={styles.nk}>Previous</span>
          <span className={styles.nn}>{prev.name}</span>
          <span className={styles.nt}>{prev.tagline}</span>
        </Link>
        <Link href="/#cases" className={styles.all}>All work</Link>
        <Link href={`/work/${next.slug}`} className={`${styles.neighbour} ${styles.right}`}>
          <span className={styles.nk}>Next</span>
          <span className={styles.nn}>{next.name}</span>
          <span className={styles.nt}>{next.tagline}</span>
        </Link>
      </nav>
    </article>
  );
}
