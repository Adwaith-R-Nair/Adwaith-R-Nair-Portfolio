import type { ReactNode } from "react";
import styles from "./Eyebrow.module.css";

/** Small tracked label. Used only in the hero and the graph, per the design. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className={styles.eyebrow}>{children}</span>;
}
