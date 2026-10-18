import styles from "./curse.module.css";

export function CurseAura() {
  return (
    <span className={styles.root}>
      <span className={styles.glow} />
    </span>
  );
}
