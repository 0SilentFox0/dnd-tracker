import styles from "./shield.module.css";

export function ShieldAura() {
  return (
    <span className={styles.root}>
      <span className={styles.shell} />
    </span>
  );
}
