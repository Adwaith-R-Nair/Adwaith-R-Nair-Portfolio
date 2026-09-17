import Link from "next/link";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <main id="main" className={styles.main}>
      <div className={styles.inner}>
        <h1>Nothing here.</h1>
        <Link href="/">Back to the portfolio</Link>
      </div>
    </main>
  );
}
