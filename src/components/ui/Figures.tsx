import type { Labelled } from "@/content";
import styles from "./Figures.module.css";

/** A ledger of label and value rows, values in tabular numerals. */
export function Figures({ items, title }: { items: Labelled[]; title?: string }) {
  return (
    <div className={styles.wrap}>
      {title ? <span className={styles.title}>{title}</span> : null}
      <dl className={styles.list}>
        {items.map((it) => (
          <div key={it.label} className={styles.row}>
            <dt className={styles.label}>{it.label}</dt>
            <dd className={`${styles.value} tnum`}>{it.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
