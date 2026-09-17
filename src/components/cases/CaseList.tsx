import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { StatusChip } from "@/components/ui/StatusChip";
import { copy, flagships } from "@/content";
import styles from "./CaseList.module.css";

/** Four flagship entries: status and period, name and summary and the owned line, one measured figure. */
export function CaseList() {
  return (
    <Section id="cases" title={copy.cases.title} wide>
      <ol className={styles.list}>
        {flagships().map((p) => (
          <li key={p.slug} className={styles.item} data-project={p.slug} data-uses={p.stack.join(" ")}>
            <div className={styles.meta}>
              <StatusChip status={p.status} />
              <span className={styles.period}>{p.period}</span>
            </div>
            <div className={styles.main}>
              <h3 className={styles.name}>
                <Link href={`/work/${p.slug}`}>{p.name}</Link>
                <span className={styles.tagline}>{p.tagline}</span>
              </h3>
              <p className={styles.summary}>{p.summary}</p>
              <p className={styles.owned}>
                <span className={styles.k}>What I owned</span>
                {p.owned}
              </p>
            </div>
            <dl className={styles.headline}>
              <dt>{p.headline.label}</dt>
              <dd className="tnum">{p.headline.value}</dd>
            </dl>
          </li>
        ))}
      </ol>
    </Section>
  );
}
