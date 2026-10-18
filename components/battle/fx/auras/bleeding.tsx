import styles from "./bleeding.module.css";

export function BleedingAura() {
  return (
    <span className={styles.root}>
      {[0, 1].map((i) => <span key={i} className={styles.drop} style={{ left: `${34 + i * 28}%`, animationDelay: `${i * 0.7}s` }} />)}
    </span>
  );
}
