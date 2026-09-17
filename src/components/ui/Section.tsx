import type { ReactNode } from "react";
import styles from "./Section.module.css";

interface Props {
  id: string;
  title: string;
  wide?: boolean;
  children: ReactNode;
}

/** Two-column section shell: a mono label column on the left, content on the right. */
export function Section({ id, title, wide = false, children }: Props) {
  const headingId = `${id}-title`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={wide ? `${styles.section} ${styles.wide}` : styles.section}
    >
      <h2 id={headingId} className={styles.title}>{title}</h2>
      <div className={styles.body}>{children}</div>
    </section>
  );
}
