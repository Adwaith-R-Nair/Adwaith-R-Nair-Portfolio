import type { Status } from "@/content";
import styles from "./StatusChip.module.css";

const LABEL: Record<Status, string> = {
  live: "Live",
  testnet: "Testnet",
  prototype: "Prototype",
  demo: "Demo",
};

export function StatusChip({ status }: { status: Status }) {
  return (
    <span className={styles.chip} data-status={status}>
      <span className={styles.dot} aria-hidden="true" />
      {LABEL[status]}
    </span>
  );
}
