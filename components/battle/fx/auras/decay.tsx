import styles from "./decay.module.css";

export function DecayAura() {
  return (
    <span className={styles.root}>
      <span className={styles.ring} />
    </span>
  );
}
