import { Section } from "@/components/ui/Section";
import { copy, projects } from "@/content";
import styles from "./AlsoBuilt.module.css";

/** Nexus and Zyra. Deliberately plain: this is the quiet stretch. */
export function AlsoBuilt() {
  const others = projects.filter((p) => !p.flagship);
  return (
    <Section id="also" title={copy.also.title}>
      <ul className={styles.grid}>
        {others.map((p) => (
          <li key={p.slug} className={styles.item} data-project={p.slug} data-uses={p.stack.join(" ")}>
            <h3 className={styles.name}>
              <a href={p.repo} rel="noopener">{p.name}</a>
              <span className={styles.tagline}>{p.tagline}</span>
            </h3>
            <p>{p.summary}</p>
            <p className={styles.owned}>{p.owned}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
