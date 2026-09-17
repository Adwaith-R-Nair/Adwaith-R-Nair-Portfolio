import { identity } from "@/content";
import styles from "./SiteHeader.module.css";

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <a href="#hero" className={styles.name}>{identity.name}</a>
      <nav aria-label="Sections" className={styles.nav}>
        <a href="#graph">Work</a>
        <a href="#stack">Stack</a>
        <a href="#contact">Contact</a>
      </nav>
    </header>
  );
}
