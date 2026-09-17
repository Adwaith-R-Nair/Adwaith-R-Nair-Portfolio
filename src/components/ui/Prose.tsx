import type { ReactNode } from "react";
import styles from "./Prose.module.css";

/** A measured column of paragraphs, spaced by gap. */
export function Prose({ children }: { children: ReactNode }) {
  return <div className={styles.prose}>{children}</div>;
}
