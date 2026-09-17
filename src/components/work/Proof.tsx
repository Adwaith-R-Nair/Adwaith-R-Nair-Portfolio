import styles from "./Proof.module.css";

interface Props {
  network: string;
  address: string;
  explorer: string;
  contract: string;
}

/** The on-chain proof, set as a first-class element. Verified means anyone can check it, not just us. */
export function Proof({ network, address, explorer, contract }: Props) {
  const head = address.slice(0, 22);
  const tail = address.slice(22);
  return (
    <a className={styles.proof} href={explorer} rel="noopener">
      <span className={styles.k}>Deployed and source-verified on {network}</span>
      <span className={`${styles.address} tnum`} aria-label={address}>
        {head}
        <wbr />
        {tail}
      </span>
      <span className={styles.foot}>
        <span>{contract}</span>
        <span>Open on Etherscan</span>
      </span>
    </a>
  );
}
