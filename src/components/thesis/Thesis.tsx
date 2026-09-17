import { copy } from "@/content";
import styles from "./Thesis.module.css";

export function Thesis() {
  const [a, em, b] = copy.thesis.heading;
  return (
    <section id="thesis" className={styles.thesis} aria-labelledby="thesis-title">
      <h2 id="thesis-title" className={styles.heading}>
        {a}<em>{em}</em>{b}
      </h2>
      <p className={styles.body}>{copy.thesis.body}</p>
    </section>
  );
}
