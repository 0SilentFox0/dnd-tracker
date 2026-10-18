import styles from "./blessing.module.css";

export function BlessingAura() {
  return (
    <span className={styles.root}>
      <span className={styles.halo} />
    </span>
  );
}
