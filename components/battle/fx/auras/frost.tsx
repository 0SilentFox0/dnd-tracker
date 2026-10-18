import styles from "./frost.module.css";

export function FrostAura() {
  return (
    <span className={styles.root}>
      <span className={styles.rim} />
      {[0, 1, 2].map((i) => <span key={i} className={styles.spark} style={{ left: `${15 + i * 30}%`, top: `${20 + (i % 2) * 40}%`, animationDelay: `${i * 0.9}s` }} />)}
    </span>
  );
}
