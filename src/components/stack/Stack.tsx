import { Section } from "@/components/ui/Section";
import { copy, projects, stack, stackByBucket, type StackBucket } from "@/content";
import styles from "./Stack.module.css";

const BUCKETS: StackBucket[] = ["built", "worked", "exploring"];

/**
 * Generated at build time from the content, so highlighting needs no JavaScript.
 * Hover or focus a technology: projects that do not use it dim. Hover a project: the reverse.
 */
function highlightCss(): string {
  const dim = `#stack:has([data-tech]:is(:hover,:focus-visible)) [data-project],
#stack:has([data-project]:is(:hover,:focus-visible)) [data-tech] { opacity: .3; }`;
  const byTech = stack
    .filter((s) => s.projects.length > 0)
    .map(
      (s) =>
        `#stack:has([data-tech="${s.key}"]:is(:hover,:focus-visible)) [data-project][data-uses~="${s.key}"] { opacity: 1; color: var(--ink); }`,
    );
  const byProject = projects.map(
    (p) =>
      `#stack:has([data-project="${p.slug}"]:is(:hover,:focus-visible)) [data-tech][data-usedby~="${p.slug}"] { opacity: 1; color: var(--ink); }`,
  );
  return [dim, ...byTech, ...byProject].join("\n");
}

export function Stack() {
  return (
    <Section id="stack" title={copy.stack.title} wide>
      <style dangerouslySetInnerHTML={{ __html: highlightCss() }} />
      <p className={styles.hint}>{copy.stack.body}</p>

      <ul className={styles.projects} aria-label="Projects">
        {projects.map((p) => (
          <li key={p.slug}>
            <span className={styles.project} tabIndex={0} data-project={p.slug} data-uses={p.stack.join(" ")}>
              {p.name}
            </span>
          </li>
        ))}
      </ul>

      <div className={styles.buckets}>
        {BUCKETS.map((b) => (
          <div key={b} className={styles.bucket}>
            <h3 className={styles.bucketTitle}>{copy.stack.buckets[b]}</h3>
            <ul className={styles.techs}>
              {stackByBucket(b).map((s) => (
                <li key={s.key}>
                  <span
                    className={styles.tech}
                    tabIndex={s.projects.length ? 0 : -1}
                    data-tech={s.key}
                    data-usedby={s.projects.join(" ")}
                  >
                    {s.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  );
}
